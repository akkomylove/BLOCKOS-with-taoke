import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBlockStore } from '@/store/blockStore';
import { workspaceStorage } from '@/lib/workspace-storage';

beforeEach(() => {
  useBlockStore.setState({ currentUserId: null, pages: [], pageBlocks: {}, blocks: [], currentPageId: '', history: [], agentLogs: [] });
});
afterEach(() => vi.restoreAllMocks());

describe('asynchronous account cache hydration', () => {
  it('shares a pending account load across remounts before loading the document directory', async () => {
    let release!: (value: null) => void;
    vi.spyOn(workspaceStorage, 'getItem').mockImplementation(key => key === 'blockos-activity-reader'
      ? new Promise<null>(resolve => { release = resolve; }) : null);
    const first = useBlockStore.getState().setCurrentUserId('reader');
    const remount = useBlockStore.getState().setCurrentUserId('reader');
    expect(remount).toBe(first);
    release(null);
    await remount;
    useBlockStore.setState({ pages: [{ id: 'cloud-doc', title: 'My document', createdAt: 1, updatedAt: 1 }] });
    await first;
    expect(useBlockStore.getState().pages[0].id).toBe('cloud-doc');
  });

  it('does not restore a previous account after switching accounts while its cache loads', async () => {
    let release!: (value: string) => void;
    vi.spyOn(workspaceStorage, 'getItem').mockImplementation(key => key === 'blockos-activity-first-reader'
      ? new Promise<string>(resolve => { release = resolve; }) : null);
    const first = useBlockStore.getState().setCurrentUserId('first-reader');
    await useBlockStore.getState().setCurrentUserId('second-reader');
    useBlockStore.setState({ pages: [{ id: 'second-doc', title: 'Second account', createdAt: 1, updatedAt: 1 }] });
    release(JSON.stringify({ logs: [{ id: 'first-account-only' }], history: [] }));
    await first;
    expect(useBlockStore.getState().currentUserId).toBe('second-reader');
    expect(useBlockStore.getState().pages[0].id).toBe('second-doc');
    expect(useBlockStore.getState().agentLogs).toEqual([]);
  });
});
