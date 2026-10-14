'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Search, Tag, Check, Sparkles } from 'lucide-react';

export interface PresetTag {
  name: string;
  color: string;
  bg: string;
  text: string;
  darkBg: string;
  darkText: string;
}

export const PRESET_TAGS: PresetTag[] = [
  { name: '工作', color: '#3b82f6', bg: 'bg-blue-100', text: 'text-blue-700', darkBg: 'dark:bg-blue-500/20', darkText: 'dark:text-blue-300' },
  { name: '个人', color: '#22c55e', bg: 'bg-green-100', text: 'text-green-700', darkBg: 'dark:bg-green-500/20', darkText: 'dark:text-green-300' },
  { name: '紧急', color: '#ef4444', bg: 'bg-red-100', text: 'text-red-700', darkBg: 'dark:bg-red-500/20', darkText: 'dark:text-red-300' },
  { name: '重要', color: '#f97316', bg: 'bg-orange-100', text: 'text-orange-700', darkBg: 'dark:bg-orange-500/20', darkText: 'dark:text-orange-300' },
  { name: '待办', color: '#f59e0b', bg: 'bg-amber-100', text: 'text-amber-700', darkBg: 'dark:bg-amber-500/20', darkText: 'dark:text-amber-300' },
  { name: '灵感', color: '#a855f7', bg: 'bg-purple-100', text: 'text-purple-700', darkBg: 'dark:bg-purple-500/20', darkText: 'dark:text-purple-300' },
  { name: '笔记', color: '#64748b', bg: 'bg-slate-100', text: 'text-slate-700', darkBg: 'dark:bg-slate-500/20', darkText: 'dark:text-slate-300' },
  { name: '核心', color: '#ec4899', bg: 'bg-pink-100', text: 'text-pink-700', darkBg: 'dark:bg-pink-500/20', darkText: 'dark:text-pink-300' },
  { name: '设计', color: '#06b6d4', bg: 'bg-cyan-100', text: 'text-cyan-700', darkBg: 'dark:bg-cyan-500/20', darkText: 'dark:text-cyan-300' },
  { name: '研发', color: '#6366f1', bg: 'bg-indigo-100', text: 'text-indigo-700', darkBg: 'dark:bg-indigo-500/20', darkText: 'dark:text-indigo-300' },
];

export const CUSTOM_COLORS = [
  '#3b82f6', '#22c55e', '#ef4444', '#f59e0b',
  '#a855f7', '#6366f1', '#06b6d4', '#ec4899',
  '#f97316', '#64748b'
];

export function getTagStyle(tag: string): string {
  const preset = PRESET_TAGS.find((t) => t.name === tag);
  if (preset) return `${preset.bg} ${preset.text} ${preset.darkBg} ${preset.darkText}`;
  return 'bg-gray-100 text-gray-700 dark:bg-zinc-700/60 dark:text-zinc-200';
}

export interface TagWheelPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (tag: string) => void;
  onRemove?: (tag: string) => void;
  existingTags: string[];
  triggerRect?: DOMRect;
}

