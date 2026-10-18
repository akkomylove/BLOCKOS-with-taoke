import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBlockStore } from '@/store/blockStore';
import type { Block } from '@/types/block';

const block = (id: string): Block => ({ id, type: 'text', title: id, content: 'original', meta: {}, parentId: null, order: 0, x: 40, y: 40, width: 420, createdAt: 1, updatedAt: 1 });
let writes: Map<string, Block[]>;
beforeEach(() => {
  vi.useFakeTimers();
  writes = new Map();
  useBlockStore.setState({ pages: ['page-a', 'page-b'].map(id => ({ id, title: id, createdAt: 1, updatedAt: 1 })), currentPageId: 'page-a', currentUserId: 'regression-account', blocks: [block('a')], pageBlocks: { 'page-a': [block('a')], 'page-b': [block('b')] }, history: [], historyIndex: -1 });
  vi.stubGlobal('fetch', vi.fn(async (url: string, options?: RequestInit) => {
    if (options?.method === 'PUT') writes.set(url, JSON.parse(String(options.body)).blocks);
    return Response.json({ success: true, blocks: [] });
  }));
});
afterEach(async () => { await vi.runOnlyPendingTimersAsync(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('regression: document persistence and history', () => {
  it('saves edits to both documents when switching within the debounce window', async () => {
    useBlockStore.getState().updateBlock('a', { content: 'edited A' });
    useBlockStore.getState().setCurrentPage('page-b');
    useBlockStore.getState().updateBlock('b', { content: 'edited B' });
    await vi.advanceTimersByTimeAsync(900);
    expect(writes.get('/api/pages/page-a/blocks')?.[0].content).toBe('edited A');
    expect(writes.get('/api/pages/page-b/blocks')?.[0].content).toBe('edited B');
  });
  it('waits for page creation before saving template content, including immediate edits', async () => {
    let complete!: () => void;
    vi.stubGlobal('fetch', vi.fn(async (url: string, options?: RequestInit) => {
      if (url === '/api/pages' && options?.method === 'POST') await new Promise<void>(resolve => { complete = resolve; });
      if (options?.method === 'PUT') writes.set(url, JSON.parse(String(options.body)).blocks);
      return Response.json({ success: true });
    }));
    const id = useBlockStore.getState().addPageFromTemplate('template-prd');
    const created = useBlockStore.getState().blocks;
    expect(created.length).toBeGreaterThan(0);
    useBlockStore.getState().updateBlock(created[0].id, { content: 'edited before POST completed' });
    await vi.advanceTimersByTimeAsync(900);
    expect(writes.size).toBe(0);
    complete();
    await vi.advanceTimersByTimeAsync(1);
    expect(writes.get(`/api/pages/${id}/blocks`)?.[0].content).toBe('edited before POST completed');
  });
  it('generates an edit snapshot, restores it, and never undoes another page into this page', async () => {
    useBlockStore.getState().updateBlock('a', { content: 'changed' });
    await vi.advanceTimersByTimeAsync(900);
    useBlockStore.getState().undo();
    expect(useBlockStore.getState().blocks[0].content).toBe('original');
    useBlockStore.getState().redo();
    expect(useBlockStore.getState().blocks[0].content).toBe('changed');
    useBlockStore.getState().setCurrentPage('page-b');
    useBlockStore.getState().undo();
    expect(useBlockStore.getState().blocks[0].id).toBe('b');
  });
});
