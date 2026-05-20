import { postJsonCompletion, parseJsonContent, safeText, safeList, AIServiceError } from './client';
import type { CodeLabRequest, CodeLabResponse } from './types';

export async function runCodeLab(payload: CodeLabRequest): Promise<CodeLabResponse> {
  const rawContent = await postJsonCompletion([
    { role: 'system', content: `你是 BlockOS 代码实验室助手。当前角色：${payload.currentRole}。语言：${payload.language}。只输出合法 JSON。返回 explanation、completion_suggestions、run_notes、pseudo_result、runtime_mode、browser_preview_hint。` },
    { role: 'user', content: `Document: ${payload.documentName}\nWorkflow: ${JSON.stringify(payload.workflow)}\nCurrent Role: ${payload.currentRole}\nLanguage: ${payload.language}\nCode:\n\`\`\`${payload.language}\n${payload.code}\n\`\`\`${payload.selectionText ? `\nSelected Code:\n\`\`\`${payload.language}\n${payload.selectionText}\n\`\`\`` : ''}` },
  ], 0.1);

  try {
    const parsed = parseJsonContent(rawContent);
    return {
      language: payload.language,
      currentRole: payload.currentRole,
      runtimeMode: parsed.runtime_mode === 'browser' ? 'browser' : 'pseudo',
      explanation: safeText(parsed.explanation, '代码已接收，暂无详细解释。'),
      completionSuggestions: safeList(parsed.completion_suggestions),
      runNotes: safeList(parsed.run_notes),
      pseudoResult: safeText(parsed.pseudo_result, '伪执行结果暂无。'),
      browserPreviewHint: safeText(parsed.browser_preview_hint) || undefined,
    };
  } catch (error) {
    throw new AIServiceError('代码实验室响应解析失败', 'code_lab_parse_error', 502, { error: String(error) });
  }
}
