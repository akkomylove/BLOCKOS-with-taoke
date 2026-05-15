'use client';

import { useEffect, useRef } from 'react';
import { FileText, PenTool, MessageCircle, Maximize2, ListTree, GitBranch, HelpCircle, Zap, BarChart3 } from 'lucide-react';
import type { BlockType } from '@/types/block';
import { AI_ACTIONS } from '@/types/block';

interface AIActionMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (action: string) => void;
  blockType: BlockType;
  position: { top: number; left: number };
}

const iconMap: Record<string, React.ReactNode> = {
  FileText: <FileText className="w-4 h-4" />,
  PenTool: <PenTool className="w-4 h-4" />,
  MessageCircle: <MessageCircle className="w-4 h-4" />,
  Maximize2: <Maximize2 className="w-4 h-4" />,
  ListTree: <ListTree className="w-4 h-4" />,
  GitBranch: <GitBranch className="w-4 h-4" />,
  HelpCircle: <HelpCircle className="w-4 h-4" />,
  Zap: <Zap className="w-4 h-4" />,
  BarChart3: <BarChart3 className="w-4 h-4" />,
};

export default function AIActionMenu({ isOpen, onClose, onSelect, blockType, position }: AIActionMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const actions = AI_ACTIONS[blockType] || [];

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

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 w-60 bg-white/90 dark:bg-zinc-900/95 backdrop-blur-xl border border-gray-200 dark:border-zinc-700/50 rounded-xl shadow-2xl shadow-black/50 overflow-hidden animate-scale-in"
      style={{ top: position.top, left: position.left }}
    >
      <div className="px-3 py-2 border-b border-gray-200/60 dark:border-zinc-800/60">
        <span className="text-[11px] text-gray-500 dark:text-zinc-500 font-mono uppercase tracking-wider">AI Actions</span>
      </div>
      {actions.map((action) => (
        <button
          key={action.id}
          onClick={() => {
            onSelect(action.id);
            onClose();
          }}
          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-100/60 dark:hover:bg-zinc-800/60 transition-colors text-left group"
        >
          <span className="p-1 rounded text-gray-500 dark:text-zinc-500 group-hover:text-blue-400 group-hover:bg-blue-500/10 transition-colors">
            {iconMap[action.icon]}
          </span>
          <div>
            <div className="text-sm text-gray-800 dark:text-zinc-200">{action.label}</div>
            <div className="text-[11px] text-gray-500 dark:text-zinc-500">{action.description}</div>
          </div>
        </button>
      ))}
    </div>
  );
}
