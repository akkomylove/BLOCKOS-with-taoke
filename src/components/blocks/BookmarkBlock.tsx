'use client';

import { useState } from 'react';
import { ExternalLink, Globe, Copy, Check, Edit2 } from 'lucide-react';
import { useBlockStore } from '@/store/blockStore';
import type { Block } from '@/types/block';

interface BookmarkBlockProps {
  block: Block;
}

export default function BookmarkBlock({ block }: BookmarkBlockProps) {
  const updateBlock = useBlockStore((state) => state.updateBlock);
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const url = block.meta.bookmarkUrl || block.content || 'https://github.com';
  const title = block.meta.bookmarkTitle || block.title || '外部文档与原型链接';
  const description = block.meta.bookmarkDesc || '点击卡片右侧按钮快速在新标签页打开外部资源链接';

  let hostname = '';
  try {
    hostname = new URL(url).hostname;
  } catch {
    hostname = url;
  }

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (url.startsWith('http://') || url.startsWith('https://')) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleSaveEdit = (newUrl: string, newTitle: string, newDesc: string) => {
    updateBlock(block.id, {
      content: newUrl,
      title: newTitle,
      meta: {
        ...block.meta,
        bookmarkUrl: newUrl,
        bookmarkTitle: newTitle,
        bookmarkDesc: newDesc,
      },
    });
    setIsEditing(false);
  };

  return (
    <div className="relative p-3 bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 shadow-xs hover:border-blue-400/60 dark:hover:border-blue-500/50 transition-all w-full group">
      {!isEditing ? (
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-800/60 flex items-center justify-center shrink-0 text-blue-600 dark:text-blue-400 mt-0.5">
              <Globe className="w-4 h-4" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-gray-900 dark:text-zinc-100 truncate mb-0.5">
                {title}
              </div>
              <div className="text-[11px] text-gray-500 dark:text-zinc-400 line-clamp-2 leading-relaxed mb-1.5">
                {description}
              </div>
              <div className="text-[10px] text-blue-500 dark:text-blue-400 font-mono truncate">
                {hostname}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0 pt-0.5">
            <button
              type="button"
              onClick={handleCopy}
              className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded transition-colors"
              title="复制链接"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded transition-colors"
              title="编辑卡片内容"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleOpen}
              className="p-1.5 text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded transition-colors"
              title="在新标签页打开"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <EditBookmarkForm
          initialUrl={url}
          initialTitle={title}
          initialDesc={description}
          onSave={handleSaveEdit}
          onCancel={() => setIsEditing(false)}
        />
      )}
    </div>
  );
}

function EditBookmarkForm({
  initialUrl,
  initialTitle,
  initialDesc,
  onSave,
  onCancel,
}: {
  initialUrl: string;
  initialTitle: string;
  initialDesc: string;
  onSave: (url: string, title: string, desc: string) => void;
  onCancel: () => void;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [title, setTitle] = useState(initialTitle);
  const [desc, setDesc] = useState(initialDesc);

  return (
    <div data-ui-control className="space-y-2 text-xs" onClick={(e) => e.stopPropagation()}>
      <div>
        <label className="text-[10px] text-gray-400 block mb-0.5">链接地址 (URL)</label>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
          className="w-full px-2 py-1 rounded border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 text-xs outline-none"
        />
      </div>
      <div>
        <label className="text-[10px] text-gray-400 block mb-0.5">卡片标题</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="输入书签标题..."
          className="w-full px-2 py-1 rounded border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 text-xs outline-none"
        />
      </div>
      <div>
        <label className="text-[10px] text-gray-400 block mb-0.5">描述说明</label>
        <input
          type="text"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="输入外链简要描述..."
          className="w-full px-2 py-1 rounded border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 text-xs outline-none"
        />
      </div>
      <div className="flex justify-end gap-1.5 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="px-2.5 py-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded transition-colors text-xs"
        >
          取消
        </button>
        <button
          type="button"
          onClick={() => onSave(url, title, desc)}
          className="px-2.5 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-xs font-medium"
        >
          保存
        </button>
      </div>
    </div>
  );
}
