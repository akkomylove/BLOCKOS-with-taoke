'use client';

import { useEffect, useRef, useState } from 'react';
import { Type, CheckSquare, Code, Table, ImageIcon, Quote, ChevronRight, Minus } from 'lucide-react';
import type { BlockType } from '@/types/block';

interface CommandMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (type: BlockType) => void;
  position: { top: number; left: number };
}

const commands: { type: BlockType; label: string; icon: React.ReactNode; description: string }[] = [
  { type: 'text', label: '文本', icon: <Type className="w-4 h-4" />, description: '普通文本块' },
  { type: 'todo', label: '待办', icon: <CheckSquare className="w-4 h-4" />, description: '可勾选的待办事项' },
  { type: 'code', label: '代码', icon: <Code className="w-4 h-4" />, description: '代码块' },
  { type: 'table', label: '表格', icon: <Table className="w-4 h-4" />, description: '数据表格' },
  { type: 'media', label: '媒体', icon: <ImageIcon className="w-4 h-4" />, description: '图片/视频/音频' },
  { type: 'quote', label: '引用', icon: <Quote className="w-4 h-4" />, description: '引用块' },
  { type: 'toggle', label: '折叠', icon: <ChevronRight className="w-4 h-4" />, description: '可折叠内容' },
  { type: 'divider', label: '分割线', icon: <Minus className="w-4 h-4" />, description: '水平分割线' },
];

export default function CommandMenu({ isOpen, onClose, onSelect, position }: CommandMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [search, setSearch] = useState('');

  const filtered = commands.filter((cmd) =>
    cmd.label.includes(search) || cmd.description.includes(search)
  );

  useEffect(() => {
    if (isOpen) {
      setActiveIndex(0);
      setSearch('');
    }
  }, [isOpen]);

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
        setActiveIndex((prev) => (prev + 1) % filtered.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[activeIndex]) {
          onSelect(filtered[activeIndex].type);
          onClose();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeIndex, filtered, onSelect, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 w-64 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-gray-200/50 dark:border-zinc-700/50 rounded-xl shadow-2xl shadow-black/50 overflow-hidden animate-scale-in"
      style={{ top: position.top, left: position.left }}
    >
      <div className="px-3 py-2 border-b border-gray-200/60 dark:border-zinc-800/60">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索 Block 类型..."
          className="w-full bg-transparent outline-none text-sm text-gray-900 dark:text-zinc-200 placeholder-gray-400 dark:placeholder-zinc-600"
          autoFocus
        />
      </div>
      {filtered.map((cmd, i) => (
        <button
          key={cmd.type}
          onClick={() => {
            onSelect(cmd.type);
            onClose();
          }}
          className={`w-full flex items-center gap-3 px-3 py-2.5 transition-colors text-left ${
            i === activeIndex ? 'bg-gray-100/80 dark:bg-zinc-800/80' : 'hover:bg-gray-100/50 dark:hover:bg-zinc-800/50'
          }`}
        >
          <span className={`p-1 rounded ${i === activeIndex ? 'text-blue-500 dark:text-blue-400 bg-blue-500/10' : 'text-gray-400 dark:text-zinc-500'}`}>
            {cmd.icon}
          </span>
          <div className="flex-1">
            <div className="text-sm text-gray-900 dark:text-zinc-200">{cmd.label}</div>
            <div className="text-[11px] text-gray-400 dark:text-zinc-500">{cmd.description}</div>
          </div>
        </button>
      ))}
    </div>
  );
}
