import { postJsonCompletion, parseJsonContent, safeText } from './client';
import type { ChatRequest, ChatResponse } from './types';

const CHAT_ROLE_PRESETS: Record<string, { title: string; style: string }> = {
  '专业产品经理': {
    title: '专业产品经理',
    style: '站在需求、边界、优先级和验收标准角度回答，输出要能直接支持决策。',
  },
  '专业投资人': {
    title: '专业投资人',
    style: '站在商业价值、风险、增长和回报角度回答，输出要简洁而判断明确。',
  },
  '专业工程师': {
    title: '专业工程师',
    style: '站在实现方案、系统约束、接口与稳定性角度回答，输出要可落地。',
  },
  '专业数据分析师': {
    title: '专业数据分析师',
    style: '站在指标、归因、实验设计和数据可信度角度回答，输出要有结构。',
  },
};

export async function chat(payload: ChatRequest): Promise<ChatResponse> {
  const preset = CHAT_ROLE_PRESETS[payload.rolePreset] || { title: payload.rolePreset, style: '请以清晰、专业、直接的方式回答。' };

  const systemPrompt = (
    '你是 FDoc 的侧边栏 AI 对话助手。'
    + '只输出合法 JSON，不要 markdown，不要解释。'
    + ' 你的回答必须结合用户选中的文本和当前文档上下文。'
    + ` 当前角色设定：${payload.rolePreset}。${preset.style}`
    + ' 如果用户提供了多个上下文片段，要优先引用选中文本内容。'
    + ' 对话内容要简洁、可执行、面向文档协作。'
  );

  const userPrompt = (
    '返回固定 JSON，字段只有 assistant_message 和 role_preset。\n'
    + '要求：\n'
    + '1. assistant_message 直接给出对用户问题的专业回复。\n'
    + '2. 回答时优先使用已选中的文本片段。\n'
    + '3. 如果信息不足，明确指出缺口并给出下一步建议。\n'
    + '4. 不要输出 markdown 代码块。\n'
    + '5. role_preset 原样返回。\n\n'
    + `文档名称：${payload.documentName}\n`
    + `当前角色：${payload.currentRole}\n`
    + `工作流：${JSON.stringify(payload.workflow)}\n`
    + `文档摘要：${payload.documentSummary || ''}\n`
    + `角色设定：${payload.rolePreset}\n`
    + `角色提示：${payload.personaNote || ''}\n`
    + `选中文本：${JSON.stringify(payload.selectedContexts)}\n`
    + `历史对话：${JSON.stringify(payload.messages.slice(-6))}\n`
    + `用户本次提问：${payload.userMessage}`
  );

  const rawContent = await postJsonCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    0.4
  );

  let parsed: Record<string, unknown>;
  try {
    parsed = parseJsonContent(rawContent);
  } catch {
    parsed = { assistant_message: rawContent, role_preset: payload.rolePreset };
  }

  const assistantMessage = typeof parsed.assistant_message === 'string'
    ? parsed.assistant_message
    : (typeof parsed.assistantMessage === 'string' ? parsed.assistantMessage : rawContent);

  return {
    assistantMessage: assistantMessage || '我已经看过你选中的内容，建议你再补充一下目标、限制条件或希望我重点分析的方面。',
    rolePreset: typeof parsed.role_preset === 'string' ? parsed.role_preset : payload.rolePreset,
    selectedContextCount: payload.selectedContexts.length,
  };
}
