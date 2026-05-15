'use client';

import TextBlock from './blocks/TextBlock';
import TodoBlock from './blocks/TodoBlock';
import CodeBlock from './blocks/CodeBlock';
import TableBlock from './blocks/TableBlock';
import MediaBlock from './blocks/MediaBlock';
import QuoteBlock from './blocks/QuoteBlock';
import ToggleBlock from './blocks/ToggleBlock';
import DividerBlock from './blocks/DividerBlock';
import WhiteboardBlock from './blocks/WhiteboardBlock';
import MindmapBlock from './blocks/MindmapBlock';
import MathBlock from './blocks/MathBlock';
import { useBlockStore } from '@/store/blockStore';
import type { Block } from '@/types/block';

interface BlockRendererProps {
  block: Block;
  isSelected: boolean;
}

export default function BlockRenderer({ block, isSelected }: BlockRendererProps) {
  const updateBlock = useBlockStore((state) => state.updateBlock);

  switch (block.type) {
    case 'text':
      return (
        <TextBlock
          content={block.content}
          onChange={(content) => updateBlock(block.id, { content })}
          fontSize={block.meta.fontSize}
          fontFamily={block.meta.fontFamily}
          fontColor={block.meta.fontColor}
          fontWeight={block.meta.fontWeight}
          fontStyle={block.meta.fontStyle}
          textDecoration={block.meta.textDecoration}
        />
      );
    case 'todo':
      return <TodoBlock block={block} isSelected={isSelected} />;
    case 'code':
      return (
        <CodeBlock
          content={block.content}
          language={block.meta.language}
          onChange={(content, language) => updateBlock(block.id, { content, meta: { ...block.meta, language } })}
        />
      );
    case 'table':
      return (
        <TableBlock
          data={JSON.parse(block.content || '{"columns":[],"rows":[]}')}
          onChange={(data) => updateBlock(block.id, { content: JSON.stringify(data) })}
        />
      );
    case 'media':
      return (
        <MediaBlock
          content={block.content}
          caption={block.meta.caption}
          onChange={(content, caption) => updateBlock(block.id, { content, meta: { ...block.meta, caption } })}
        />
      );
    case 'quote':
      return <QuoteBlock block={block} />;
    case 'toggle':
      return <ToggleBlock block={block} />;
    case 'divider':
      return <DividerBlock block={block} updateBlock={updateBlock} />;
    case 'whiteboard':
      return (
        <WhiteboardBlock
          content={block.content}
          onChange={(content) => updateBlock(block.id, { content })}
        />
      );
    case 'mindmap':
      return (
        <MindmapBlock
          content={block.content}
          onChange={(content) => updateBlock(block.id, { content })}
        />
      );
    case 'math':
      return (
        <MathBlock
          content={block.content}
          onChange={(content) => updateBlock(block.id, { content })}
        />
      );
    default:
      return (
        <TextBlock
          content={block.content}
          onChange={(content) => updateBlock(block.id, { content })}
        />
      );
  }
}
