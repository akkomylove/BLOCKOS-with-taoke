import { describe, it, expect, beforeEach } from 'vitest';
import { useBlockStore } from '@/store/blockStore';
import {
  BLOCKOS_CORE_IDENTITY,
  BLOCKOS_BLOCK_TYPES_INFO,
  BLOCKOS_CANVAS_CAPABILITIES,
} from '@/config/blockos-knowledge';

describe('BlockOS AI Assistant Knowledge & Canvas Operating Capabilities', () => {
  beforeEach(() => {
    useBlockStore.getState().reset();
  });

  describe('BlockOS Knowledge Integrity & Anti-Blockchain Boundary', () => {
    it('strictly forbids blockchain, smart contracts, crypto or DApps in core identity', () => {
      expect(BLOCKOS_CORE_IDENTITY).toContain('绝非区块链');
      expect(BLOCKOS_CORE_IDENTITY).toContain('(agent + md) × ai + html');
      expect(BLOCKOS_CORE_IDENTITY).toContain('严禁在任何回答中提及区块链');
    });

    it('covers all 11 atomic block types with rich capabilities', () => {
      expect(BLOCKOS_BLOCK_TYPES_INFO).toContain('文本卡片 (text)');
      expect(BLOCKOS_BLOCK_TYPES_INFO).toContain('敏捷待办 (todo)');
      expect(BLOCKOS_BLOCK_TYPES_INFO).toContain('代码沙箱 (code)');
      expect(BLOCKOS_BLOCK_TYPES_INFO).toContain('多维数据表格 (table)');
      expect(BLOCKOS_BLOCK_TYPES_INFO).toContain('系统架构流程图 (mermaid)');
      expect(BLOCKOS_BLOCK_TYPES_INFO).toContain('高亮警示卡片 (callout)');
      expect(BLOCKOS_BLOCK_TYPES_INFO).toContain('冲刺倒计时 (countdown)');
      expect(BLOCKOS_BLOCK_TYPES_INFO).toContain('外部书签 (bookmark)');
      expect(BLOCKOS_BLOCK_TYPES_INFO).toContain('自由绘图板 (whiteboard)');
      expect(BLOCKOS_BLOCK_TYPES_INFO).toContain('思维导图 (mindmap)');
      expect(BLOCKOS_BLOCK_TYPES_INFO).toContain('媒体卡片 (media)');
    });

    it('defines rich canvas operations (batch hierarchy, links, parent-child, highlights)', () => {
      expect(BLOCKOS_CANVAS_CAPABILITIES).toContain('batchCreateHierarchy');
      expect(BLOCKOS_CANVAS_CAPABILITIES).toContain('setParent / outdentBlock');
      expect(BLOCKOS_CANVAS_CAPABILITIES).toContain('createLink');
      expect(BLOCKOS_CANVAS_CAPABILITIES).toContain('highlightBlocks');
      expect(BLOCKOS_CANVAS_CAPABILITIES).toContain('代码沙箱');
    });
  });

  describe('Real Canvas Operations Execution by AI Agent', () => {
    it('creates an executable Code Sandbox block with typescript/javascript runtime', () => {
      const store = useBlockStore.getState();
      const codeId = store.addBlock('code');
      store.updateBlock(codeId, {
        title: '快速排序算法',
        content: `function quickSort(arr) {\n  if (arr.length <= 1) return arr;\n  const pivot = arr[arr.length - 1];\n  const left = [];\n  const right = [];\n  for (let i = 0; i < arr.length - 1; i++) {\n    if (arr[i] < pivot) left.push(arr[i]);\n    else right.push(arr[i]);\n  }\n  return [...quickSort(left), pivot, ...quickSort(right)];\n}`,
        meta: { language: 'typescript' },
      });

      const block = useBlockStore.getState().blocks.find((b) => b.id === codeId);
      expect(block).toBeDefined();
      expect(block?.type).toBe('code');
      expect(block?.title).toBe('快速排序算法');
      expect(block?.content).toContain('quickSort');
      expect(block?.meta?.language).toBe('typescript');
    });

    it('creates a Mermaid architecture flowchart block with graph syntax', () => {
      const store = useBlockStore.getState();
      const mermaidId = store.addBlock('mermaid');
      store.updateBlock(mermaidId, {
        title: '微服务系统架构图',
        content: `graph TD\n  Client["用户客户端"] --> Gateway["API 网关"]\n  Gateway --> Core["BlockOS 规则引擎"]\n  Core --> AI["大模型调度 Agent"]`,
      });

      const block = useBlockStore.getState().blocks.find((b) => b.id === mermaidId);
      expect(block).toBeDefined();
      expect(block?.type).toBe('mermaid');
      expect(block?.title).toBe('微服务系统架构图');
      expect(block?.content).toContain('graph TD');
      expect(block?.content).toContain('Gateway');
    });

    it('creates structured parent-child hierarchy with PRD and 3 sub-tasks', () => {
      const store = useBlockStore.getState();
      const parentId = store.addBlock('text', undefined, { x: 40, y: 40 });
      store.updateBlock(parentId, {
        title: '核心业务需求 (PRD)',
        content: '重构鉴权系统与多租户权限隔离',
      });

      const task1Id = store.addBlock('todo', parentId, { x: 480, y: 40 });
      store.updateBlock(task1Id, {
        title: '子任务 1',
        content: '实现 JWT 与 API Key 双模拦截中间件',
        parentId,
      });

      const task2Id = store.addBlock('todo', parentId, { x: 480, y: 160 });
      store.updateBlock(task2Id, {
        title: '子任务 2',
        content: '编写 RBAC 权限矩阵测试用例',
        parentId,
      });

      const task3Id = store.addBlock('code', parentId, { x: 480, y: 280 });
      store.updateBlock(task3Id, {
        title: '子任务 3: 代码原型',
        content: 'console.log("Auth verified");',
        parentId,
      });

      const state = useBlockStore.getState();
      const parent = state.blocks.find((b) => b.id === parentId);
      const subTasks = state.blocks.filter((b) => b.parentId === parentId);

      expect(parent).toBeDefined();
      expect(subTasks.length).toBe(3);
      expect(subTasks.map((t) => t.type)).toEqual(['todo', 'todo', 'code']);
    });

    it('creates directional topological link between requirement and code sandbox', () => {
      const store = useBlockStore.getState();
      const prdId = store.addBlock('text');
      const codeId = store.addBlock('code');

      store.createLink(prdId, codeId);

      const prdBlock = useBlockStore.getState().blocks.find((b) => b.id === prdId);
      expect(prdBlock?.meta?.links).toContain(codeId);
    });

    it('highlights blocks matching criteria across the canvas', () => {
      const store = useBlockStore.getState();
      const b1 = store.addBlock('text');
      store.updateBlock(b1, { title: '模块A', content: '核心业务风险较高' });

      const b2 = store.addBlock('todo');
      store.updateBlock(b2, { title: '普通待办', content: '普通更新' });

      const b3 = store.addBlock('text');
      store.updateBlock(b3, { title: '架构风险评估', content: '需重点评估安全风险' });

      // 模拟 AI 高亮包含“风险”的 Block
      const all = useBlockStore.getState().blocks;
      all.forEach((b) => {
        if (b.content.includes('风险') || b.title?.includes('风险')) {
          store.updateBlock(b.id, { meta: { ...b.meta, highlight: 'red' } });
        }
      });

      const state = useBlockStore.getState();
      expect(state.blocks.find((b) => b.id === b1)?.meta?.highlight).toBe('red');
      expect(state.blocks.find((b) => b.id === b2)?.meta?.highlight).toBeUndefined();
      expect(state.blocks.find((b) => b.id === b3)?.meta?.highlight).toBe('red');
    });
  });
});
