'use client';

import { useState } from 'react';
import { useBlockStore } from '@/store/blockStore';
import { ChevronRight, ChevronDown } from 'lucide-react';

interface ToggleBlockProps {
  block: {
    id: string;
    content: string;
    meta: { expanded?: boolean };
  };
}

export default function ToggleBlock({ block }: ToggleBlockProps) {
  const updateBlock = useBlockStore((state) => state.updateBlock);
  const [isExpanded, setIsExpanded] = useState(block.meta.expanded ?? false);

  const handleToggle = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    updateBlock(block.id, { meta: { ...block.meta, expanded: newExpanded } });
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 w-full text-left group">
        <button
          type="button"
          onClick={handleToggle}
          className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
          title={isExpanded ? '折叠' : '展开'}
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
          ) : (
            <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
          )}
        </button>
        <input
          className="flex-1 text-sm font-medium text-gray-800 dark:text-zinc-200 outline-none bg-transparent placeholder:text-gray-400 dark:placeholder:text-zinc-600"
          placeholder="折叠标题..."
          value={block.content || ''}
          onChange={(e) => updateBlock(block.id, { content: e.target.value })}
        />
      </div>
      {isExpanded && (
        <div className="pl-6 py-2 border-l border-gray-200 dark:border-zinc-800 ml-2 text-gray-500 dark:text-zinc-400 text-sm">
          <span className="text-gray-400 dark:text-zinc-600 italic">（折叠内容区域 - 后续支持嵌套 Block）</span>
        </div>
      )}
    </div>
  );
}
