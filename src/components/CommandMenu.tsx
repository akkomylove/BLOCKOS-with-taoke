'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import {
  Type,
  CheckSquare,
  Quote,
  ChevronRight,
  Minus,
  Code,
  Table,
  Bookmark,
  Sigma,
  GitBranch,
  Network,
  Palette,
  ImageIcon,
  Lightbulb,
  Clock,
  Search,
  Sparkles,
} from 'lucide-react';
import type { BlockType } from '@/types/block';
import { BLOCK_CATEGORIES, type BlockCategoryItem } from '@/lib/block-categories';

interface CommandMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (type: BlockType) => void;
  position: { top: number; left: number };
}

const BLOCK_ICONS: Record<BlockType, React.ReactNode> = {
  text: <Type className="w-4 h-4 text-sky-500" />,
  todo: <CheckSquare className="w-4 h-4 text-emerald-500" />,
  quote: <Quote className="w-4 h-4 text-slate-500" />,
  toggle: <ChevronRight className="w-4 h-4 text-amber-500" />,
  divider: <Minus className="w-4 h-4 text-zinc-400" />,
  code: <Code className="w-4 h-4 text-purple-500" />,
  table: <Table className="w-4 h-4 text-blue-500" />,
  bookmark: <Bookmark className="w-4 h-4 text-indigo-500" />,
  math: <Sigma className="w-4 h-4 text-rose-500" />,
  mindmap: <GitBranch className="w-4 h-4 text-teal-500" />,
  mermaid: <Network className="w-4 h-4 text-cyan-500" />,
  whiteboard: <Palette className="w-4 h-4 text-orange-500" />,
  media: <ImageIcon className="w-4 h-4 text-violet-500" />,
  callout: <Lightbulb className="w-4 h-4 text-amber-400" />,
  countdown: <Clock className="w-4 h-4 text-emerald-400" />,
};

export default function CommandMenu({ isOpen, onClose, onSelect, position }: CommandMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeIndex, setActiveIndex] = useState(0);

  // Grouped and filtered items
  const displayCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    return BLOCK_CATEGORIES.map((cat) => {
      if (selectedCategory !== 'all' && cat.id !== selectedCategory) {
        return null;
      }
      const matchedItems = cat.items.filter((item) => {
        if (!q) return true;
        return (
          item.label.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.type.toLowerCase().includes(q) ||
          cat.title.toLowerCase().includes(q)
        );
      });
      if (matchedItems.length === 0) return null;
      return {
        ...cat,
        items: matchedItems,
      };
    }).filter(Boolean) as typeof BLOCK_CATEGORIES;
  }, [search, selectedCategory]);

  const flatVisibleItems: BlockCategoryItem[] = useMemo(() => {
    return displayCategories.flatMap((c) => c.items);
  }, [displayCategories]);

  useEffect(() => {
    if (isOpen) {
      setActiveIndex(0);
      setSearch('');
      setSelectedCategory('all');
    }
  }, [isOpen]);

  // Adjust activeIndex if out of bounds
  useEffect(() => {
    if (activeIndex >= flatVisibleItems.length && flatVisibleItems.length > 0) {
      setActiveIndex(0);
    }
  }, [flatVisibleItems.length, activeIndex]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % (flatVisibleItems.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) => (prev - 1 + flatVisibleItems.length) % (flatVisibleItems.length || 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const target = flatVisibleItems[activeIndex];
        if (target) {
          onSelect(target.type);
          onClose();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeIndex, flatVisibleItems, onSelect, onClose]);

  if (!isOpen) return null;

  let currentIndexTracker = 0;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 w-80 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-gray-200/80 dark:border-zinc-700/80 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden animate-scale-in text-gray-900 dark:text-zinc-100 flex flex-col max-h-[460px]"
      style={{ top: position.top, left: position.left }}
    >
      {/* Search Bar */}
      <div className="p-3 border-b border-gray-200/70 dark:border-zinc-800/80 flex items-center gap-2 bg-gray-50/50 dark:bg-zinc-900/50">
        <Search className="w-4 h-4 text-gray-400 dark:text-zinc-500 shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setActiveIndex(0);
          }}
          placeholder="搜索 Block 类型 (如: 倒计时, 流程图, 提示)..."
          className="w-full bg-transparent outline-none text-xs text-gray-900 dark:text-zinc-200 placeholder-gray-400 dark:placeholder-zinc-500"
          autoFocus
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300"
          >
            清除
          </button>
        )}
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-1 px-2.5 py-1.5 border-b border-gray-100 dark:border-zinc-800 overflow-x-auto no-scrollbar text-[11px]">
        {[
          { id: 'all', label: '全部' },
          { id: 'basic', label: '基础' },
          { id: 'data', label: '数据' },
          { id: 'visual', label: '可视化' },
          { id: 'widget', label: '组件' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setSelectedCategory(tab.id);
              setActiveIndex(0);
            }}
            className={`px-2 py-0.5 rounded-md whitespace-nowrap transition-colors ${
              selectedCategory === tab.id
                ? 'bg-blue-500 text-white font-medium shadow-xs'
                : 'text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grouped Block List */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-2">
        {displayCategories.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-400 dark:text-zinc-500">
            未找到匹配的 Block 类型
          </div>
        ) : (
          displayCategories.map((category) => (
            <div key={category.id} className="space-y-0.5">
              <div className="px-2.5 py-1 text-[10px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-wider flex items-center justify-between">
                <span>{category.title}</span>
                <span className="text-[9px] font-normal text-gray-400/80 lowercase">{category.items.length} 项</span>
              </div>
              {category.items.map((item) => {
                const itemIndex = currentIndexTracker++;
                const isSelected = itemIndex === activeIndex;

                return (
                  <button
                    key={item.type}
                    onClick={() => {
                      onSelect(item.type);
                      onClose();
                    }}
                    onMouseEnter={() => setActiveIndex(itemIndex)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-all text-left ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 shadow-xs'
                        : 'hover:bg-gray-100/60 dark:hover:bg-zinc-800/60 text-gray-800 dark:text-zinc-200'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                        isSelected
                          ? 'bg-white dark:bg-zinc-800 border-blue-200 dark:border-blue-800 shadow-xs'
                          : 'bg-gray-50 dark:bg-zinc-800/70 border-gray-200/60 dark:border-zinc-700/60'
                      }`}
                    >
                      {BLOCK_ICONS[item.type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium truncate">{item.label}</span>
                        {item.badge && (
                          <span className="px-1 py-0.2 text-[9px] font-semibold rounded bg-gradient-to-r from-blue-500 to-indigo-500 text-white shrink-0">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-400 dark:text-zinc-500 truncate leading-tight">
                        {item.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* Footer shortcut helper */}
      <div className="px-3 py-1.5 border-t border-gray-100 dark:border-zinc-800 bg-gray-50/70 dark:bg-zinc-900/70 text-[10px] text-gray-400 dark:text-zinc-500 flex items-center justify-between">
        <span>↑↓ 切换 · Enter 确认创建</span>
        <span className="flex items-center gap-1">
          <Sparkles className="w-2.5 h-2.5 text-blue-500" />
          <span>飞书式多维分类</span>
        </span>
      </div>
    </div>
  );
}
