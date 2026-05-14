'use client';

interface DividerBlockProps {
  block: {
    id: string;
  };
}

export default function DividerBlock({ block }: DividerBlockProps) {
  return (
    <div className="py-2" data-block-id={block.id}>
      <div className="h-px bg-zinc-800" />
    </div>
  );
}
