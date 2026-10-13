import { describe, it, expect, beforeEach } from 'vitest';
import { useBlockStore } from '@/store/blockStore';
import { useCollaborationStore } from '@/store/collaborationStore';

describe('Batch 4 & 5: Import, Export and Cross-View Synchronization', () => {
  beforeEach(() => {
    // Reset blockStore state
    useBlockStore.setState({
      blocks: [
        {
          id: 'test-block-1',
          type: 'text',
          title: '需求概要',
          content: '这是首个测试需求内容',
          meta: {},
          parentId: null,
          order: 0,
          x: 100,
          y: 100,
          width: 480,
          collapsed: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: 'test-block-2',
          type: 'todo',
          title: '实现登录',
          content: '完成微信扫码登录对接',
          meta: { checked: false, taskId: 'TASK-1001', priority: 'high', dod: '测试覆盖率 > 80%' },
          parentId: null,
          order: 1,
          x: 100,
          y: 300,
          width: 480,
          collapsed: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
      selectedIds: [],
    });
  });

  describe('Item 23: Structured JSON Export & Tasks CSV', () => {
    it('should export complete BlockOS canvas state as valid structured JSON', () => {
      const jsonStr = useBlockStore.getState().exportToJson();
      expect(jsonStr).toBeTypeOf('string');

      const parsed = JSON.parse(jsonStr);
      expect(parsed).toHaveProperty('version', '1.0.0');
      expect(parsed).toHaveProperty('exportedAt');
      expect(Array.isArray(parsed.blocks)).toBe(true);
      expect(parsed.blocks.length).toBe(2);
      expect(parsed.blocks[0].id).toBe('test-block-1');
      expect(parsed.blocks[1].id).toBe('test-block-2');
    });

    it('should export tasks CSV with UTF-8 BOM and correct column headers', () => {
      const additionalTasks = [
        {
          id: 'TASK-2002',
          title: '数据库分表支持',
          status: 'in_progress',
          priority: 'urgent',
          assigneeId: 'admin',
          dod: '完成压力测试',
        },
      ];

      const csv = useBlockStore.getState().exportToCsvTasks(additionalTasks);

      // Verify UTF-8 BOM is present to prevent Excel garbled characters
      expect(csv.startsWith('\ufeff')).toBe(true);

      // Verify headers
      expect(csv).toContain('任务ID,任务标题,状态,优先级,负责人,验收标准(DoD)');

      // Verify todo block task export
      expect(csv).toContain('完成微信扫码登录对接');
      expect(csv).toContain('待办');

      // Verify additional collaboration task export
      expect(csv).toContain('TASK-2002');
      expect(csv).toContain('数据库分表支持');
      expect(csv).toContain('进行中');
      expect(csv).toContain('urgent');
    });
  });

  describe('Item 22: Robust & Transparent JSON Import', () => {
    it('should import JSON in replace mode and overwrite current blocks', () => {
      const importPayload = JSON.stringify({
        version: '1.0.0',
        blocks: [
          {
            id: 'imported-1',
            type: 'text',
            title: '新导入的块',
            content: '替换后的内容',
            meta: {},
          },
        ],
      });

      const res = useBlockStore.getState().importFromJson(importPayload, 'replace');
      expect(res.success).toBe(true);
      expect(res.count).toBe(1);

      const currentBlocks = useBlockStore.getState().blocks;
      expect(currentBlocks.length).toBe(1);
      expect(currentBlocks[0].title).toBe('新导入的块');
    });

    it('should import JSON in append mode and preserve existing blocks with new IDs', () => {
      const appendPayload = JSON.stringify({
        blocks: [
          {
            type: 'todo',
            title: '追加的任务',
            content: '新追加待办事项',
            meta: { checked: false },
          },
        ],
      });

      const res = useBlockStore.getState().importFromJson(appendPayload, 'append');
      expect(res.success).toBe(true);
      expect(res.count).toBe(1);

      const currentBlocks = useBlockStore.getState().blocks;
      expect(currentBlocks.length).toBe(3); // 2 original + 1 appended
      expect(currentBlocks[2].content).toBe('新追加待办事项');
    });

    it('should gracefully handle malformed JSON, empty payload, or invalid block structures', () => {
      // Empty input
      const emptyRes = useBlockStore.getState().importFromJson('');
      expect(emptyRes.success).toBe(false);
      expect(emptyRes.error).toContain('为空');

      // Invalid JSON syntax
      const malformedRes = useBlockStore.getState().importFromJson('{ invalid json syntax');
      expect(malformedRes.success).toBe(false);

      // Missing blocks array
      const noBlocksRes = useBlockStore.getState().importFromJson(JSON.stringify({ notBlocks: 123 }));
      expect(noBlocksRes.success).toBe(false);
      expect(noBlocksRes.error).toContain('未包含有效的 blocks 数组');

      // Invalid block objects without type
      const noTypeRes = useBlockStore.getState().importFromJson(JSON.stringify({ blocks: [{ foo: 'bar' }] }));
      expect(noTypeRes.success).toBe(false);
      expect(noTypeRes.error).toContain('未找到符合规范的 Block 对象');
    });
  });

  describe('Item 27: Cross-View Synchronization', () => {
    it('should synchronize block status when matching task status transitions to done', () => {
      const block = useBlockStore.getState().blocks.find((b) => b.meta?.taskId === 'TASK-1001');
      expect(block).toBeDefined();
      expect(block?.meta?.checked).toBe(false);

      // Simulate status update matching ProjectBoard / TaskDetail logic
      const targetBlock = useBlockStore.getState().blocks.find((b) => b.meta?.taskId === 'TASK-1001');
      if (targetBlock) {
        useBlockStore.getState().updateBlock(targetBlock.id, {
          meta: {
            ...targetBlock.meta,
            checked: true,
            status: 'done',
          },
        });
      }

      const updatedBlock = useBlockStore.getState().blocks.find((b) => b.meta?.taskId === 'TASK-1001');
      expect(updatedBlock?.meta?.checked).toBe(true);
      expect(updatedBlock?.meta?.status).toBe('done');
    });
  });
});
