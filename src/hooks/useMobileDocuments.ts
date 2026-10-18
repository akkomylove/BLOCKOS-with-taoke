'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { nanoid } from 'nanoid';
import { useBlockStore } from '@/store/blockStore';
import { getPresetDocumentBlocks } from '@/config/presetDocuments';
import type { Block } from '@/types/block';
import type { DocumentChapter, Page } from '@/types/page';
import { useAccountStore } from '@/store/accountStore';

type SaveState = 'idle' | 'saving' | 'saved' | 'pending' | 'conflict';
interface PendingDocument { pageId: string; userId: string; blocks: Block[]; version: number; }
const pendingKey = (userId: string, pageId: string) => `blockos-mobile-pending:${userId}:${pageId}`;

function cacheBlocks(pageId: string, blocks: Block[]) {
  useBlockStore.setState((state) => ({
    pageBlocks: { ...state.pageBlocks, [pageId]: blocks },
    ...(state.currentPageId === pageId ? { blocks } : {}),
  }));
}

function cachePage(page: Page) {
  useBlockStore.setState((state) => ({
    pages: state.pages.some((p) => p.id === page.id)
      ? state.pages.map((p) => p.id === page.id ? page : p) : [...state.pages, page],
  }));
}

export function useMobileDocuments() {
  const [session, setSession] = useState<'loading' | 'guest' | 'ready'>('loading');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const userRef = useRef<string | null>(null);
  const requestId = useRef(0);
  const savingRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    async function initialize() {
      try {
        await useBlockStore.persist.rehydrate();
        await useAccountStore.getState().load();
        const accountState = useAccountStore.getState();
        if (accountState.status === 'guest') {
          const blocks = getPresetDocumentBlocks('doc-guide');
          const page: Page = { id: 'mobile-example', title: '欢迎使用 BlockOS', icon: '👋', createdAt: 0, updatedAt: 0 };
          useBlockStore.setState({ pages: [page], folders: [], currentPageId: page.id, blocks, pageBlocks: { [page.id]: blocks }, currentUserId: null });
          setSession('guest');
          return;
        }
        if (accountState.status !== 'ready' || !accountState.user) throw new Error(accountState.error || '暂时无法读取登录状态，请刷新重试');
        const user = accountState.user;
        if (!user.id) throw new Error('登录已过期，请重新登录');
        userRef.current = user.id;
        useBlockStore.getState().setCurrentUserId(user.id);
        const response = await fetch('/api/pages', { signal: controller.signal });
        if (!response.ok) throw new Error('无法加载云端文档，请检查网络后刷新');
        const data = await response.json();
        if (controller.signal.aborted) return;
        const pages: Page[] = Array.isArray(data.pages) ? data.pages : [];
        useBlockStore.setState((state) => ({
          pages,
          folders: Array.isArray(data.folders) ? data.folders : state.folders,
          currentPageId: pages.some((page) => page.id === state.currentPageId) ? state.currentPageId : pages[0]?.id || '',
          blocks: [],
        }));
        setSession('ready');
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : '文档加载失败');
      }
    }
    void initialize();
    return () => controller.abort();
  }, []);

  const openPage = useCallback(async (pageId: string) => {
    const id = ++requestId.current;
    setLoading(true);
    setError('');
    try {
      if (!userRef.current) {
        useBlockStore.getState().setCurrentPage(pageId);
        return true;
      }
      const response = await fetch(`/api/pages/${encodeURIComponent(pageId)}`);
      if (!response.ok) throw new Error(response.status === 401 ? '登录已过期，请重新登录' : '文档加载失败，请重试');
      const data: { page: Page; blocks: Block[] } = await response.json();
      if (id !== requestId.current) return false;
      let blocks = data.blocks;
      let status: SaveState = 'idle';
      try {
        const raw = localStorage.getItem(pendingKey(userRef.current, pageId));
        if (raw) {
          const pending: PendingDocument = JSON.parse(raw);
          if (pending.userId === userRef.current && pending.pageId === pageId && Array.isArray(pending.blocks)) {
            blocks = pending.blocks;
            status = pending.version === data.page.version ? 'pending' : 'conflict';
            // Retain the original base version; a retry must never bypass a conflict.
            data.page.version = pending.version;
          }
        }
      } catch { /* A damaged local draft must not hide the cloud document. */ }
      cachePage(data.page);
      useBlockStore.setState((state) => ({
        currentPageId: pageId, blocks, selectedIds: [],
        pageBlocks: { ...state.pageBlocks, [pageId]: blocks },
      }));
      setSaveState(status);
      if (status === 'conflict') setError('云端文档已有更新。本机修改已保留，请复制需要的内容后合并，避免覆盖他人修改。');
      return true;
    } catch (err) {
      if (id === requestId.current) setError(err instanceof Error ? err.message : '文档加载失败');
      return false;
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);

  const saveBlocks = useCallback(async (pageId: string, blocks: Block[]) => {
    const userId = userRef.current;
    if (!userId || savingRef.current) return false;
    const page = useBlockStore.getState().pages.find((p) => p.id === pageId);
    if (!page) { setError('找不到当前文档，请重新打开'); return false; }
    const pending: PendingDocument = { userId, pageId, blocks, version: page?.version || 1 };
    // Secure a local copy before issuing any network request.
    let localCopySaved = false;
    try { localStorage.setItem(pendingKey(userId, pageId), JSON.stringify(pending)); localCopySaved = true; }
    catch { /* Report a storage error together with the network result below. */ }
    cacheBlocks(pageId, blocks);
    savingRef.current = true;
    setSaveState('saving');
    setError('');
    try {
      const response = await fetch(`/api/pages/${encodeURIComponent(pageId)}/blocks`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocks, version: pending.version }),
      });
      const result = await response.json();
      if (!response.ok) {
        setSaveState(response.status === 409 ? 'conflict' : 'pending');
        throw new Error(response.status === 409
          ? '云端文档已有更新，本机修改已保留。请先核对云端内容，再合并修改。'
          : response.status === 401 ? '登录已过期，本机修改已保留，请重新登录后继续。' : result.error || '云端保存失败，本机修改已保留，可稍后重试。');
      }
      cachePage({ ...page, version: result.pageVersion, updatedAt: Date.now() });
      try { localStorage.removeItem(pendingKey(userId, pageId)); } catch {}
      setSaveState('saved');
      return true;
    } catch (err) {
      setSaveState((state) => state === 'conflict' ? state : 'pending');
      setError(localCopySaved ? (err instanceof Error ? err.message : '网络不可用，本机修改已保留，可稍后重试。')
        : '云端保存失败，且本机存储空间不足。请保留此页面并复制正文备份后重试。');
      return false;
    } finally { savingRef.current = false; }
  }, []);

  const createPage = useCallback(async (title: string, kind: Page['kind'] = 'document') => {
    if (!userRef.current) throw new Error('请先登录，再创建云端文档');
    const response = await fetch('/api/pages', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: nanoid(), title, icon: kind === 'inbox' ? '📥' : '📄', kind }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || '创建失败，请重试');
    const page: Page = { id: result.id, title, kind, icon: kind === 'inbox' ? '📥' : '📄', version: result.version, createdAt: Date.now(), updatedAt: Date.now() };
    cachePage(page);
    cacheBlocks(page.id, []);
    return page;
  }, []);

  const saveOutline = useCallback(async (chapters: DocumentChapter[]) => {
    const state = useBlockStore.getState();
    const page = state.pages.find((p) => p.id === state.currentPageId);
    if (!userRef.current || !page || savingRef.current) return false;
    savingRef.current = true;
    setSaveState('saving'); setError('');
    try {
      const response = await fetch(`/api/pages/${encodeURIComponent(page.id)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapters, version: page.version }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(response.status === 409 ? '文档已更新，请重新打开后调整章节。' : result.error || '章节保存失败');
      cachePage({ ...page, chapters, version: result.version, updatedAt: Date.now() });
      setSaveState('saved');
      return true;
    } catch (err) {
      setSaveState('idle'); setError(err instanceof Error ? err.message : '章节保存失败');
      return false;
    } finally { savingRef.current = false; }
  }, []);

  const captureNote = useCallback(async (content: string) => {
    let inbox = useBlockStore.getState().pages.find((page) => page.kind === 'inbox');
    if (!inbox) inbox = await createPage('随手记收件箱', 'inbox');
    if (!await openPage(inbox.id)) throw new Error('收件箱加载失败，记录仍保留在输入框中');
    const state = useBlockStore.getState();
    const now = Date.now();
    const last = state.blocks[state.blocks.length - 1];
    const note: Block = {
      id: nanoid(), type: 'text', title: content.trim().split('\n')[0].slice(0, 60), content,
      meta: { tags: ['随手记'] }, parentId: null,
      order: state.blocks.reduce((max, b) => Math.max(max, b.order), -1) + 1,
      x: 40, y: last ? last.y + (last.height || 240) + 60 : 40,
      width: 480, height: 240, collapsed: false, createdAt: now, updatedAt: now,
    };
    const saved = await saveBlocks(inbox.id, [...state.blocks, note]);
    if (!saved) {
      let localCopyExists = false;
      try { localCopyExists = !!localStorage.getItem(pendingKey(userRef.current || '', inbox.id)); } catch {}
      if (!localCopyExists) throw new Error('尚未保存成功。请保留输入框并复制记录备份，再重试。');
    }
    return { inbox, noteId: note.id, saved };
  }, [createPage, openPage, saveBlocks]);

  const retrySave = useCallback(() => {
    const state = useBlockStore.getState();
    return saveBlocks(state.currentPageId, state.blocks);
  }, [saveBlocks]);

  return { session, loading, error, setError, saveState, openPage, saveBlocks, saveOutline, createPage, captureNote, retrySave };
}
