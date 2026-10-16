import type { Block } from '@/types/block';
import type { DocumentChapter, Page } from '@/types/page';

export interface ReadingChapter extends DocumentChapter {
  blocks: Block[];
}

export function parseChapters(value: unknown): DocumentChapter[] {
  try {
    const parsed: unknown = typeof value === 'string' ? JSON.parse(value) : value;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is DocumentChapter =>
      !!item && typeof item === 'object' && typeof item.id === 'string' &&
      typeof item.title === 'string' && Array.isArray(item.blockIds) &&
      item.blockIds.every((id: unknown) => typeof id === 'string')
    );
  } catch {
    return [];
  }
}

export function validateChapters(value: unknown): string | null {
  if (!Array.isArray(value) || value.length > 200) return '章节格式无效，最多支持 200 个章节';
  const chapterIds = new Set<string>();
  const blockIds = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== 'object' || typeof item.id !== 'string' ||
      !item.id || item.id.length > 200 || typeof item.title !== 'string' ||
      !item.title.trim() || item.title.length > 200 || !Array.isArray(item.blockIds) ||
      item.blockIds.length > 10000) return '请为每个章节填写标题和有效的内容列表';
    if (chapterIds.has(item.id)) return '章节编号不能重复';
    chapterIds.add(item.id);
    for (const id of item.blockIds) {
      if (typeof id !== 'string' || !id || id.length > 300 || blockIds.has(id)) {
        return '同一内容只能归属一个章节';
      }
      blockIds.add(id);
    }
  }
  return null;
}

export function blockTitle(block: Block): string {
  const text = block.title.trim() || (['text', 'quote', 'toggle', 'todo'].includes(block.type)
    ? block.content.split('\n').find((line) => line.trim()) || '' : '');
  return text.replace(/^\s*#{1,6}\s*/, '').slice(0, 100) || ({
    text: '正文', todo: '待办', table: '表格', code: '代码', media: '附件',
    quote: '引用', toggle: '折叠内容', divider: '分隔线',
    whiteboard: '白板', mindmap: '思维导图', math: '公式',
  }[block.type]);
}

/** Reading order follows explicit outline/order and hierarchy, never canvas coordinates. */
export function buildReadingChapters(
  page: Pick<Page, 'chapters'>,
  blocks: Block[],
  groups: Array<{ id: string; name: string }> = [],
): ReadingChapter[] {
  const ordered = [...blocks].sort((a, b) => a.order - b.order || a.createdAt - b.createdAt || a.id.localeCompare(b.id));
  const byId = new Map(ordered.map((block) => [block.id, block]));
  const assigned = new Set<string>();
  const materialize = (chapter: DocumentChapter): ReadingChapter => {
    const chapterBlocks: Block[] = [];
    for (const id of chapter.blockIds) {
      const block = byId.get(id);
      if (block && !assigned.has(id)) {
        assigned.add(id);
        chapterBlocks.push(block);
      }
    }
    return { ...chapter, blockIds: chapterBlocks.map((b) => b.id), blocks: chapterBlocks };
  };

  if (page.chapters !== undefined) {
    const result = page.chapters.map(materialize);
    const remaining = ordered.filter((block) => !assigned.has(block.id));
    if (remaining.length) {
      let id = 'unassigned';
      while (result.some((chapter) => chapter.id === id)) id += '-new';
      result.push({ id, title: '未分章内容', blockIds: remaining.map((b) => b.id), blocks: remaining });
    }
    return result;
  }

  const children = new Map<string, Block[]>();
  for (const block of ordered) {
    if (block.parentId && byId.has(block.parentId)) {
      const list = children.get(block.parentId) || [];
      list.push(block);
      children.set(block.parentId, list);
    }
  }
  const roots = ordered.filter((block) => !block.parentId || !byId.has(block.parentId));
  const result: ReadingChapter[] = [];
  const groupChapters = new Map<string, ReadingChapter>();
  let current: ReadingChapter | undefined;
  const append = (block: Block, chapter: ReadingChapter) => {
    if (assigned.has(block.id)) return;
    assigned.add(block.id);
    chapter.blocks.push(block);
    chapter.blockIds.push(block.id);
    for (const child of children.get(block.id) || []) append(child, chapter);
  };
  for (const block of roots) {
    if (block.groupId) {
      let group = groupChapters.get(block.groupId);
      if (!group) {
        group = { id: `group-${block.groupId}`, title: groups.find((g) => g.id === block.groupId)?.name || blockTitle(block), blockIds: [], blocks: [] };
        groupChapters.set(block.groupId, group);
        result.push(group);
      }
      append(block, group);
      continue;
    }
    const startsChapter = block.type === 'text' && (!!block.title.trim() || /^\s*#{1,2}\s+/.test(block.content));
    if (!current || startsChapter) {
      current = { id: `section-${block.id}`, title: blockTitle(block), blockIds: [], blocks: [] };
      result.push(current);
    }
    append(block, current);
  }
  // Retain malformed/orphaned content rather than silently dropping it.
  const remaining = ordered.filter((block) => !assigned.has(block.id));
  if (remaining.length) result.push({ id: 'other-content', title: '其他内容', blockIds: remaining.map((b) => b.id), blocks: remaining });
  return result;
}
