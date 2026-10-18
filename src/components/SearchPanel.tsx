'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { X, Search, FileText, Tag } from 'lucide-react';
import { useBlockStore } from '@/store/blockStore';
import type { BlockType } from '@/types/block';

interface SearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  text: '文本', todo: '待办', code: '代码', table: '表格', media: '媒体',
  quote: '引用', toggle: '折叠', divider: '分隔线', whiteboard: '白板',
  mindmap: '思维导图', math: '公式',
  callout: '高亮提示', countdown: '倒计时', bookmark: '网页书签', mermaid: '架构图',
};

export default function SearchPanel({ isOpen, onClose }: SearchPanelProps) {
  const [query, setQuery] = useState('');
  const [activeTypeFilter, setActiveTypeFilter] = useState<BlockType | null>(null);
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [loadError, setLoadError] = useState('');

  const pages = useBlockStore((state) => state.pages);
  const pageBlocks = useBlockStore((state) => state.pageBlocks);
  const currentBlocks = useBlockStore((state) => state.blocks);
  const currentPageId = useBlockStore((state) => state.currentPageId);
  const setCurrentPage = useBlockStore((state) => state.setCurrentPage);
  const setSelection = useBlockStore((state) => state.setSelection);

  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    setLoadError('');
    const missing = pages.filter(page => page.id !== currentPageId && !useBlockStore.getState().pageBlocks[page.id]);
    let next = 0;
    async function load() {
      while (next < missing.length && !controller.signal.aborted) {
        const page = missing[next++];
        try {
          const response = await fetch(`/api/pages/${encodeURIComponent(page.id)}/blocks`, { signal: controller.signal });
          if (!response.ok) throw new Error();
          const data = await response.json();
          if (!controller.signal.aborted && Array.isArray(data.blocks)) useBlockStore.setState(state => ({ pageBlocks: { ...state.pageBlocks, [page.id]: state.pageBlocks[page.id] || data.blocks } }));
        } catch { if (!controller.signal.aborted) setLoadError('部分文档未能加载，搜索结果可能不完整，请关闭后重试'); }
      }
    }
    void Promise.all(Array.from({ length: Math.min(missing.length, 3) }, load));
    return () => controller.abort();
  }, [isOpen, pages, currentPageId]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setActiveTypeFilter(null);
      setActiveTagFilter(null);
    }
  }, [isOpen]);

  const allSearchableItems = useMemo(() => {
    const items: Array<{
      block: typeof currentBlocks[0];
      pageId: string;
      pageTitle: string;
      isCurrentPage: boolean;
    }> = [];

    pages.forEach((p) => {
      const bList = p.id === currentPageId ? currentBlocks : (pageBlocks[p.id] || []);
      bList.forEach((b) => {
        items.push({
          block: b,
          pageId: p.id,
          pageTitle: p.title || '未命名文档',
          isCurrentPage: p.id === currentPageId,
        });
      });
    });

    return items;
  }, [pages, pageBlocks, currentBlocks, currentPageId]);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    allSearchableItems.forEach(({ block: b }) => b.meta?.tags?.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet);
  }, [allSearchableItems]);

  const allTypes = useMemo(() => {
    const typeSet = new Set<BlockType>();
    allSearchableItems.forEach(({ block: b }) => typeSet.add(b.type));
    return Array.from(typeSet);
  }, [allSearchableItems]);

  const results = useMemo(() => {
    let filtered = allSearchableItems;

    if (activeTypeFilter) {
      filtered = filtered.filter((item) => item.block.type === activeTypeFilter);
    }

    if (activeTagFilter) {
      filtered = filtered.filter((item) => item.block.meta?.tags?.includes(activeTagFilter));
    }

    if (!query.trim()) {
      return filtered.map((item) => ({
        ...item,
        preview: (item.block.content || '').replace(/\n/g, ' ').slice(0, 120),
        matchedTitle: false,
        matchedContent: false,
        matchedTag: false,
      })).slice(0, 30);
    }

    const q = query.toLowerCase();
    return filtered
      .filter((item) =>
        (item.block.content || '').toLowerCase().includes(q) ||
        (item.block.title || '').toLowerCase().includes(q) ||
        (item.pageTitle || '').toLowerCase().includes(q) ||
        item.block.meta?.tags?.some((t) => t.toLowerCase().includes(q))
      )
      .map((item) => ({
        ...item,
        preview: (item.block.content || '').replace(/\n/g, ' ').slice(0, 120),
        matchedTitle: (item.block.title || '').toLowerCase().includes(q),
        matchedContent: (item.block.content || '').toLowerCase().includes(q),
        matchedTag: item.block.meta?.tags?.some((t) => t.toLowerCase().includes(q)) || false,
      }))
      .slice(0, 30);
  }, [query, allSearchableItems, activeTypeFilter, activeTagFilter]);

  const highlightText = (text: string, q: string) => {
    if (!q.trim()) return text;
    const lower = q.toLowerCase();
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let idx = text.toLowerCase().indexOf(lower);
    let key = 0;
    while (idx !== -1) {
      if (idx > lastIndex) parts.push(text.slice(lastIndex, idx));
      parts.push(<mark key={key++} className="bg-yellow-200 dark:bg-yellow-500/30 text-inherit rounded px-0.5">{text.slice(idx, idx + lower.length)}</mark>);
      lastIndex = idx + lower.length;
      idx = text.toLowerCase().indexOf(lower, lastIndex);
    }
    if (lastIndex < text.length) parts.push(text.slice(lastIndex));
    return parts.length > 0 ? parts : text;
  };

  const handleSelect = (pageId: string, blockId: string) => {
    if (pageId !== currentPageId) {
      setCurrentPage(pageId);
    }
    setSelection([blockId]);
    onClose();
    setTimeout(() => {
      const el = document.querySelector(`[data-block-id="${blockId}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <div className="absolute inset-0 bg-black/30 dark:bg-black/60 backdrop-blur-xs" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-white dark:bg-[#1a1c20] border border-line dark:border-zinc-800 rounded-2xl shadow-modal overflow-hidden animate-scale-in">
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-line-subtle dark:border-zinc-800 bg-white dark:bg-[#1a1c20]">
          <Search className="w-4 h-4 text-content-tertiary" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索 Block 标题、内容或标签..."
            className="flex-1 bg-transparent text-sm text-content dark:text-zinc-100 outline-none placeholder:text-content-tertiary"
          />
          <button
            onClick={onClose}
            aria-label="关闭搜索"
            className="p-1 hover:bg-surface-hover dark:hover:bg-zinc-800 rounded-lg text-content-tertiary hover:text-content-secondary dark:hover:text-zinc-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {loadError && <p role="status" className="px-5 py-2 text-xs text-amber-700">{loadError}</p>}
        {(allTypes.length > 0 || allTags.length > 0) && (
          <div className="px-5 py-2.5 border-b border-line-subtle dark:border-zinc-800 bg-[#f7f8fa]/60 dark:bg-zinc-900/40 space-y-2">
            {allTypes.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] text-content-tertiary uppercase font-medium">类型</span>
                <button
                  onClick={() => setActiveTypeFilter(null)}
                  className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                    activeTypeFilter === null
                      ? 'bg-brand-light text-brand dark:bg-blue-950/40 dark:text-blue-300 font-medium'
                      : 'bg-white dark:bg-zinc-800 text-content-secondary dark:text-zinc-400 border border-line dark:border-zinc-700/60 hover:bg-surface-hover'
                  }`}
                >
                  全部
                </button>
                {allTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => setActiveTypeFilter(type)}
                    className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                      activeTypeFilter === type
                        ? 'bg-brand-light text-brand dark:bg-blue-950/40 dark:text-blue-300 font-medium'
                        : 'bg-white dark:bg-zinc-800 text-content-secondary dark:text-zinc-400 border border-line dark:border-zinc-700/60 hover:bg-surface-hover'
                    }`}
                  >
                    {BLOCK_TYPE_LABELS[type] || type}
                  </button>
                ))}
              </div>
            )}
            {allTags.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] text-content-tertiary uppercase font-medium">标签</span>
                <button
                  onClick={() => setActiveTagFilter(null)}
                  className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                    activeTagFilter === null
                      ? 'bg-[#f7f4ff] text-ai-purple dark:bg-purple-950/40 dark:text-purple-300 font-medium'
                      : 'bg-white dark:bg-zinc-800 text-content-secondary dark:text-zinc-400 border border-line dark:border-zinc-700/60 hover:bg-surface-hover'
                  }`}
                >
                  全部
                </button>
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setActiveTagFilter(tag)}
                    className={`px-2 py-0.5 rounded text-[11px] transition-colors flex items-center gap-1 ${
                      activeTagFilter === tag
                        ? 'bg-[#f7f4ff] text-ai-purple dark:bg-purple-950/40 dark:text-purple-300 font-medium'
                        : 'bg-white dark:bg-zinc-800 text-content-secondary dark:text-zinc-400 border border-line dark:border-zinc-700/60 hover:bg-surface-hover'
                    }`}
                  >
                    <Tag className="w-2.5 h-2.5" />
                    {tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="max-h-[50vh] overflow-y-auto">
          {results.length === 0 && (query.trim() || activeTypeFilter || activeTagFilter) && (
            <div className="px-4 py-10 text-center text-xs text-content-tertiary dark:text-zinc-500">未找到匹配内容</div>
          )}
          {results.map(({ block, preview, pageId, pageTitle, matchedTitle, matchedTag }) => (
            <button
              key={`${pageId}-${block.id}`}
              onClick={() => handleSelect(pageId, block.id)}
              className="w-full text-left px-5 py-3 hover:bg-surface-hover dark:hover:bg-zinc-800/60 border-b border-line-subtle dark:border-zinc-800/50 last:border-0 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-[10px] px-1.5 py-0.5 bg-[#eff0f2] dark:bg-zinc-800 text-content-secondary dark:text-zinc-300 rounded font-medium flex items-center gap-0.5">
                  <FileText className="w-2.5 h-2.5 text-content-tertiary" />
                  {pageTitle}
                </span>
                <span className="text-xs text-content-tertiary capitalize">{BLOCK_TYPE_LABELS[block.type] || block.type}</span>
                {matchedTitle && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-brand-light text-brand rounded font-medium">标题匹配</span>
                )}
                {matchedTag && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-[#f7f4ff] text-ai-purple rounded font-medium flex items-center gap-0.5">
                    <Tag className="w-2.5 h-2.5" />标签匹配
                  </span>
                )}
                {block.meta.tags && block.meta.tags.length > 0 && (
                  <div className="flex items-center gap-1">
                    {block.meta.tags.map((tag) => (
                      <span key={tag} className="text-[9px] px-1.5 py-0.5 bg-surface-hover text-content-secondary rounded">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
              {block.title && (
                <p className="text-xs text-content dark:text-zinc-300 mb-0.5 font-medium">
                  {highlightText(block.title, query)}
                </p>
              )}
              <p className="text-xs text-content-secondary dark:text-zinc-400 line-clamp-2 leading-relaxed">
                {highlightText(preview, query)}
              </p>
            </button>
          ))}
        </div>

        <div className="px-5 py-2.5 bg-[#f7f8fa] dark:bg-zinc-950/60 border-t border-line-subtle dark:border-zinc-800 text-[11px] text-content-tertiary flex justify-between">
          <span>共 {results.length} 个结果</span>
          <span>按 Esc 或点击遮罩关闭</span>
        </div>
      </div>
    </div>
  );
}
