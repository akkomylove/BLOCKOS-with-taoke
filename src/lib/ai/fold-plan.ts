import { postJsonCompletion, parseJsonContent, safeText, safeList } from './client';
import type { FoldPlanRequest, FoldPlanResponse, FoldPlanSection } from './types';

function normalizeSection(
  rawItem: Record<string, unknown>,
  section: { index: number; heading: string; content: string },
  payload: FoldPlanRequest
): FoldPlanSection {
  const content = `${section.heading}\n${section.content}`.toLowerCase();
  const priorityTopics = payload.priorityTopics.map((t) => t.toLowerCase());
  const reviewKeywords = payload.reviewKeywords.map((t) => t.toLowerCase());
  const focusPoints = payload.focusPoints.map((t) => t.toLowerCase());
  const watchPoints = payload.watchPoints.map((t) => t.toLowerCase());
  const foldableTopics = payload.foldableTopics.map((t) => t.toLowerCase());
  const allRelevant = [...priorityTopics, ...reviewKeywords, ...focusPoints, ...watchPoints].filter(Boolean);
  const matchedTopics = allRelevant.filter((topic) => content.includes(topic)).slice(0, 6);
  const matchedFoldables = foldableTopics.filter((topic) => topic && content.includes(topic));

  let rawRelevance = safeText(rawItem.relevance, '');
  let relevance: 'high' | 'medium' | 'low';
  if (!['high', 'medium', 'low'].includes(rawRelevance)) {
    if (matchedTopics.length) relevance = matchedTopics.length >= 2 ? 'high' : 'medium';
    else if (matchedFoldables.length) relevance = 'low';
    else if (section.index === 0) relevance = 'medium';
    else relevance = 'low';
  } else {
    relevance = rawRelevance as 'high' | 'medium' | 'low';
  }

  let shouldFold = typeof rawItem.should_fold === 'boolean' ? rawItem.should_fold : (relevance === 'low' && !matchedTopics.length);
  let highlight = typeof rawItem.highlight === 'boolean' ? rawItem.highlight : (relevance === 'high');

  const fallbackReason = matchedTopics.length
    ? `该段直接涉及 ${payload.currentRole} 需要优先查看的主题。`
    : matchedFoldables.length
      ? `该段更偏向其他岗位关注内容，当前角色可先折叠后续再看。`
      : `该段与 ${payload.currentRole} 的直接关联度较弱。`;

  let previewQuote = safeText(rawItem.preview_quote, '');
  if (!previewQuote) {
    previewQuote = section.content.trim().replace(/\n/g, ' ').slice(0, 120);
  }

  return {
    index: section.index,
    heading: section.heading,
    relevance,
    shouldFold,
    highlight,
    reason: safeText(rawItem.reason, fallbackReason),
    matchedTopics: safeList(rawItem.matched_topics, matchedTopics),
    previewQuote,
  };
}

function buildFallbackPayload(payload: FoldPlanRequest): FoldPlanResponse {
  return {
    role: payload.currentRole,
    note: '只影响当前角色视图中的折叠与高亮，不会修改、删减或覆盖原文。',
    sections: payload.sections.map((section) => normalizeSection({}, section, payload)),
  };
}

export async function foldPlan(payload: FoldPlanRequest): Promise<FoldPlanResponse> {
  try {
    const systemPrompt = (
      '你是 FDoc 的角色视角折叠规划助手。'
      + '只输出合法 JSON，不要 markdown，不要解释。'
      + `当前目标角色是：${payload.currentRole}。`
      + '你只决定哪些段落对该角色应高亮、保留或折叠，不能修改原文。'
    );

    const sections = payload.sections.slice(0, 48).map((s) => ({
      index: s.index,
      heading: s.heading,
      content: s.content.slice(0, 700),
    }));

    const userPrompt = (
      '返回固定 JSON，字段只有 role、note、sections。\n'
      + 'sections 中每项只包含 index、heading、relevance、should_fold、highlight、reason、matched_topics、preview_quote。\n'
      + '要求：\n'
      + '1. sections 数量和 index 必须与输入完全一致。\n'
      + '2. relevance 只能是 high、medium、low。\n'
      + '3. 对当前角色高度相关的段落 should_fold=false 且 highlight=true。\n'
      + '4. 与当前角色弱相关但仍可参考的段落 should_fold=false。\n'
      + '5. 明显无关的段落 should_fold=true。\n'
      + '6. note 必须强调：只影响视图折叠，不改变原文。\n'
      + '7. reason 要具体，说明该段为什么和当前角色相关或无关。\n\n'
      + `document_name: ${payload.documentName}\n`
      + `workflow: ${JSON.stringify(payload.workflow)}\n`
      + `current_role: ${payload.currentRole}\n`
      + `role_task: ${payload.roleTask}\n`
      + `role_summary: ${payload.roleSummary}\n`
      + `focus_points: ${JSON.stringify(payload.focusPoints)}\n`
      + `priority_topics: ${JSON.stringify(payload.priorityTopics)}\n`
      + `foldable_topics: ${JSON.stringify(payload.foldableTopics)}\n`
      + `review_keywords: ${JSON.stringify(payload.reviewKeywords)}\n`
      + `watch_points: ${JSON.stringify(payload.watchPoints)}\n`
      + `stage_goal: ${payload.stageGoal}\n`
      + `sections: ${JSON.stringify(sections)}`
    );

    const rawContent = await postJsonCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      0.1
    );

    let parsed: Record<string, unknown>;
    try {
      parsed = parseJsonContent(rawContent);
    } catch {
      return buildFallbackPayload(payload);
    }

    const rawSections = parsed.sections;
    const sectionMap: Record<number, Record<string, unknown>> = {};
    if (Array.isArray(rawSections)) {
      for (const item of rawSections) {
        if (!item || typeof item !== 'object') continue;
        const idx = Number((item as Record<string, unknown>).index);
        if (!Number.isNaN(idx)) sectionMap[idx] = item as Record<string, unknown>;
      }
    }

    const normalizedSections = payload.sections.map((section) => {
      const rawItem = sectionMap[section.index] || {};
      return normalizeSection(rawItem, section, payload);
    });

    return {
      role: payload.currentRole,
      note: safeText(parsed.note, '只影响当前角色视图中的折叠与高亮，不会修改、删减或覆盖原文。'),
      sections: normalizedSections,
    };
  } catch {
    return buildFallbackPayload(payload);
  }
}
