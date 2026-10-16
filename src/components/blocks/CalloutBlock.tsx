'use client';

import { useState } from 'react';
import { useBlockStore } from '@/store/blockStore';
import type { Block } from '@/types/block';

interface CalloutBlockProps {
  block: Block;
}

const THEMES = {
  info: {
    bg: 'bg-blue-50/70 dark:bg-blue-950/30',
    border: 'border-blue-200/80 dark:border-blue-800/60',
    text: 'text-blue-900 dark:text-blue-200',
    iconDefault: '💡',
    label: '提示',
    ring: 'focus:ring-blue-400/40',
  },
  warning: {
    bg: 'bg-amber-50/70 dark:bg-amber-950/30',
    border: 'border-amber-200/80 dark:border-amber-800/60',
    text: 'text-amber-900 dark:text-amber-200',
    iconDefault: '⚠️',
    label: '注意',
    ring: 'focus:ring-amber-400/40',
  },
  danger: {
    bg: 'bg-rose-50/70 dark:bg-rose-950/30',
    border: 'border-rose-200/80 dark:border-rose-800/60',
    text: 'text-rose-900 dark:text-rose-200',
    iconDefault: '🚨',
    label: '阻断',
    ring: 'focus:ring-rose-400/40',
  },
  success: {
    bg: 'bg-emerald-50/70 dark:bg-emerald-950/30',
    border: 'border-emerald-200/80 dark:border-emerald-800/60',
    text: 'text-emerald-900 dark:text-emerald-200',
    iconDefault: '✅',
    label: '达成',
    ring: 'focus:ring-emerald-400/40',
  },
  purple: {
    bg: 'bg-purple-50/70 dark:bg-purple-950/30',
    border: 'border-purple-200/80 dark:border-purple-800/60',
    text: 'text-purple-900 dark:text-purple-200',
    iconDefault: '🔮',
    label: '洞察',
    ring: 'focus:ring-purple-400/40',
  },
};

const ICONS = ['💡', '⚠️', '🚨', '✅', '🔮', '📌', '🔥', '🚀', '🎯', '📝'];

export default function CalloutBlock({ block }: CalloutBlockProps) {
  const updateBlock = useBlockStore((state) => state.updateBlock);
  const [showPicker, setShowPicker] = useState(false);

  const themeKey = (block.meta.calloutTheme as keyof typeof THEMES) || 'info';
  const theme = THEMES[themeKey] || THEMES.info;
  const currentIcon = block.meta.calloutIcon || theme.iconDefault;

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateBlock(block.id, { content: e.target.value });
  };

  const handleSelectTheme = (newTheme: keyof typeof THEMES) => {
    updateBlock(block.id, {
      meta: {
        ...block.meta,
        calloutTheme: newTheme,
        calloutIcon: THEMES[newTheme].iconDefault,
      },
    });
  };

  const handleSelectIcon = (icon: string) => {
    updateBlock(block.id, {
      meta: {
        ...block.meta,
        calloutIcon: icon,
      },
    });
    setShowPicker(false);
  };

  return (
    <div className={`relative flex items-start gap-3 p-3.5 rounded-lg border transition-all ${theme.bg} ${theme.border} w-full`}>
      {/* 图标与主题切换气泡 */}
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowPicker(!showPicker);
          }}
          className="w-8 h-8 rounded-md bg-white/80 dark:bg-zinc-800/80 shadow-xs border border-black/5 dark:border-white/10 flex items-center justify-center text-lg hover:scale-105 active:scale-95 transition-transform"
          title="点击切换图标与高亮主题"
        >
          {currentIcon}
        </button>

        {showPicker && (
          <div
            data-ui-control
            className="absolute left-0 top-10 z-50 p-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl shadow-xl w-60"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 语义主题切换 */}
            <div className="text-[11px] font-medium text-gray-500 dark:text-zinc-400 mb-1.5">语义类型</div>
            <div className="grid grid-cols-5 gap-1 mb-2.5 pb-2 border-b border-gray-100 dark:border-zinc-800">
              {(Object.keys(THEMES) as Array<keyof typeof THEMES>).map((key) => {
                const item = THEMES[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleSelectTheme(key)}
                    className={`py-1 text-[11px] rounded flex flex-col items-center gap-0.5 border transition-all ${
                      themeKey === key
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 font-medium'
                        : 'border-transparent hover:bg-gray-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <span>{item.iconDefault}</span>
                    <span className="text-[10px] text-gray-600 dark:text-zinc-400">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* 常用 Emoji 选择 */}
            <div className="text-[11px] font-medium text-gray-500 dark:text-zinc-400 mb-1.5">切换图标</div>
            <div className="grid grid-cols-5 gap-1">
              {ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => handleSelectIcon(icon)}
                  className={`h-7 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 flex items-center justify-center text-sm transition-colors ${
                    currentIcon === icon ? 'bg-gray-200 dark:bg-zinc-700' : ''
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 文本内容编辑区域 */}
      <div className="flex-1 min-w-0">
        <textarea
          value={block.content}
          onChange={handleContentChange}
          placeholder="输入重要提示、注意事项或交付准则..."
          rows={2}
          className={`w-full bg-transparent resize-none outline-none text-xs leading-relaxed ${theme.text} placeholder:text-gray-400 dark:placeholder:text-zinc-500`}
          style={{ minHeight: '48px' }}
        />
      </div>
    </div>
  );
}
