/**
 * 客户端与服务端通用的 HTML / 内容安全清洗工具库
 * 防御 XSS 注入与恶意脚本执行
 */

const FULL_BLOCK_TAGS_REGEX = /<\s*(script|style|iframe|embed|object|base)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi;
const DANGEROUS_TAGS_REGEX = /<\s*\/?\s*(script|iframe|embed|object|form|input|button|link|meta|style|base|frame|frameset)[^>]*>/gi;
const EVENT_HANDLER_REGEX = /\s+on[a-z0-9_-]+\s*=\s*(['"][^'"]*['"]|[^\s>]+)/gi;
const JAVASCRIPT_URL_REGEX = /(href|src|action)\s*=\s*['"]\s*(javascript|vbscript|data\s*:\s*text\/html):[^'"]*['"]/gi;

/**
 * 纯文本转义，将敏感 HTML 字符替换为安全实体
 */
export function escapeHtml(str: string): string {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function sanitizeText(str: string): string {
  return escapeHtml(str);
}

/**
 * 安全清洗 HTML 字符串，保留基础展示样式标签，剥离任何脚本和危险属性
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';

  let sanitized = html;

  // 1. 彻底移除完整脚本/样式块及其包含的执行代码
  sanitized = sanitized.replace(FULL_BLOCK_TAGS_REGEX, '');

  // 2. 剥离所有残留的自闭合或异常危险执行标签
  sanitized = sanitized.replace(DANGEROUS_TAGS_REGEX, '');

  // 3. 剥离所有 inline 事件监听器（如 onerror=, onclick=）
  sanitized = sanitized.replace(EVENT_HANDLER_REGEX, '');

  // 4. 剥离伪协议 URL（如 href="javascript:..."）
  sanitized = sanitized.replace(JAVASCRIPT_URL_REGEX, '');

  return sanitized;
}

/**
 * 安全文件名过滤，防止路径穿越
 */
export function sanitizeFileName(name: string): string {
  if (!name || typeof name !== 'string') return 'unnamed';
  return name.replace(/[/\\?%*:|"<>]/g, '_').trim() || 'unnamed';
}
