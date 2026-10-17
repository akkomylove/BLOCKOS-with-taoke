import { describe, it, expect, beforeEach } from 'vitest';
import { useBlockStore } from '@/store/blockStore';

describe('Built-in AI Tool-Calling: Block Creation, Subblock Hierarchies & Operations', () => {
  beforeEach(() => {
    useBlockStore.getState().reset();
  });

  it('should support creating multiple blocks with parent-child subblock relations', () => {
    const store = useBlockStore.getState();

    // 模拟内置 AI 接收到指令并调度创建 1 个父 Block 与 2 个子 Block
    const parentId = store.addBlock('text', undefined, { x: 40, y: 40 });
    store.updateBlock(parentId, {
      title: '核心业务需求 (PRD)',
      content: '主需求卡片内容',
    });

    const child1Id = store.addBlock('todo', parentId, { x: 480, y: 40 });
    store.updateBlock(child1Id, {
      title: '子任务 1',
      content: '完成鉴权 API Key 开放接口对接',
      parentId: parentId,
    });

    const child2Id = store.addBlock('todo', parentId, { x: 480, y: 200 });
    store.updateBlock(child2Id, {
      title: '子任务 2',
      content: '完成 MCP 工具调用端点测试',
      parentId: parentId,
    });

    const state = useBlockStore.getState();
    const parent = state.blocks.find((b) => b.id === parentId);
    const child1 = state.blocks.find((b) => b.id === child1Id);
    const child2 = state.blocks.find((b) => b.id === child2Id);

    expect(parent).toBeDefined();
    expect(parent?.parentId).toBeNull();
    expect(child1?.parentId).toBe(parentId);
    expect(child2?.parentId).toBe(parentId);
  });

  it('should support dynamically setting an existing block as a child of another block (setParent)', () => {
    const store = useBlockStore.getState();

    const blockA = store.addBlock('text');
    store.updateBlock(blockA, { title: '模块 A', content: '内容 A' });

    const blockB = store.addBlock('text');
    store.updateBlock(blockB, { title: '模块 B', content: '内容 B' });

    expect(useBlockStore.getState().blocks.find((b) => b.id === blockB)?.parentId).toBeNull();

    // 执行 setParent 动作（如 AI 调度：将模块 B 设为模块 A 的子 Block）
    const targetParent = useBlockStore.getState().blocks.find((b) => b.id === blockA)!;
    store.updateBlock(blockB, {
      parentId: targetParent.id,
      x: (targetParent.x || 40) + (targetParent.width || 420) + 40,
      y: targetParent.y || 40,
    });

    const updatedB = useBlockStore.getState().blocks.find((b) => b.id === blockB);
    expect(updatedB?.parentId).toBe(blockA);
  });

  it('should support outdenting a subblock to restore it as a standalone block', () => {
    const store = useBlockStore.getState();

    const parentId = store.addBlock('text');
    const childId = store.addBlock('text');
    store.updateBlock(childId, { parentId });

    expect(useBlockStore.getState().blocks.find((b) => b.id === childId)?.parentId).toBe(parentId);

    // 移出子 Block
    store.outdentBlock(childId);

    const outdented = useBlockStore.getState().blocks.find((b) => b.id === childId);
    expect(outdented?.parentId).toBeNull();
  });

  it('should support creating links between blocks via AI action', () => {
    const store = useBlockStore.getState();

    const b1 = store.addBlock('text');
    const b2 = store.addBlock('text');

    store.createLink(b1, b2);

    const updatedB1 = useBlockStore.getState().blocks.find((b) => b.id === b1);
    expect(updatedB1?.meta?.links).toContain(b2);
  });
});
