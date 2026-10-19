import { useBlockStore } from '@/store/blockStore';
import { getAccountGuide } from '@/config/account-guide';
import type { AccountMode } from '@/types/account';
import type { Page } from '@/types/page';

// Read cloud data before any upload. A new device must never publish its sample
// directory over an existing account, or replace an intentionally empty document.
export async function initializeWorkspace(userId: string, mode: AccountMode, signal: AbortSignal) {
  await useBlockStore.persist.rehydrate();
  if (signal.aborted) return false;
  useBlockStore.getState().setCurrentUserId(userId);
  useBlockStore.getState().hydrate();
  useBlockStore.setState({ agentEnabled: false, agentRules: [] });
  const response = await fetch('/api/pages', { signal });
  if (!response.ok) throw new Error('无法加载云端文档，请刷新重试；本地记录已保留');
  const directory = await response.json();
  if (signal.aborted) return false;
  const pages: Page[] = directory.pages || [];
  const folders = directory.folders || [];
  if (pages.length) {
    const previous = useBlockStore.getState().currentPageId;
    const id = pages.some(page => page.id === previous) ? previous : pages[0].id;
    const content = await fetch(`/api/pages/${encodeURIComponent(id)}/blocks`, { signal });
    if (!content.ok) throw new Error('文档内容加载失败，请刷新重试');
    const data = await content.json();
    if (signal.aborted) return false;
    const finalBlocks = data.blocks || [];
    useBlockStore.setState(state => ({
      pages,
      folders,
      currentPageId: id,
      blocks: finalBlocks,
      pageBlocks: { ...state.pageBlocks, [id]: finalBlocks },
    }));
    await useBlockStore.getState().loadActivity().catch(() => {});
    return false;
  }
  const blocks = getAccountGuide(mode).map(block => ({ ...block, id: `${block.id}-${userId}`,
    parentId: block.parentId ? `${block.parentId}-${userId}` : null,
    meta: { ...block.meta, tourId: block.meta.tourId || block.id, ...(block.meta.links ? { links: block.meta.links.map(id => `${id}-${userId}`) } : {}) },
  }));
  const now = Date.now();
  const page: Page = { id: `doc-guide-${userId}`, title: '👋 欢迎使用 BlockOS ｜ 新手快速入门指南', icon: '👋', createdAt: now, updatedAt: now };
  const created = await fetch('/api/pages', { method: 'POST', signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(page) });
  if (!created.ok) throw new Error('无法创建入门文档，请重试');
  const result = await created.json();
  page.id = result.id;
  const saved = await fetch(`/api/pages/${encodeURIComponent(page.id)}/blocks`, { method: 'PUT', signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ blocks, version: result.version }) });
  if (!saved.ok) throw new Error('入门文档保存失败，请刷新重试');
  if (signal.aborted) return false;
  useBlockStore.setState({ pages: [page], folders, currentPageId: page.id, blocks, pageBlocks: { [page.id]: blocks } });
  await useBlockStore.getState().loadActivity().catch(() => {});
  return true;
}
