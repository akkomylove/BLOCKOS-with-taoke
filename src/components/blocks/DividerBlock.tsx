'use client';

interface DividerBlockProps {
  block: {
    id: string;
    title?: string;
  };
  updateBlock: (id: string, updates: Partial<{ title: string }>) => void;
}

export default function DividerBlock({ block, updateBlock }: DividerBlockProps) {
  return (
    <div className="flex items-center gap-3 py-2" data-block-id={block.id}>
      <div className="flex-1 h-px bg-gray-200 dark:bg-zinc-800" />
      <input
        value={block.title || ''}
        onChange={(e) => updateBlock(block.id, { title: e.target.value })}
        placeholder="分隔符标题（可选）"
        className="bg-transparent outline-none text-xs text-gray-500 dark:text-zinc-500 placeholder:text-gray-400 dark:placeholder:text-zinc-700 text-center"
      />
      <div className="flex-1 h-px bg-gray-200 dark:bg-zinc-800" />
    </div>
  );
}
