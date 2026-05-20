export class AIServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = 'AIServiceError';
  }
}

function getSettings() {
  return {
    apiKey: process.env.DASHSCOPE_API_KEY || process.env.SILICONFLOW_API_KEY,
    model: process.env.AI_MODEL || 'qwen3.6-plus',
    endpoint:
      process.env.DASHSCOPE_BASE_URL ||
      process.env.SILICONFLOW_BASE_URL ||
      'https://dashscope.aliyuncs.com/compatible-mode/v1',
  };
}

export function ensureConfigured(): void {
  if (!getSettings().apiKey) {
    throw new AIServiceError('后端未配置 DASHSCOPE_API_KEY', 'missing_api_key', 503);
  }
}

export async function postJsonCompletion(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  temperature: number = 0.1
): Promise<string> {
  const settings = getSettings();
  ensureConfigured();

  try {
    const response = await fetch(`${settings.endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${settings.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: settings.model,
        messages,
        response_format: { type: 'json_object' },
        temperature,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new AIServiceError(`AI 请求失败: ${detail}`, 'ai_http_error', 502, {
        status: response.status,
        response: detail,
      });
    }

    const data = await response.json();
    return extractMessageContent(data);
  } catch (error) {
    if (error instanceof AIServiceError) throw error;
    throw new AIServiceError('无法连接到 AI 接口', 'ai_connection_error', 502, {
      reason: error instanceof Error ? error.message : String(error),
    });
  }
}

function extractMessageContent(response: unknown): string {
  const data = response as Record<string, unknown>;
  const choices = data.choices as Array<Record<string, unknown>>;
  if (!choices || !choices.length) {
    throw new AIServiceError('AI 响应格式异常：缺少 choices', 'ai_invalid_format', 502);
  }
  const message = choices[0].message as Record<string, unknown>;
  if (!message) {
    throw new AIServiceError('AI 响应格式异常：缺少 message', 'ai_invalid_format', 502);
  }
  let content = message.content;

  if (Array.isArray(content)) {
    const textParts = content
      .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
      .filter((item) => item.type === 'text')
      .map((item) => String(item.text || ''));
    content = textParts.join('');
  }

  if (typeof content !== 'string' || !content.trim()) {
    throw new AIServiceError('AI 响应内容为空', 'ai_empty_content', 502);
  }
  return content;
}

export function parseJsonContent(content: string): Record<string, unknown> {
  try {
    return JSON.parse(content);
  } catch {
    return JSON.parse(extractJsonText(content));
  }
}

export function extractJsonText(text: string): string {
  let candidate = text.trim();
  candidate = candidate.replace(/^```(?:json)?\s*/i, '');
  candidate = candidate.replace(/\s*```$/, '');
  if (candidate.startsWith('{') && candidate.endsWith('}')) return candidate;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) return candidate.slice(start, end + 1);
  throw new Error('No JSON object found');
}

export async function repairJson(
  brokenContent: string,
  workflow: string[],
  schemaHint: string
): Promise<Record<string, unknown>> {
  const repaired = await postJsonCompletion(
    [
      { role: 'system', content: `你是 JSON 修复助手。只输出合法 JSON。工作流顺序：${JSON.stringify(workflow)}。结构：${schemaHint}` },
      { role: 'user', content: `修复为合法 JSON：\n${brokenContent}` },
    ],
    0
  );
  return parseJsonContent(repaired);
}

export function safeText(value: unknown, fallback: string = ''): string {
  if (value === null || value === undefined) return fallback;
  if (Array.isArray(value)) {
    const cleaned = value.map(String).map((s) => s.trim()).filter(Boolean);
    return cleaned.length > 0 ? cleaned.join('，') : fallback;
  }
  const text = String(value).trim();
  return text || fallback;
}

export function safeList(value: unknown, fallback: string[] = []): string[] {
  if (value === null || value === undefined) return [...fallback];
  if (Array.isArray(value)) {
    const cleaned = value.map(String).map((s) => s.trim()).filter(Boolean);
    return cleaned.length > 0 ? cleaned : [...fallback];
  }
  const text = String(value).trim();
  return text ? [text] : [...fallback];
}

export function safeInt(value: unknown, fallback: number): number {
  const parsed = parseInt(String(value), 10);
  return Number.isNaN(parsed) || parsed <= 0 ? fallback : parsed;
}

export function safePriority(value: unknown): 'high' | 'medium' | 'low' {
  const text = safeText(value, 'medium').toLowerCase();
  return text === 'high' || text === 'low' ? text : 'medium';
}

export function mapItemsByRole(value: unknown): Map<string, Record<string, unknown>> {
  const mapped = new Map<string, Record<string, unknown>>();
  if (!Array.isArray(value)) return mapped;
  for (const item of value) {
    if (typeof item !== 'object' || item === null) continue;
    const role = safeText((item as Record<string, unknown>).role);
    if (role) mapped.set(role.trim().toLowerCase(), item as Record<string, unknown>);
  }
  return mapped;
}

export function getDictValue(value: unknown, key: string): unknown {
  if (typeof value !== 'object' || value === null) return undefined;
  return (value as Record<string, unknown>)[key];
}