export default function TagWheelPicker({
  isOpen,
  onClose,
  onSelect,
  onRemove,
  existingTags,
  triggerRect,
}: TagWheelPickerProps) {
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedColor, setSelectedColor] = useState(CUSTOM_COLORS[0]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 60);
    }
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // 过滤后的推荐标签
  const filteredTags = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return PRESET_TAGS;
    return PRESET_TAGS.filter((t) => t.name.toLowerCase().includes(q));
  }, [searchQuery]);

  // 判断是否已完全匹配现有标签
  const hasExactMatch = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return PRESET_TAGS.some((t) => t.name.toLowerCase() === q) ||
      existingTags.some((t) => t.toLowerCase() === q);
  }, [searchQuery, existingTags]);

  if (!isOpen || !mounted) return null;

  // 计算像素级贴合位置（基于 triggerRect，并通过 Portal 挂载到 body，免疫画布一切 CSS transform）
  const popoverWidth = 264;
  const padding = 10;
  let left = triggerRect ? triggerRect.right - popoverWidth : 100;
  if (typeof window !== 'undefined') {
    left = Math.max(padding, Math.min(window.innerWidth - popoverWidth - padding, left));
  }

  let top = triggerRect ? triggerRect.bottom + 6 : 100;
  if (typeof window !== 'undefined' && triggerRect) {
    const spaceBelow = window.innerHeight - triggerRect.bottom;
    if (spaceBelow < 320 && triggerRect.top > 320) {
      top = Math.max(padding, triggerRect.top - 340);
    }
  }

  const handleTagToggle = (tagName: string) => {
    if (existingTags.includes(tagName)) {
      if (onRemove) {
        onRemove(tagName);
      } else {
        onSelect(tagName);
      }
    } else {
      onSelect(tagName);
    }
  };

  const handleCreateCustom = () => {
    const tag = searchQuery.trim();
    if (!tag) return;
    onSelect(tag);
    setSearchQuery('');
  };

  const content = (
    <>
      {/* 全屏透明遮罩用于点击外部快速关闭 */}
      <div
        className="fixed inset-0 z-[190] bg-transparent"
        onClick={onClose}
      />

      {/* 现代悬浮标签面板 */}
      <div
        className="fixed z-[200] bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700/80 rounded-xl shadow-2xl p-3 w-[264px] animate-in fade-in zoom-in-95 duration-100 text-xs"
        style={{ left, top }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100 dark:border-zinc-800">
          <div className="flex items-center gap-1.5 text-gray-800 dark:text-zinc-200 font-semibold text-xs">
            <Tag className="w-3.5 h-3.5 text-blue-500" />
            <span>标签管理</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 搜索与快捷新建输入框 */}
        <div className="relative mb-2.5">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (filteredTags.length > 0 && !hasExactMatch) {
                  handleCreateCustom();
                } else if (filteredTags.length > 0) {
                  handleTagToggle(filteredTags[0].name);
                }
              }
            }}
            placeholder="搜索或新建标签..."
            className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-gray-800 dark:text-zinc-200 outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-zinc-900 transition-all placeholder:text-gray-400 dark:placeholder:text-zinc-500"
          />
        </div>

        {/* 若输入了新标签且未完全匹配，提示一键创建 */}
        {searchQuery.trim() && !hasExactMatch && (
          <div className="mb-2.5 p-2 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/50 rounded-lg space-y-1.5">
            <button
              onClick={handleCreateCustom}
              className="w-full flex items-center justify-between text-left text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline"
            >
              <span className="flex items-center gap-1.5 truncate">
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span>创建标签「{searchQuery.trim()}」</span>
              </span>
              <Sparkles className="w-3 h-3 shrink-0" />
            </button>
            <div className="flex items-center justify-between pt-1 border-t border-blue-200/40 dark:border-blue-800/40">
              <span className="text-[10px] text-gray-500 dark:text-zinc-400">选择色调</span>
              <div className="flex items-center gap-1">
                {CUSTOM_COLORS.slice(0, 5).map((color) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`w-3.5 h-3.5 rounded-full transition-transform ${selectedColor === color ? 'scale-125 ring-2 ring-offset-1 ring-blue-400' : 'hover:scale-110'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 当前已选标签 */}
        {existingTags.length > 0 && (
          <div className="mb-2.5">
            <div className="text-[10px] font-medium text-gray-400 dark:text-zinc-500 mb-1.5 px-0.5">当前已添加</div>
            <div className="flex flex-wrap gap-1">
              {existingTags.map((tag) => (
                <span
                  key={tag}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium ${getTagStyle(tag)}`}
                >
                  <span>{tag}</span>
                  <button
                    onClick={() => onRemove ? onRemove(tag) : onSelect(tag)}
                    className="hover:opacity-75 transition-opacity"
                    title="移除标签"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 预设与常用标签列表 */}
        <div>
          <div className="text-[10px] font-medium text-gray-400 dark:text-zinc-500 mb-1.5 px-0.5">常用标签</div>
          <div className="grid grid-cols-2 gap-1.5 max-h-44 overflow-y-auto overscroll-contain pr-0.5">
            {filteredTags.map((tag) => {
              const isSelected = existingTags.includes(tag.name);
              return (
                <button
                  key={tag.name}
                  onClick={() => handleTagToggle(tag.name)}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs transition-all text-left ${
                    isSelected
                      ? 'bg-blue-50/60 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700/60 text-blue-700 dark:text-blue-300 font-medium'
                      : 'bg-gray-50/70 dark:bg-zinc-800/50 border-gray-200/80 dark:border-zinc-700/60 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="truncate">{tag.name}</span>
                  </span>
                  {isSelected && <Check className="w-3 h-3 text-blue-500 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(content, document.body);
}
