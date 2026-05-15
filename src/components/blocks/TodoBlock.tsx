'use client';

import { useRef, useEffect, useCallback } from 'react';
import { useBlockStore } from '@/store/blockStore';
import type { Block } from '@/types/block';

interface TodoBlockProps {
  block: Block;
  isSelected: boolean;
}

export default function TodoBlock({ block, isSelected }: TodoBlockProps) {
  const updateBlock = useBlockStore((state) => state.updateBlock);
  const deleteBlock = useBlockStore((state) => state.deleteBlock);
  const textRef = useRef<HTMLSpanElement>(null);

  const isChecked = !!block.meta.checked;

  useEffect(() => {
    if (textRef.current && textRef.current.innerText !== block.content) {
      textRef.current.innerText = block.content;
    }
  }, [block.content]);

  const handleInput = useCallback(() => {
    if (textRef.current) {
      updateBlock(block.id, { content: textRef.current.innerText });
    }
  }, [block.id, updateBlock]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Backspace' && textRef.current?.innerText === '') {
        e.preventDefault();
        deleteBlock(block.id);
      }
    },
    [block.id, deleteBlock]
  );

  const handleCheck = useCallback(() => {
    updateBlock(block.id, {
      meta: { ...block.meta, checked: !block.meta.checked },
    });
  }, [block.id, block.meta, updateBlock]);

  return (
    <div className="flex items-start gap-3">
      <button
        onClick={handleCheck}
        className={`mt-0.5 flex-shrink-0 w-[18px] h-[18px] rounded border-2 flex items-center justify-center transition-all duration-200 ${
          isChecked
            ? 'bg-blue-500 border-blue-500 animate-check-pop'
            : 'border-gray-400 dark:border-zinc-600 hover:border-gray-300 dark:hover:border-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800'
        }`}
      >
        {isChecked && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>
      <span
        ref={textRef}
        className={`block-content flex-1 outline-none text-sm leading-relaxed transition-all duration-300 ${
          isChecked ? 'line-through text-gray-400 dark:text-zinc-500 animate-strikethrough' : 'text-gray-700 dark:text-zinc-300'
        } ${isSelected ? 'ring-1 ring-blue-500/20 ring-offset-2 ring-offset-white dark:ring-offset-zinc-950 rounded' : ''}`}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        data-block-id={block.id}
        data-placeholder="输入待办事项..."
      />
    </div>
  );
}
