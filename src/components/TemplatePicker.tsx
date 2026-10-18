'use client';

import { useState, useEffect, useRef } from 'react';
import { X, FileText } from 'lucide-react';
import { BLOCK_TEMPLATES } from '@/store/blockStore';

interface TemplatePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (templateId: string) => void;
}

export default function TemplatePicker({ isOpen, onClose, onSelect }: TemplatePickerProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose(); }
      if (event.key === 'Tab') {
        const buttons = dialogRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
        if (!buttons?.length) return;
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', close, true);
    return () => { window.removeEventListener('keydown', close, true); if (previous?.isConnected) previous.focus(); };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="template-picker-title" className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-zinc-800">
          <div>
            <h2 id="template-picker-title" className="text-sm font-semibold text-gray-900 dark:text-zinc-100">选择模板</h2>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">选择一个预设模板快速创建页面</p>
          </div>
          <button onClick={onClose} aria-label="关闭模板选择" className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg text-gray-400 dark:text-zinc-500 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {BLOCK_TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => { onSelect(template.id); onClose(); }}
              onMouseEnter={() => setHoveredId(template.id)}
              onMouseLeave={() => setHoveredId(null)}
              className={`relative text-left p-4 rounded-xl border transition-all ${
                hoveredId === template.id
                  ? 'border-blue-400/50 dark:border-blue-500/40 bg-blue-50/50 dark:bg-blue-500/5 shadow-lg shadow-blue-500/5'
                  : 'border-gray-200 dark:border-zinc-700 bg-gray-50/50 dark:bg-zinc-900 hover:border-gray-300 dark:hover:border-zinc-600'
              }`}
            >
              <div className="text-2xl mb-2">{template.icon}</div>
              <div className="text-sm font-medium text-gray-900 dark:text-zinc-100">{template.name}</div>
              <div className="text-xs text-gray-500 dark:text-zinc-400 mt-1 line-clamp-2">{template.description}</div>
              <div className="flex items-center gap-1 mt-2 text-[10px] text-gray-400 dark:text-zinc-500">
                <FileText className="w-3 h-3" />
                {template.blocks.length} 个 Block
              </div>
            </button>
          ))}
        </div>
        <div className="flex justify-end border-t border-gray-200 dark:border-zinc-800 px-5 py-3">
          <button onClick={onClose} className="rounded-lg border border-gray-200 dark:border-zinc-700 px-4 py-2 text-sm text-gray-600 dark:text-zinc-300">取消</button>
        </div>
      </div>
    </div>
  );
}
