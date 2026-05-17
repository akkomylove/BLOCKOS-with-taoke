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
};

export default function SearchPanel({ isOpen, onClose }: SearchPanelProps) {
  const [query, setQuery] = useState('');
  const [activeTypeFilter, setActiveTypeFilter] = useState<BlockType | null>(null);
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const blocks = useBlockStore((state) => state.blocks);
  const setSelection = useBlockStore((state) => state.setSelection);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setActiveTypeFilter(null);
      setActiveTagFilter(null);
    }
  }, [isOpen]);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    blocks.forEach((b) => b.meta.tags?.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet);
  }, [blocks]);

  const allTypes = useMemo(() => {
    const typeSet = new Set<BlockType>();
    blocks.forEach((b) => typeSet.add(b.type));
    return Array.from(typeSet);
  }, [blocks]);

  const results = useMemo(() => {
    let filtered = blocks;

    if (activeTypeFilter) {
      filtered = filtered.filter((b) => b.type === activeTypeFilter);
    }

    if (activeTagFilter) {
      filtered = filtered.filter((b) => b.meta.tags?.includes(activeTagFilter));
    }

    if (!query.trim()) {
      return filtered.map((b) => ({
        block: b,
        preview: b.content.replace(/\n/g, ' ').slice(0, 120),
        matchedTitle: false,
        matchedContent: false,
        matchedTag: false,
      })).slice(0, 20);
    }

    const q = query.toLowerCase();
    return filtered
      .filter((b) =>
        b.content.toLowerCase().includes(q) ||
        b.title.toLowerCase().includes(q) ||
        b.meta.tags?.some((t) => t.toLowerCase().includes(q))
      )
      .map((b) => ({
        block: b,
        preview: b.content.replace(/\n/g, ' ').slice(0, 120),
        matchedTitle: b.title.toLowerCase().includes(q),
        matchedContent: b.content.toLowerCase().includes(q),
        matchedTag: b.meta.tags?.some((t) => t.toLowerCase().includes(q)) || false,
      }))
      .slice(0, 20);
  }, [query, blocks, activeTypeFilter, activeTagFilter]);

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

  const handleSelect = (blockId: string) => {
    setSelection([blockId]);
    onClose();
    setTimeout(() => {
      const el = document.querySelector(`[data-block-id="${blockId}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-zinc-800">
          <Search className="w-4 h-4 text-gray-400 dark:text-zinc-500" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索 Block 标题、内容或标签..."
            className="flex-1 bg-transparent text-sm text-gray-900 dark:text-zinc-100 outline-none placeholder:text-gray-400 dark:placeholder:text-zinc-600"
          />
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded text-gray-400 dark:text-zinc-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        {(allTypes.length > 0 || allTags.length > 0) && (
          <div className="px-4 py-2 border-b border-gray-200 dark:border-zinc-800 space-y-2">
            {allTypes.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] text-gray-400 dark:text-zinc-500 uppercase">类型</span>
                <button
                  onClick={() => setActiveTypeFilter(null)}
                  className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                    activeTypeFilter === null
                      ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300'
                      : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-700'
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
                        ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300'
                        : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {BLOCK_TYPE_LABELS[type] || type}
                  </button>
                ))}
              </div>
            )}
            {allTags.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] text-gray-400 dark:text-zinc-500 uppercase">标签</span>
                <button
                  onClick={() => setActiveTagFilter(null)}
                  className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                    activeTagFilter === null
                      ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300'
                      : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-700'
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
                        ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300'
                        : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-700'
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
            <div className="px-4 py-8 text-center text-sm text-gray-400 dark:text-zinc-600">未找到匹配内容</div>
          )}
          {results.map(({ block, preview, matchedTitle, matchedTag }) => (
            <button
              key={block.id}
              onClick={() => handleSelect(block.id)}
              className="w-full text-left px-4 py-3 hover:bg-gray-100/50 dark:hover:bg-zinc-800/50 border-b border-gray-200/50 dark:border-zinc-800/50 last:border-0 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <FileText className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500" />
                <span className="text-xs text-gray-400 dark:text-zinc-500 capitalize">{BLOCK_TYPE_LABELS[block.type] || block.type}</span>
                {matchedTitle && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 rounded">标题匹配</span>
                )}
                {matchedTag && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/10 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400 rounded flex items-center gap-0.5">
                    <Tag className="w-2.5 h-2.5" />标签匹配
                  </span>
                )}
                {block.meta.tags && block.meta.tags.length > 0 && (
                  <div className="flex items-center gap-1">
                    {block.meta.tags.map((tag) => (
                      <span key={tag} className="text-[9px] px-1.5 py-0.5 bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 rounded">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
              {block.title && (
                <p className="text-xs text-gray-500 dark:text-zinc-400 mb-0.5 font-medium">
                  {highlightText(block.title, query)}
                </p>
              )}
              <p className="text-sm text-gray-700 dark:text-zinc-300 line-clamp-2">
                {highlightText(preview, query)}
              </p>
            </button>
          ))}
        </div>

        <div className="px-4 py-2 bg-gray-50 dark:bg-zinc-950 border-t border-gray-200 dark:border-zinc-800 text-xs text-gray-400 dark:text-zinc-600 flex justify-between">
          <span>{results.length} 个结果</span>
          <span>按 Esc 关闭</span>
        </div>
      </div>
    </div>
  );
}
