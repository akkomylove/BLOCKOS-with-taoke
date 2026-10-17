/**
 * BlockOS AI 安全合规与对抗性防御过滤器 (AI Safety & Compliance Defense Filter)
 *
 * 遵循 OWASP Top 10 for LLM Applications 标准，落地生产级两道防御漏斗：
 * 1. 漏斗一 (Pre-flight 入参前置防御，0 成本本地正则扫描)：
 *    - Prompt Injection (越狱指令、规则抹除、DAN 模式、系统角色覆写)
 *    - Credential Exfiltration (环境变量盗取、API Key/数据库连接串探测、System Prompt 窥探)
 *    - Payload Oversized & ReDoS (超长输入拒绝服务防御，毫秒级熔断)
 *
 * 2. 漏斗二 (Post-flight 出参后置防御与数据脱敏)：
 *    - 敏感凭据脱敏清洗 (对 sk-*, JWT, Bearer token, postgresql:// 连接串执行自动脱敏)
 *    - Stored XSS 净化 (对 AI 生成的 HTML/Markdown 剥离脚本标签与伪协议)
 *    - 角色/成员越权防护 (严格校验 AI 推荐分配人是否处于项目成员白名单)
 */

import { sanitizeHtml } from '@/lib/sanitize';
import { AIServiceError } from './client';

export class AISafetyViolationError extends AIServiceError {
  constructor(
    message: string,
    public threatCategory: 'prompt_injection' | 'credential_leak_attempt' | 'payload_oversized' | 'role_privilege_violation',
    public matchedSnippet?: string
  ) {
    super(message, 'ai_safety_violation', 400, { threatCategory, matchedSnippet });
    this.name = 'AISafetyViolationError';
  }
}

export interface SafetyCheckInput {
  userMessage?: string;
  contexts?: (string | null | undefined)[];
  personaNote?: string;
  documentSummary?: string;
  documentContent?: string;
}

export interface SafetyCheckOptions {
  maxUserMessageLength?: number;
  maxTotalPayloadLength?: number;
}

export const MAX_USER_MESSAGE_LENGTH = 16384; // 16KB 单条提示词上限
export const MAX_TOTAL_PAYLOAD_LENGTH = 65536; // 64KB 总体上下文上限

// 1. 提示词注入与越狱对抗模式 (Prompt Injection & Jailbreak Patterns)
const PROMPT_INJECTION_PATTERNS: Array<{ regex: RegExp; reason: string }> = [
  {
    regex: /(ignore|disregard|forget)\s+(all\s+)?(previous|prior|above|system)\s+(instructions|prompts|rules|commands)/i,
    reason: '检测到提示词覆写/指令抹除攻击 (Instruction Override)',
  },
  {
    regex: /(system\s+override|override\s+system|bypass\s+all\s+safety|developer\s+mode\s+enabled|you\s+are\s+now\s+DAN\b)/i,
    reason: '检测到越狱模式切换 (Jailbreak / DAN / Developer Mode)',
  },
  {
    regex: /(忽略|无视|跳过|抹除)[\u4e00-\u9fa5\s]{0,10}?(指令|规则|设定|提示词)/i,
    reason: '检测到中文提示词注入与规则抹除尝试',
  },
  {
    regex: /(作为无限制\s*(AI|智能体|助手)|进入开发者模式|无视道德伦理|解锁一切限制)/,
    reason: '检测到中文越狱与权限绕过指令',
  },
  {
    regex: /(print|show|reveal|display|output)\s+(the\s+)?(exact\s+)?(system\s+prompt|initial\s+prompt|hidden\s+instructions)/i,
    reason: '检测到系统提示词窃取攻击 (System Prompt Exfiltration)',
  },
  {
    regex: /(打印|输出|展示|返回|复述)(你的)?(系统|内部|最初)?(提示词|设定|指令|System\s*Prompt)/i,
    reason: '检测到中文系统提示词窥探攻击',
  },
];

// 2. 凭据探测与环境变量外发攻击模式 (Credential Exfiltration Patterns)
const CREDENTIAL_EXFILTRATION_PATTERNS: Array<{ regex: RegExp; reason: string }> = [
  {
    regex: /(ZHIPU_API_KEY|DASHSCOPE_API_KEY|SILICONFLOW_API_KEY|POSTGRES_URL|DATABASE_URL|JWT_SECRET|AUTH_SECRET|NEXTAUTH_SECRET|process\.env)/i,
    reason: '检测到敏感系统环境变量或密钥探查特征 (Environment Variable Probing)',
  },
  {
    regex: /(偷取|获取|泄露|读取|打印|输出|返回).*(API[_-]?KEY|环境变量|数据库密码|连接字符串|连接串)/i,
    reason: '检测到凭据窃取语义意图',
  },
];

