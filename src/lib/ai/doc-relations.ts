import { postJsonCompletion, parseJsonContent, safeText, safeList } from './client';
import type { DocRelationsRequest, DocRelationsResponse, DocRelationItem } from './types';

function sameDoc(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

function pickRelationType(documentName: string, candidateName: string, summary: string): { type: string; confidence: 'high' | 'medium' | 'low' } {
  const text = `${documentName} ${candidateName} ${summary}`.toLowerCase();
  if (['需求', 'prd', 'requirement'].some((k) => text.includes(k))) return { type: '需求参考', confidence: 'high' };
  if (['技术', '方案', 'design', '架构'].some((k) => text.includes(k))) return { type: '实现依赖', confidence: 'high' };
  if (['数据', '指标', '分析', 'review'].some((k) => text.includes(k))) return { type: '数据关联', confidence: 'medium' };
  if (['复盘', '总结', '结论', 'result'].some((k) => text.includes(k))) return { type: '复盘引用', confidence: 'medium' };
  return { type: '上下游关联', confidence: 'medium' };
}

function fallbackRelations(payload: DocRelationsRequest): DocRelationItem[] {
  const relations: DocRelationItem[] = [];
  for (const candidate of payload.candidates.slice(0, 5)) {
    if (sameDoc(candidate.documentName, payload.documentName)) continue;
    const { type, confidence } = pickRelationType(payload.documentName, candidate.documentName, candidate.summary);
    relations.push({
      documentId: candidate.documentId,
      documentName: candidate.documentName,
      relationType: type,
      relationDescription: `${candidate.documentName} 与当前文档存在${type}。`,
      relationReason: candidate.summary ? candidate.summary.slice(0, 180) : '候选文档与当前文档在主题上存在关联。',
      confidence,
    });
  }
  if (!relations.length && payload.candidates.length) {
    const candidate = payload.candidates[0];
    relations.push({
      documentId: candidate.documentId,
      documentName: candidate.documentName,
      relationType: '参考关联',
      relationDescription: '作为当前文档的参考资料',
      relationReason: '候选文档可补充背景与上下文。',
      confidence: 'medium',
    });
  }
  return relations;
}

function safeRelations(value: unknown, payload: DocRelationsRequest): DocRelationItem[] {
  if (!Array.isArray(value)) return [];
  const validIds = new Set(payload.candidates.map((c) => c.documentId));
  const validNames = new Set(payload.candidates.map((c) => c.documentName));
  const relations: DocRelationItem[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const dict = item as Record<string, unknown>;
    const documentId = safeText(dict.document_id);
    const documentName = safeText(dict.document_name);
    if (validIds.size && documentId && !validIds.has(documentId)) continue;
    if (validNames.size && documentName && !validNames.has(documentName)) continue;
    let confidence = safeText(dict.confidence, 'medium').toLowerCase();
    if (!['high', 'medium', 'low'].includes(confidence)) confidence = 'medium';
    relations.push({
      documentId: documentId || '',
      documentName: documentName || '未命名文档',
      relationType: safeText(dict.relation_type, '参考关联'),
      relationDescription: safeText(dict.relation_description, '可在前端编辑补充。'),
      relationReason: safeText(dict.relation_reason, '来自 AI 推荐。'),
      confidence: confidence as 'high' | 'medium' | 'low',
      readingGuide: dict.reading_guide ? {
        priority: Number(dict.reading_guide.priority) || 2,
        readingOrder: Number(dict.reading_guide.reading_order) || 2,
        keyPoints: safeList(dict.reading_guide.key_points),
        jumpToSection: safeText(dict.reading_guide.jump_to_section),
      } : undefined,
    });
  }
  return relations;
}

function safeReadingGuide(value: unknown): DocRelationsResponse['readingGuide'] | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const dict = value as Record<string, unknown>;
  const documents = safeList(dict.documents).map((doc: unknown) => {
    if (!doc || typeof doc !== 'object') return null;
    const d = doc as Record<string, unknown>;
    return {
      documentId: safeText(d.document_id),
      documentName: safeText(d.document_name),
      priority: Number(d.priority) || 2,
      readingOrder: Number(d.reading_order) || 2,
      keyPoints: safeList(d.key_points),
      jumpToSection: safeText(d.jump_to_section),
      reason: safeText(d.reason),
    };
  }).filter(Boolean);
  if (!documents.length) return undefined;
  return {
    title: safeText(dict.title, `${safeText(dict.current_role) || '当前角色'}阅读指南`),
    description: safeText(dict.description, '按优先级排序的文档阅读顺序'),
    documents: documents as DocRelationsResponse['readingGuide'] extends undefined ? never : NonNullable<DocRelationsResponse['readingGuide']>['documents'],
  };
}

export async function docRelations(payload: DocRelationsRequest): Promise<DocRelationsResponse> {
  try {
    const systemPrompt = (
      '你是 FDoc 的关联文档推荐助手。只输出合法 JSON，不要 markdown，不要解释。\n'
      + '根据当前角色分析候选文档，生成阅读指南。\n'
      + '阅读指南应包含：文档优先级、阅读顺序、关键段落。'
    );

    const candidates = payload.candidates.slice(0, 8).map((c) => ({
      document_id: c.documentId,
      document_name: c.documentName,
      summary: c.summary.slice(0, 300),
      source_type: c.sourceType,
    }));

    const userPrompt = (
      '返回固定 JSON，字段包含：overview、relations、editable_note、reading_guide。\n\n'
      + '1. overview：用 1-2 句话说明该角色的阅读策略。\n'
      + '2. relations：每个候选文档一条记录，包含 document_id、document_name、relation_type、relation_description、relation_reason、confidence。\n'
      + '3. editable_note：说明关联关系可编辑，不改变原文。\n'
      + '4. reading_guide：阅读指南，包含 title、description、documents 数组。\n'
      + '   - documents 每项包含：document_id、document_name、priority（1最高）、reading_order、key_points（2-3个关键点）、jump_to_section（推荐跳转的章节）、reason（为什么推荐）。\n\n'
      + `当前文档：${payload.documentName}\n`
      + `当前角色：${payload.currentRole}\n`
      + `工作流：${JSON.stringify(payload.workflow)}\n`
      + `文档摘要：${payload.documentSummary.slice(0, 500)}\n\n`
      + `候选文档：${JSON.stringify(candidates)}`
    );

    const rawContent = await postJsonCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      0.2
    );

    let parsed: Record<string, unknown>;
    try {
      parsed = parseJsonContent(rawContent);
    } catch {
      return {
        overview: `${payload.currentRole} 视角下，优先阅读与核心职责相关的文档。`,
        relations: fallbackRelations(payload).slice(0, 8),
        editableNote: '可在前端编辑后确认保存，关联关系只影响视图层。',
      };
    }

    let relations = safeRelations(parsed.relations, payload);
    if (!relations.length) relations = fallbackRelations(payload);

    const readingGuide = safeReadingGuide(parsed.reading_guide);

    return {
      overview: safeText(parsed.overview, `${payload.currentRole} 视角下，优先阅读与核心职责相关的文档。`),
      relations: relations.slice(0, 8),
      editableNote: safeText(parsed.editable_note, '可在前端编辑后确认保存，关联关系只影响视图层。'),
      readingGuide,
    };
  } catch {
    return {
      overview: `${payload.currentRole} 视角下，优先阅读与核心职责相关的文档。`,
      relations: fallbackRelations(payload).slice(0, 8),
      editableNote: '可在前端编辑后确认保存，关联关系只影响视图层。',
    };
  }
}
