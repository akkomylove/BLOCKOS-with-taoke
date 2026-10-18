import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initializeWorkspace } from '@/lib/initialize-workspace';
import { useBlockStore } from '@/store/blockStore';

beforeEach(() => { localStorage.clear(); useBlockStore.setState({ currentUserId: null, pages: [], pageBlocks: {}, blocks: [], currentPageId: '' }); });

describe('Account workspace startup', () => {
  it('loads existing cloud documents without uploading sample pages or overwriting an empty document', async () => {
    const fetcher = vi.fn(async (url: string) => url === '/api/pages'
      ? Response.json({ pages: [{ id: 'custom-prd', title: '我的产品需求文档', createdAt: 1, updatedAt: 1 }], folders: [] })
      : Response.json({ blocks: [] }));
    vi.stubGlobal('fetch', fetcher);
    expect(await initializeWorkspace('returning-user', 'personal', new AbortController().signal)).toBe(false);
    expect(useBlockStore.getState().pages.map(page => page.id)).toEqual(['custom-prd']);
    expect(useBlockStore.getState().blocks).toEqual([]);
    expect(fetcher.mock.calls.map(call => call[0])).toEqual(['/api/pages', '/api/pages/custom-prd/blocks']);
  });

  it('creates a personal guide only for a new account with namespaced block ids', async () => {
    const calls: { url: string; options?: RequestInit }[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string, options?: RequestInit) => {
      calls.push({ url, options });
      if (!options?.method) return Response.json({ pages: [], folders: [] });
      return Response.json(options.method === 'POST' ? { id: 'doc-guide-new-account', version: 1 } : { success: true });
    }));
    expect(await initializeWorkspace('new-account', 'personal', new AbortController().signal)).toBe(true);
    const blocks = useBlockStore.getState().blocks;
    expect(blocks.length).toBeGreaterThan(0);
    expect(blocks.every(block => block.id.endsWith('-new-account'))).toBe(true);
    expect(blocks.find(block => block.meta.tourId === 'guide-block-welcome')?.title).toContain('个人工作区');
    expect(calls.map(call => call.options?.method || 'GET')).toEqual(['GET', 'POST', 'PUT']);
  });
});