// 3. 出参脱敏清洗模式 (Post-flight Scrubbing Patterns)
const SECRET_SCRUB_PATTERNS: Array<{ regex: RegExp; replacement: string }> = [
  // API Keys (e.g. sk-..., zhipu api keys)
  { regex: /\b(sk-[a-zA-Z0-9_\-]{20,})\b/g, replacement: '[REDACTED_API_KEY]' },
  // Database connection URLs (postgres://user:pass@host/db or postgresql://)
  { regex: /\b(postgres(?:ql)?:\/\/[^\s"'<>]+)\b/gi, replacement: '[REDACTED_DATABASE_URL]' },
  // Bearer tokens
  { regex: /\b(Bearer\s+)[a-zA-Z0-9_\-\.]{25,}\b/gi, replacement: '$1[REDACTED_TOKEN]' },
  // JWT tokens (3 parts separated by dots)
  { regex: /\b(eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,})\b/g, replacement: '[REDACTED_JWT_TOKEN]' },
  // Private keys
  { regex: /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----[\s\S]*?-----END\s+(?:RSA\s+)?PRIVATE\s+KEY-----/g, replacement: '[REDACTED_PRIVATE_KEY]' },
];

/**
 * 校验输入安全性，若检测到威胁则抛出 AISafetyViolationError
 */
export function validateInputSafety(
  input: SafetyCheckInput,
  options?: SafetyCheckOptions
): void {
  const maxUserMsg = options?.maxUserMessageLength || MAX_USER_MESSAGE_LENGTH;
  const maxTotal = options?.maxTotalPayloadLength || MAX_TOTAL_PAYLOAD_LENGTH;

  // 1. 长度与边界防御 (DoS / ReDoS Prevention)
  if (input.userMessage && input.userMessage.length > maxUserMsg) {
    throw new AISafetyViolationError(
      `用户输入文本长度 (${input.userMessage.length}) 超出安全上限 (${maxUserMsg})，已触发 DoS 防御拦截`,
      'payload_oversized',
      input.userMessage.slice(0, 100) + '...'
    );
  }

  let totalLength = (input.userMessage?.length || 0)
    + (input.personaNote?.length || 0)
    + (input.documentSummary?.length || 0)
    + (input.documentContent?.length || 0);

  if (input.contexts?.length) {
    for (const ctx of input.contexts) {
      if (ctx) totalLength += ctx.length;
    }
  }

  if (totalLength > maxTotal) {
    throw new AISafetyViolationError(
      `请求总 Payload 尺寸 (${totalLength}) 超出安全上限 (${maxTotal})，已触发 DoS 熔断`,
      'payload_oversized'
    );
  }

  // 2. 扫描所有输入文本片段
  const allTexts: string[] = [
    input.userMessage,
    input.personaNote,
    ...(input.contexts || []),
  ].filter((t): t is string => typeof t === 'string' && Boolean(t.trim()));

  for (const text of allTexts) {
    // 检查提示词注入
    for (const pattern of PROMPT_INJECTION_PATTERNS) {
      const match = pattern.regex.exec(text);
      if (match) {
        throw new AISafetyViolationError(
          `输入包含不安全的指令特征: ${pattern.reason}`,
          'prompt_injection',
          match[0]
        );
      }
    }

    // 检查凭据与环境变量窃取探测
    for (const pattern of CREDENTIAL_EXFILTRATION_PATTERNS) {
      const match = pattern.regex.exec(text);
      if (match) {
        throw new AISafetyViolationError(
          `输入尝试探查系统凭据或环境变量: ${pattern.reason}`,
          'credential_leak_attempt',
          match[0]
        );
      }
    }
  }
}

/**
 * 非抛出式的安全检查方法，返回检查结果对象
 */
export function checkInputSafety(
  input: SafetyCheckInput,
  options?: SafetyCheckOptions
): { safe: boolean; category?: string; reason?: string; snippet?: string } {
  try {
    validateInputSafety(input, options);
    return { safe: true };
  } catch (err) {
    if (err instanceof AISafetyViolationError) {
      return {
        safe: false,
        category: err.threatCategory,
        reason: err.message,
        snippet: err.matchedSnippet,
      };
    }
    return {
      safe: false,
      category: 'unknown',
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * 出参敏感信息脱敏过滤器 (Secret Scrubber)
 * 扫描并抹除输出中包含的 API Key、数据库连接串、JWT/Bearer 凭据
 */
export function scrubSecrets(content: string): string {
  if (!content || typeof content !== 'string') return '';
  let scrubbed = content;
  for (const pattern of SECRET_SCRUB_PATTERNS) {
    scrubbed = scrubbed.replace(pattern.regex, pattern.replacement);
  }
  return scrubbed;
}

/**
 * AI 输出全量安全净化 (Post-flight Sanitizer)
 * 1. 抹除泄露凭据
 * 2. 剥离潜在 XSS / 脚本执行标签与伪协议
 */
export function sanitizeAiOutput(rawOutput: string): string {
  if (!rawOutput || typeof rawOutput !== 'string') return '';
  // 1. 凭据清洗
  const deSecreted = scrubSecrets(rawOutput);
  // 2. HTML / XSS 清洗
  return sanitizeHtml(deSecreted);
}

/**
 * 校验并限制成员分派范围 (Member Scope Verification)
 * 防止 AI 幻觉或恶意注入非项目成员 / 特权账号 (如 super_admin / root)
 */
export function validateAssigneeScope(
  candidateAssignee: string | null | undefined,
  validMemberIds: string[],
  fallbackId: string | null = null
): string | null {
  if (!candidateAssignee || typeof candidateAssignee !== 'string') {
    return fallbackId;
  }
  const trimmed = candidateAssignee.trim();
  const exists = validMemberIds.some(
    (id) => id.toLowerCase() === trimmed.toLowerCase()
  );
  return exists ? trimmed : fallbackId;
}
