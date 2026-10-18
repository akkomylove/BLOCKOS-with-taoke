import { postJsonCompletion, parseJsonContent } from './client';
import type { ChatRequest, ChatResponse } from './types';
import { validateInputSafety, sanitizeAiOutput } from './safety-filter';
import { PERSONAL_CHAT_PRESET } from '@/config/ai-modes';
import { BLOCKOS_CORE_IDENTITY } from '@/config/blockos-knowledge';
import { assistantIdentityPrompt, type AssistantIdentity } from './assistant-identity';

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

export async function chat(payload: ChatRequest, identity?: AssistantIdentity): Promise<ChatResponse> {
  // 1. 安全合规前置扫描 (Pre-flight Security Inspection)
  validateInputSafety({
    userMessage: payload.userMessage,
    contexts: payload.selectedContexts?.map((c) => c.text),
    personaNote: payload.personaNote,
    documentSummary: payload.documentSummary,
  });

  const preset = CHAT_ROLE_PRESETS[payload.rolePreset] || { title: payload.rolePreset, style: '请以清晰、专业、直接的方式回答。' };
  const personal = payload.rolePreset === PERSONAL_CHAT_PRESET;

  const systemPrompt = (
    '你是 BlockOS 的侧边栏 AI 对话助手。'
    + BLOCKOS_CORE_IDENTITY
    + (identity ? assistantIdentityPrompt(identity) : '')
    + ' 只输出合法 JSON，不要 markdown，不要解释。'
    + (personal
      ? ' 你是通用个人助手，帮助用户日常问答、学习、记录和整理思路。根据问题需要参考文档，不要默认套用职业角色、团队审阅或项目工作流。'
      : identity ? '结合问题与当前文档，从自动分析的专业视角回答。' : ` 你的回答必须结合用户选中的文本和当前文档上下文。当前角色设定：${payload.rolePreset}。${preset.style}`)
    + ' 如果用户提供了多个上下文片段，要优先引用选中文本内容。'
    + (personal ? ' 回答要清晰自然，贴合用户的问题。' : ' 对话内容要简洁、可执行、面向文档协作。')
  );

  const userPrompt = (
    '返回固定 JSON，字段只有 assistant_message 和 role_preset。\n'
    + '要求：\n'
    + '1. assistant_message 直接给出对用户问题的专业回复。\n'
    + '2. 回答时优先使用已选中的文本片段。\n'
    + '3. 如果信息不足，明确指出缺口并给出下一步建议。\n'
    + '4. 不要输出 markdown 代码块。\n'
    + (identity?.mode === 'enterprise' ? '5. role_preset 返回根据已保存岗位分析出的简短专业视角；资料不足返回“通用视角”。\n\n' : '5. role_preset 原样返回。\n\n')
    + `文档名称：${payload.documentName}\n`
    + (personal ? '' : `当前角色：${payload.currentRole}\n工作流：${JSON.stringify(payload.workflow)}\n`)
    + `文档摘要：${payload.documentSummary || ''}\n`
    + `角色设定：${payload.rolePreset}\n`
    + (personal ? '' : `角色提示：${payload.personaNote || ''}\n`)
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

  // 2. 出参全量安全清洗 (脱敏敏感信息与剥离 XSS 危险代码)
  const safeAssistantMessage = sanitizeAiOutput(assistantMessage);

  return {
    assistantMessage: safeAssistantMessage || '我已经看过你选中的内容，建议你再补充一下目标、限制条件或希望我重点分析的方面。',
    rolePreset: personal ? PERSONAL_CHAT_PRESET : (typeof parsed.role_preset === 'string' ? parsed.role_preset : payload.rolePreset),
    selectedContextCount: payload.selectedContexts.length,
  };
}
