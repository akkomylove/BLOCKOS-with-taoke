'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Sparkles, Link2 } from 'lucide-react';
import BlockRenderer from './BlockRenderer';
import type { Block, BlockType } from '@/types/block';

interface SortableBlockProps {
  block: Block;
  isSelected: boolean;
  onSelect: (id: string, multi: boolean) => void;
  onOpenAIMenu?: (blockId: string, blockType: BlockType, position: { top: number; left: number }) => void;
  isLinkTarget?: boolean;
  isLinkSource?: boolean;
}

export default function SortableBlock({
  block,
  isSelected,
  onSelect,
  onOpenAIMenu,
  isLinkTarget,
  isLinkSource,
}: SortableBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleClick = (e: React.MouseEvent) => {
    const multi = e.shiftKey || e.metaKey || e.ctrlKey;
    onSelect(block.id, multi);
  };

  const handleAIButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    onOpenAIMenu?.(block.id, block.type, { top: rect.bottom + 4, left: Math.max(8, rect.left - 220) });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex items-start gap-1.5 px-3 py-2 rounded-lg transition-all duration-150 ${
        isSelected
          ? 'bg-gray-200/60 dark:bg-zinc-700/60 border-l-2 border-blue-400'
          : 'hover:bg-gray-100/60 dark:hover:bg-zinc-800/60 border-l-2 border-transparent'
      } ${isDragging ? 'z-50 opacity-60 shadow-xl shadow-black/30' : ''} ${
        isLinkTarget ? 'ring-1 ring-blue-400/50 cursor-pointer hover:bg-blue-500/10' : ''
      } ${
        isLinkSource ? 'ring-1 ring-emerald-400/50' : ''
      }`}
      onClick={handleClick}
      data-block-id={block.id}
    >
      <div
        {...attributes}
        {...listeners}
        className="mt-1.5 opacity-0 group-hover:opacity-60 hover:!opacity-100 cursor-grab active:cursor-grabbing text-zinc-500 hover:text-zinc-300 transition-all duration-150"
      >
        <GripVertical className="w-3.5 h-3.5" />
      </div>

      <div className="flex-1 min-w-0">
        <BlockRenderer block={block} isSelected={isSelected} />
        {block.meta.links && block.meta.links.length > 0 && (
          <div className="flex items-center gap-1.5 mt-1.5">
            <Link2 className="w-3 h-3 text-blue-400/70" />
            <span className="text-[11px] text-blue-400/70 font-mono">
              {block.meta.links.length} link{block.meta.links.length > 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      <button
        onClick={handleAIButtonClick}
        className="mt-1.5 opacity-0 group-hover:opacity-60 hover:!opacity-100 text-zinc-500 hover:text-blue-400 transition-all duration-150"
      >
        <Sparkles className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
