import { describe, it, expect } from 'vitest';
import { BLOCK_CATEGORIES, ALL_BLOCK_ITEMS, BLOCK_ITEM_MAP } from '@/lib/block-categories';
import { createEmptyBlock, estimateBlockHeight } from '@/store/blockStore';
import { blockTitle } from '@/lib/document-outline';
import { canEditBlock } from '@/components/mobile/MobileBlockContent';
import type { BlockType } from '@/types/block';

describe('Lark-style Block Categories & New Multi-dimensional Components', () => {
  const EXPECTED_TYPES: BlockType[] = [
    'text',
    'todo',
    'quote',
    'toggle',
    'divider',
    'code',
    'table',
    'bookmark',
    'math',
    'mindmap',
    'mermaid',
    'whiteboard',
    'media',
    'callout',
    'countdown',
  ];

  it('BLOCK_CATEGORIES covers all 4 functional groups with non-empty items', () => {
    expect(BLOCK_CATEGORIES.length).toBe(4);
    const categoryIds = BLOCK_CATEGORIES.map((c) => c.id);
    expect(categoryIds).toEqual(['basic', 'data', 'visual', 'widget']);

    for (const cat of BLOCK_CATEGORIES) {
      expect(cat.title).toBeTruthy();
      expect(cat.description).toBeTruthy();
      expect(cat.items.length).toBeGreaterThan(0);
    }
  });

  it('ALL_BLOCK_ITEMS covers all 15 BlockTypes with 0 duplicates', () => {
    const typesInCategories = ALL_BLOCK_ITEMS.map((item) => item.type);
    expect(typesInCategories.length).toBe(EXPECTED_TYPES.length);

    // Verify all expected types exist
    for (const expected of EXPECTED_TYPES) {
      expect(typesInCategories).toContain(expected);
      expect(BLOCK_ITEM_MAP[expected]).toBeDefined();
      expect(BLOCK_ITEM_MAP[expected].label).toBeTruthy();
      expect(BLOCK_ITEM_MAP[expected].description).toBeTruthy();
    }

    // Verify no duplicates
    const uniqueTypes = new Set(typesInCategories);
    expect(uniqueTypes.size).toBe(typesInCategories.length);
  });

  describe('createEmptyBlock initialization for new Lark blocks', () => {
    it('creates callout block with info theme and default icon', () => {
      const block = createEmptyBlock('callout');
      expect(block.type).toBe('callout');
      expect(block.meta.calloutTheme).toBe('info');
      expect(block.meta.calloutIcon).toBe('💡');
      expect(block.content).toContain('重要');
    });

    it('creates countdown block with sprint milestone defaults', () => {
      const block = createEmptyBlock('countdown');
      expect(block.type).toBe('countdown');
      expect(block.title).toBe('冲刺发布倒计时');
      expect(block.meta.targetDate).toBeDefined();
      expect(block.meta.targetTime).toBe('18:00');
    });

    it('creates bookmark block with rich link card meta', () => {
      const block = createEmptyBlock('bookmark');
      expect(block.type).toBe('bookmark');
      expect(block.meta.bookmarkUrl).toContain('github.com');
      expect(block.meta.bookmarkTitle).toBe('GitHub 项目仓库');
      expect(block.meta.bookmarkDesc).toBeTruthy();
    });

    it('creates mermaid block with default architecture flow diagram code', () => {
      const block = createEmptyBlock('mermaid');
      expect(block.type).toBe('mermaid');
      expect(block.content).toContain('graph TD');
      expect(block.content).toContain('BlockOS');
    });
  });

  describe('estimateBlockHeight', () => {
    it('estimates appropriate layout heights for new Lark blocks to prevent overlaps', () => {
      const calloutBlock = createEmptyBlock('callout');
      const countdownBlock = createEmptyBlock('countdown');
      const bookmarkBlock = createEmptyBlock('bookmark');
      const mermaidBlock = createEmptyBlock('mermaid');

      expect(estimateBlockHeight(calloutBlock)).toBe(130);
      expect(estimateBlockHeight(countdownBlock)).toBe(180);
      expect(estimateBlockHeight(bookmarkBlock)).toBe(140);
      expect(estimateBlockHeight(mermaidBlock)).toBe(320);
    });
  });

  describe('Mobile Adaptation & Document Outline Compatibility', () => {
    it('blockTitle provides readable titles for new block types', () => {
      const calloutBlock = createEmptyBlock('callout');
      const countdownBlock = createEmptyBlock('countdown');
      const bookmarkBlock = createEmptyBlock('bookmark');
      const mermaidBlock = createEmptyBlock('mermaid');

      expect(blockTitle(calloutBlock)).toBe('高亮提示');
      expect(blockTitle(countdownBlock)).toBe('冲刺发布倒计时');
      expect(blockTitle(bookmarkBlock)).toBe('外部文档与链接卡片');
      expect(blockTitle(mermaidBlock)).toBe('系统架构流程图');
    });

    it('canEditBlock supports mobile editing for callout, bookmark, and mermaid', () => {
      const calloutBlock = createEmptyBlock('callout');
      const bookmarkBlock = createEmptyBlock('bookmark');
      const mermaidBlock = createEmptyBlock('mermaid');

      expect(canEditBlock(calloutBlock)).toBe(true);
      expect(canEditBlock(bookmarkBlock)).toBe(true);
      expect(canEditBlock(mermaidBlock)).toBe(true);
    });
  });
});
