'use client';

import { useBlockStore } from '@/store/blockStore';

interface QuoteBlockProps {
  block: {
    id: string;
    content: string;
  };
}

export default function QuoteBlock({ block }: QuoteBlockProps) {
  const updateBlock = useBlockStore((state) => state.updateBlock);

  return (
    <div className="flex gap-3 py-1">
      <div className="w-1 bg-blue-500/60 rounded-full flex-shrink-0" />
      <div
        className="flex-1 text-zinc-400 italic text-sm leading-relaxed outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-zinc-700"
        contentEditable
        suppressContentEditableWarning
        data-placeholder="输入引用内容..."
        onBlur={(e) => updateBlock(block.id, { content: e.currentTarget.innerText })}
        dangerouslySetInnerHTML={{ __html: block.content.replace(/\n/g, '<br/>') }}
      />
    </div>
  );
}
