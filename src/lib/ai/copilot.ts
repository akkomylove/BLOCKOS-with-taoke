import { postJsonCompletion, parseJsonContent, safeText, safeList, AIServiceError } from './client';
import type { CopilotRequest, CopilotResponse } from './types';

export async function runCopilot(payload: CopilotRequest): Promise<CopilotResponse> {
  const rawContent = await postJsonCompletion([
    { role: 'system', content: buildSystemPrompt(payload.action) },
    { role: 'user', content: buildUserPrompt(payload) },
  ], 0.3);

  try {
    const parsed = parseJsonContent(rawContent);
    return normalizeCopilotResponse(parsed, payload.action);
  } catch (error) {
    throw new AIServiceError('Copilot 响应解析失败', 'copilot_parse_error', 502, { error: String(error) });
  }
}

function normalizeCopilotResponse(payload: Record<string, unknown>, action: string): CopilotResponse {
  switch (action) {
    case 'plan_next':
      return {
        action: 'plan_next',
        understandingSummary: safeText(payload.understanding_summary, '已理解当前文档内容。'),
        nextQuestion: safeText(payload.next_question),
        readyToFinalize: payload.ready_to_finalize === true,
        draftMarkdown: safeText(payload.draft_markdown, ''),
      };
    case 'plan_finalize':
      return {
        action: 'plan_finalize',
        summary: safeText(payload.summary, '计划已生成。'),
        finalMarkdown: safeText(payload.final_markdown, ''),
      };
    case 'critique_generate':
      return {
        action: 'critique_generate',
        overview: safeText(payload.overview, '审阅已完成。'),
        issues: normalizeIssues(payload.issues),
        reviewMarkdown: safeText(payload.review_markdown, ''),
      };
    default:
      throw new AIServiceError(`未知的 Copilot action: ${action}`, 'invalid_copilot_action', 400);
  }
}

function normalizeIssues(value: unknown): Array<{ id: string; title: string; severity: 'high' | 'medium' | 'low'; reason: string; suggestion: string; targetHeading?: string; matchKeywords: string[] }> {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map((item, index) => ({
      id: safeText(item.id, `issue-${index + 1}`),
      title: safeText(item.title, '未命名问题'),
      severity: safeSeverity(item.severity),
      reason: safeText(item.reason, '需要进一步审查。'),
      suggestion: safeText(item.suggestion, '建议优化相关内容。'),
      targetHeading: safeText(item.target_heading) || undefined,
      matchKeywords: safeList(item.match_keywords),
    }));
}

function safeSeverity(value: unknown): 'high' | 'medium' | 'low' {
  const text = safeText(value, 'medium').toLowerCase();
  return text === 'high' || text === 'low' ? text : 'medium';
}

function buildSystemPrompt(action: string): string {
  const base = '你是 BlockOS AI Copilot。只输出合法 JSON，不要 markdown，不要解释。';
  switch (action) {
    case 'plan_next': return base + ' 返回 understanding_summary、next_question、ready_to_finalize、draft_markdown。';
    case 'plan_finalize': return base + ' 返回 summary、final_markdown。';
    case 'critique_generate': return base + ' 返回 overview、issues、review_markdown。';
    default: return base;
  }
}

function buildUserPrompt(payload: CopilotRequest): string {
  const parts = [`Action: ${payload.action}`, `Document: ${payload.documentName}`, `Workflow: ${JSON.stringify(payload.workflow)}`, `Content:\n${payload.documentContent}`];
  if (payload.userMessage) parts.push(`User Message: ${payload.userMessage}`);
  if (payload.qaHistory?.length) parts.push('QA History:\n' + payload.qaHistory.map((qa) => `Q: ${qa.question}\nA: ${qa.answer}`).join('\n---\n'));
  return parts.join('\n\n');
}
