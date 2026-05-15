'use client';

import { useBlockStore } from '@/store/blockStore';

interface QuoteBlockProps {
  block: {
    id: string;
    content: string;
    title?: string;
  };
}

export default function QuoteBlock({ block }: QuoteBlockProps) {
  const updateBlock = useBlockStore((state) => state.updateBlock);

  return (
    <div className="pl-4 border-l-2 border-amber-500/40">
      <textarea
        value={block.content}
        onChange={(e) => updateBlock(block.id, { content: e.target.value })}
        placeholder="在此输入引用内容..."
        className="w-full min-h-[60px] bg-transparent outline-none resize-none text-sm text-gray-700 dark:text-zinc-300 placeholder:text-gray-400 dark:placeholder:text-zinc-600 italic leading-relaxed"
      />
      <input
        value={block.title || ''}
        onChange={(e) => updateBlock(block.id, { title: e.target.value })}
        placeholder="引用来源（可选）"
        className="w-full bg-transparent outline-none text-xs text-gray-500 dark:text-zinc-500 placeholder:text-gray-400 dark:placeholder-zinc-700 mt-1"
      />
    </div>
  );
}
