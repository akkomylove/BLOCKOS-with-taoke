import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCanvasAssistant } from '@/hooks/useCanvasAssistant';
import { useBlockStore } from '@/store/blockStore';

beforeEach(() => {
  vi.useFakeTimers();
  useBlockStore.setState({ currentPageId: 'assistant-regression', currentUserId: 'assistant-user', pages: [{ id: 'assistant-regression', title: 'Test', createdAt: 1, updatedAt: 1 }], pageBlocks: {}, blocks: [], agentLogs: [], history: [], historyIndex: -1 });
});
afterEach(async () => { await vi.runOnlyPendingTimersAsync(); vi.useRealTimers(); vi.unstubAllGlobals(); });
const reply = (body: unknown) => vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body))));

describe('assistant completion is tied to actual operations', () => {
  it('repairs a missing named text creation in a compound request', async () => {
    reply({ type: 'agent_response', message: '我已经新建了卡片', actionSuggestions: [{ label: '查看新建卡片', command: '查看' }] });
    const { result } = renderHook(() => useCanvasAssistant());
    await act(async () => { await result.current.send('当前有几个卡片，另外新建一个正文卡片，标题写 REG3'); });
    expect(useBlockStore.getState().blocks.map(block => block.title)).toEqual(['REG3']);
    expect(useBlockStore.getState().agentLogs).toHaveLength(1);
    expect(result.current.messages.at(-1)?.operations).toHaveLength(1);
  });
  it('executes operations returned alongside a normal answer regardless of the model type tag', async () => {
    reply({ type: 'agent_response', message: '当前为空', operations: [{ action: 'createBlock', type: 'text', title: 'REAL', content: 'body' }] });
    const { result } = renderHook(() => useCanvasAssistant());
    await act(async () => { await result.current.send('总结画布，再创建卡片'); });
    expect(useBlockStore.getState().blocks[0].title).toBe('REAL');
    expect(result.current.messages.at(-1)?.content).toContain('当前为空');
  });
  it('rejects text-only completion claims without changing the canvas or rendering fake navigation', async () => {
    reply({ type: 'agent_response', message: '我已经新建了一张卡片', actionSuggestions: [{ label: '查看新建卡片', command: '查看' }] });
    const { result } = renderHook(() => useCanvasAssistant());
    await act(async () => { await result.current.send('当前有哪些卡片？'); });
    expect(useBlockStore.getState().blocks).toHaveLength(0);
    expect(result.current.messages.at(-1)?.error).toBe(true);
    expect(result.current.messages.at(-1)?.content).toContain('没有修改画布');
    expect(result.current.messages.at(-1)?.suggestions).toBeUndefined();
  });
});
