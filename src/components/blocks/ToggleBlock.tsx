'use client';

import { useBlockStore } from '@/store/blockStore';
import { ChevronRight, ChevronDown, Layers } from 'lucide-react';
import type { Block } from '@/types/block';

interface ToggleBlockProps {
  block: Block;
  childrenSlot?: React.ReactNode;
  childCount?: number;
}

export default function ToggleBlock({ block, childrenSlot, childCount = 0 }: ToggleBlockProps) {
  const updateBlock = useBlockStore((state) => state.updateBlock);
  const isExpanded = block.meta?.expanded ?? true;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newExpanded = !isExpanded;
    updateBlock(block.id, { meta: { ...block.meta, expanded: newExpanded } });
  };

  return (
    <div className="space-y-1 w-full">
      <div className="flex items-center gap-2 w-full text-left group">
        <button
          type="button"
          onClick={handleToggle}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors text-zinc-500 hover:text-blue-500 dark:hover:text-blue-400"
          title={isExpanded ? '点击折叠' : '点击展开'}
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 transition-transform" />
          ) : (
            <ChevronRight className="w-4 h-4 transition-transform" />
          )}
        </button>
        <input
          className="flex-1 text-sm font-medium text-gray-800 dark:text-zinc-200 outline-none bg-transparent placeholder:text-gray-400 dark:placeholder:text-zinc-600"
          placeholder="折叠标题..."
          value={block.content || ''}
          onChange={(e) => {
            const val = e.target.value;
            updateBlock(block.id, {
              content: val,
              title: block.title ? block.title : val,
            });
          }}
          onMouseDown={(e) => e.stopPropagation()}
        />
        {!isExpanded && childCount > 0 && (
          <span className="text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-900/40 px-2 py-0.5 rounded-full font-mono shrink-0 select-none flex items-center gap-1">
            <Layers className="w-2.5 h-2.5" />
            <span>{childCount} 个子 Block</span>
          </span>
        )}
      </div>

      {isExpanded && (
        <div className="pl-5 py-2 border-l-2 border-blue-400/40 dark:border-blue-500/40 ml-2 space-y-2 mt-1">
          {/* 折叠正文区域：用户可直接输入笔记或说明文字 */}
          <textarea
            value={block.meta?.details || ''}
            onChange={(e) =>
              updateBlock(block.id, {
                meta: { ...block.meta, details: e.target.value },
              })
            }
            placeholder="输入折叠内容详情，或将其他 Block 拖入此卡片作为子 Block 嵌套..."
            rows={block.meta?.details || !childrenSlot ? 2 : 1}
            className="w-full text-xs text-gray-700 dark:text-zinc-300 outline-none bg-transparent resize-y placeholder:text-gray-400 dark:placeholder:text-zinc-600 font-normal leading-relaxed"
            onMouseDown={(e) => e.stopPropagation()}
          />

          {/* 嵌套子 Block 插槽 */}
          {childrenSlot && (
            <div className="mt-2 pt-2 border-t border-gray-100 dark:border-zinc-800/80">
              <div className="flex items-center justify-between text-[10px] text-[#3370ff] dark:text-[#4b85ff] font-medium mb-1.5 select-none">
                <span className="flex items-center gap-1">
                  <Layers className="w-3 h-3" />
                  <span>嵌套子 Block ({childCount})</span>
                </span>
                <span className="text-[9px] text-[#8f959e] dark:text-[#6b7280]">
                  已随折叠块联动收展
                </span>
              </div>
              <div className="space-y-2">
                {childrenSlot}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
