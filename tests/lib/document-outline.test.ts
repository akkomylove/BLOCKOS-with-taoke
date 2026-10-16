import { describe, expect, it } from 'vitest';
import { buildReadingChapters, parseChapters, validateChapters } from '@/lib/document-outline';
import type { Block } from '@/types/block';

function block(id: string, order: number, overrides: Partial<Block> = {}): Block {
  return { id, order, title: '', type: 'text', content: '', meta: {}, parentId: null, x: 900 - order * 100, y: -order * 200, width: 480, collapsed: false, createdAt: order, updatedAt: order, ...overrides };
}

describe('Mobile document reading outline', () => {
  it('groups several blocks under a text heading, independent of canvas position', () => {
    const blocks = [block('table', 2, { type: 'table' }), block('heading', 0, { title: '退款规则' }), block('todo', 1, { type: 'todo' }), block('qa', 3, { title: '验收标准' })];
    const original = JSON.stringify(blocks);
    const chapters = buildReadingChapters({}, blocks);
    expect(chapters.map((chapter) => chapter.blockIds)).toEqual([['heading', 'todo', 'table'], ['qa']]);
    expect(JSON.stringify(blocks)).toBe(original);
  });

  it('respects an explicit multi-block chapter and preserves its independent reading order', () => {
    const chapters = buildReadingChapters({ chapters: [{ id: 'refund', title: '退款', blockIds: ['b', 'a'] }] }, [block('a', 0), block('b', 1)]);
    expect(chapters[0].blocks.map((item) => item.id)).toEqual(['b', 'a']);
    expect(chapters[0].blocks[0].x).toBe(800);
  });

  it('does not lose newly created or unassigned blocks or duplicate chapter IDs', () => {
    const chapters = buildReadingChapters({ chapters: [{ id: 'unassigned', title: '已有章节', blockIds: ['missing', 'a'] }] }, [block('a', 0), block('new', 1)]);
    expect(chapters.flatMap((chapter) => chapter.blockIds)).toEqual(['a', 'new']);
    expect(new Set(chapters.map((chapter) => chapter.id)).size).toBe(2);
  });

  it('keeps a parent and its children together and uses existing named groups', () => {
    const chapters = buildReadingChapters({}, [block('parent', 0, { title: '业务', groupId: 'g' }), block('child', 1, { parentId: 'parent' }), block('extra', 2, { type: 'todo', groupId: 'g' })], [{ id: 'g', name: '退款流程' }]);
    expect(chapters).toHaveLength(1);
    expect(chapters[0].title).toBe('退款流程');
    expect(chapters[0].blockIds).toEqual(['parent', 'child', 'extra']);
  });

  it('retains content even when the legacy parent hierarchy contains a cycle', () => {
    const chapters = buildReadingChapters({}, [block('a', 0, { parentId: 'b' }), block('b', 1, { parentId: 'a' })]);
    expect(chapters.flatMap((chapter) => chapter.blockIds)).toEqual(['a', 'b']);
  });

  it('rejects duplicate membership and accepts intentionally empty chapters', () => {
    expect(validateChapters([{ id: 'a', title: '空章节', blockIds: [] }])).toBeNull();
    expect(validateChapters([{ id: 'a', title: '一', blockIds: ['x'] }, { id: 'b', title: '二', blockIds: ['x'] }])).toBeTruthy();
    expect(parseChapters('damaged json')).toEqual([]);
  });
});
