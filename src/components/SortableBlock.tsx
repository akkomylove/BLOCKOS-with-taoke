'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Sparkles, Link2, X } from 'lucide-react';
import BlockRenderer from './BlockRenderer';
import type { Block, BlockType } from '@/types/block';
import { useBlockStore } from '@/store/blockStore';

interface SortableBlockProps {
  block: Block;
  isSelected: boolean;
  onSelect: (id: string, multi: boolean) => void;
  onOpenAIMenu?: (blockId: string, blockType: BlockType, position: { top: number; left: number }) => void;
  isLinkTarget?: boolean;
  isLinkSource?: boolean;
  childrenSlot?: React.ReactNode;
  childCount?: number;
}

export default function SortableBlock({
  block,
  isSelected,
  onSelect,
  onOpenAIMenu,
  isLinkTarget,
  isLinkSource,
  childrenSlot,
  childCount,
}: SortableBlockProps) {
  const removeLink = useBlockStore((state) => state.removeLink);
  const allBlocks = useBlockStore((state) => state.blocks);

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
      className={`group relative flex items-start gap-1.5 px-3 py-2 rounded-lg transition-all duration-150 h-full ${
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
        aria-label={`拖动卡片「${block.title || "未命名"}」`}
        className="mt-1.5 opacity-0 group-hover:opacity-60 hover:!opacity-100 cursor-grab active:cursor-grabbing text-zinc-500 hover:text-zinc-300 transition-all duration-150"
      >
        <GripVertical className="w-3.5 h-3.5" />
      </div>

      <div className="flex-1 min-w-0 flex flex-col h-full">
        <BlockRenderer
          block={block}
          isSelected={isSelected}
          childrenSlot={childrenSlot}
          childCount={childCount}
        />
        {block.meta.links && block.meta.links.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mt-2 pt-1.5 border-t border-gray-100 dark:border-zinc-800/60">
            <div className="flex items-center gap-1 text-[11px] text-blue-500 dark:text-blue-400 font-medium mr-0.5">
              <Link2 className="w-3 h-3" />
              <span>关联:</span>
            </div>
            {block.meta.links.map((targetId) => {
              const target = allBlocks.find((b) => b.id === targetId);
              const label = target ? (target.title || `${target.type} Block`) : '目标 Block';
              return (
                <span
                  key={targetId}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-blue-50 dark:bg-zinc-800/90 text-blue-600 dark:text-blue-300 border border-blue-200/80 dark:border-zinc-700 max-w-[150px]"
                  title={`关联至「${label}」，点击右侧 × 可断开`}
                >
                  <span className="truncate">{label}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeLink(block.id, targetId);
                    }}
                    className="hover:bg-red-100 dark:hover:bg-red-900/50 rounded p-0.5 text-blue-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                    title="断开此关联"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              );
            })}
          </div>
        )}
      </div>

      <button
        onClick={handleAIButtonClick}
        data-tour="block-ai-btn"
        title="调用 AI"
        className="mt-1.5 opacity-0 group-hover:opacity-60 hover:!opacity-100 text-zinc-500 hover:text-blue-400 transition-all duration-150"
      >
        <Sparkles className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
