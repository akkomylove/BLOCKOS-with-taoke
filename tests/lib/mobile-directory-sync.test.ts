import { afterEach, describe, expect, it, vi } from 'vitest';
import { useBlockStore } from '@/store/blockStore';

describe('Shared desktop/mobile directory sync', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('pulls documents created on mobile without posting a stale cached reading outline', async () => {
    const oldPage = { id: 'desktop-doc', title: '文档', createdAt: 1, updatedAt: 1, chapters: [{ id: 'old', title: '旧目录', blockIds: [] }] };
    const remotePage = { ...oldPage, chapters: [{ id: 'new', title: '手机整理后的目录', blockIds: [] }] };
    const inbox = { id: 'mobile-inbox', title: '随手记收件箱', kind: 'inbox', createdAt: 2, updatedAt: 2 };
    useBlockStore.setState({ pages: [oldPage], currentPageId: oldPage.id, folders: [] });
    const fetchMock = vi.fn(async (_url: string, options?: RequestInit) => options?.method === 'PUT' ? Response.json({ success: true }) : Response.json({ pages: [remotePage, inbox], folders: [] }));
    vi.stubGlobal('fetch', fetchMock);
    await useBlockStore.getState().syncPages();
    const sent = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(sent.pages[0]).not.toHaveProperty('chapters');
    expect(useBlockStore.getState().pages.find((page) => page.id === oldPage.id)?.chapters?.[0].id).toBe('new');
    expect(useBlockStore.getState().pages.find((page) => page.id === inbox.id)?.kind).toBe('inbox');
  });
});
