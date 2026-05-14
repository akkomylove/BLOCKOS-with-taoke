'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { X, Search, FileText } from 'lucide-react';
import { useBlockStore } from '@/store/blockStore';

interface SearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchPanel({ isOpen, onClose }: SearchPanelProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const blocks = useBlockStore((state) => state.blocks);
  const setSelection = useBlockStore((state) => state.setSelection);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return blocks
      .filter((b) =>
        b.content.toLowerCase().includes(q) ||
        b.title.toLowerCase().includes(q)
      )
      .map((b) => ({
        block: b,
        preview: b.content.replace(/\n/g, ' ').slice(0, 120),
        matchedTitle: b.title.toLowerCase().includes(q),
      }))
      .slice(0, 20);
  }, [query, blocks]);

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
      <div className="relative w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800">
          <Search className="w-4 h-4 text-zinc-500" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索 Block 标题和内容..."
            className="flex-1 bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
          />
          <button onClick={onClose} className="p-1 hover:bg-zinc-800 rounded text-zinc-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-[50vh] overflow-y-auto">
          {results.length === 0 && query.trim() && (
            <div className="px-4 py-8 text-center text-sm text-zinc-600">未找到匹配内容</div>
          )}
          {results.map(({ block, preview, matchedTitle }) => (
            <button
              key={block.id}
              onClick={() => handleSelect(block.id)}
              className="w-full text-left px-4 py-3 hover:bg-zinc-800/50 border-b border-zinc-800/50 last:border-0 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-3.5 h-3.5 text-zinc-500" />
                <span className="text-xs text-zinc-500 capitalize">{block.type}</span>
                {matchedTitle && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/15 text-blue-400 rounded">标题匹配</span>
                )}
              </div>
              {block.title && (
                <p className="text-xs text-zinc-400 mb-0.5 font-medium">{block.title}</p>
              )}
              <p className="text-sm text-zinc-300 line-clamp-2">{preview}</p>
            </button>
          ))}
        </div>

        <div className="px-4 py-2 bg-zinc-950 border-t border-zinc-800 text-xs text-zinc-600 flex justify-between">
          <span>{results.length} 个结果</span>
          <span>按 Esc 关闭</span>
        </div>
      </div>
    </div>
  );
}
