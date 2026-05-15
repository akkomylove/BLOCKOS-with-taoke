'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Plus } from 'lucide-react';

export const PRESET_TAGS = [
  { name: '工作', color: '#3b82f6', bg: 'bg-blue-100', text: 'text-blue-700', darkBg: 'dark:bg-blue-500/20', darkText: 'dark:text-blue-300' },
  { name: '个人', color: '#22c55e', bg: 'bg-green-100', text: 'text-green-700', darkBg: 'dark:bg-green-500/20', darkText: 'dark:text-green-300' },
  { name: '重要', color: '#ef4444', bg: 'bg-red-100', text: 'text-red-700', darkBg: 'dark:bg-red-500/20', darkText: 'dark:text-red-300' },
  { name: '待办', color: '#f59e0b', bg: 'bg-amber-100', text: 'text-amber-700', darkBg: 'dark:bg-amber-500/20', darkText: 'dark:text-amber-300' },
  { name: '灵感', color: '#a855f7', bg: 'bg-purple-100', text: 'text-purple-700', darkBg: 'dark:bg-purple-500/20', darkText: 'dark:text-purple-300' },
  { name: '笔记', color: '#6b7280', bg: 'bg-gray-100', text: 'text-gray-700', darkBg: 'dark:bg-zinc-500/20', darkText: 'dark:text-zinc-300' },
];

const CUSTOM_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
  '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6',
  '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#78716c',
];

export function getTagStyle(tag: string): string {
  const preset = PRESET_TAGS.find((t) => t.name === tag);
  if (preset) return `${preset.bg} ${preset.text} ${preset.darkBg} ${preset.darkText}`;
  return 'bg-gray-100 text-gray-700 dark:bg-zinc-500/20 dark:text-zinc-300';
}

interface TagWheelPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (tag: string) => void;
  existingTags: string[];
  triggerRect?: DOMRect;
}

export default function TagWheelPicker({ isOpen, onClose, onSelect, existingTags, triggerRect }: TagWheelPickerProps) {
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customColor, setCustomColor] = useState(CUSTOM_COLORS[0]);
  const inputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showCustom && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [showCustom]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCustomSubmit = () => {
    if (customName.trim()) {
      onSelect(customName.trim());
      setCustomName('');
      setShowCustom(false);
    }
  };

  const WHEEL_SIZE = 180;
  const CENTER = WHEEL_SIZE / 2;
  const RADIUS = 55;
  const SLICE_ANGLE = 360 / 7;

  const slices = [
    ...PRESET_TAGS.map((t) => ({ ...t, type: 'preset' as const })),
    { name: '其他', color: '#9ca3af', bg: 'bg-gray-100', text: 'text-gray-700', darkBg: 'dark:bg-zinc-500/20', darkText: 'dark:text-zinc-300', type: 'custom' as const },
  ];

  const left = triggerRect ? triggerRect.left : 0;
  const top = triggerRect ? triggerRect.bottom + 4 : 0;

  return (
    <div
      ref={pickerRef}
      className="fixed z-[100]"
      style={{ left, top }}
    >
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-2xl shadow-2xl p-4" style={{ width: WHEEL_SIZE + 32 }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] text-gray-500 dark:text-zinc-400 font-medium">选择标签</span>
          <button onClick={onClose} className="p-0.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded text-gray-400 dark:text-zinc-500">
            <X className="w-3 h-3" />
          </button>
        </div>

        {!showCustom ? (
          <div className="relative" style={{ width: WHEEL_SIZE, height: WHEEL_SIZE, margin: '0 auto' }}>
            <svg width={WHEEL_SIZE} height={WHEEL_SIZE} viewBox={`0 0 ${WHEEL_SIZE} ${WHEEL_SIZE}`}>
              {slices.map((slice, i) => {
                const startAngle = (i * SLICE_ANGLE - 90) * (Math.PI / 180);
                const endAngle = ((i + 1) * SLICE_ANGLE - 90) * (Math.PI / 180);
                const x1 = CENTER + RADIUS * Math.cos(startAngle);
                const y1 = CENTER + RADIUS * Math.sin(startAngle);
                const x2 = CENTER + RADIUS * Math.cos(endAngle);
                const y2 = CENTER + RADIUS * Math.sin(endAngle);
                const largeArc = 0;

                const path = `M ${CENTER} ${CENTER} L ${x1} ${y1} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${x2} ${y2} Z`;
                const isExisting = existingTags.includes(slice.name);

                return (
                  <g
                    key={slice.name}
                    onClick={() => {
                      if (isExisting) return;
                      if (slice.type === 'custom') {
                        setShowCustom(true);
                      } else {
                        onSelect(slice.name);
                      }
                    }}
                    className={isExisting ? '' : 'cursor-pointer'}
                    style={{ opacity: isExisting ? 0.25 : 1 }}
                  >
                    <path
                      d={path}
                      fill={slice.color}
                      stroke={isExisting ? '#e5e7eb' : 'white'}
                      strokeWidth={2}
                      className={isExisting ? '' : 'hover:brightness-110 transition-all'}
                    />
                    <text
                      x={CENTER + (RADIUS * 0.65) * Math.cos((startAngle + endAngle) / 2)}
                      y={CENTER + (RADIUS * 0.65) * Math.sin((startAngle + endAngle) / 2)}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill={isExisting ? '#9ca3af' : 'white'}
                      fontSize={isExisting ? 9 : 11}
                      fontWeight={500}
                      style={{ pointerEvents: 'none', textShadow: isExisting ? 'none' : '0 1px 2px rgba(0,0,0,0.3)' }}
                    >
                      {isExisting ? '✓' : slice.name}
                    </text>
                  </g>
                );
              })}
              <circle cx={CENTER} cy={CENTER} r={22} fill="white" className="dark:fill-zinc-800" stroke="#e5e7eb" strokeWidth={1} />
              <text
                x={CENTER}
                y={CENTER}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#9ca3af"
                fontSize={10}
              >
                标签
              </text>
            </svg>
          </div>
        ) : (
          <div className="space-y-3" style={{ width: WHEEL_SIZE }}>
            <div>
              <label className="text-[10px] text-gray-500 dark:text-zinc-400 mb-1 block">标签名称</label>
              <input
                ref={inputRef}
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCustomSubmit(); if (e.key === 'Escape') setShowCustom(false); }}
                placeholder="输入标签名"
                className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-gray-800 dark:text-zinc-200 outline-none focus:border-blue-400 dark:focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 dark:text-zinc-400 mb-1 block">选择颜色</label>
              <div className="flex flex-wrap gap-1.5">
                {CUSTOM_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCustomColor(c)}
                    className={`w-6 h-6 rounded-full transition-all ${customColor === c ? 'ring-2 ring-offset-1 ring-gray-400 dark:ring-offset-zinc-900' : ''}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCustomSubmit}
                disabled={!customName.trim()}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs hover:bg-blue-600 disabled:opacity-40 transition-colors"
              >
                <Plus className="w-3 h-3" />
                添加
              </button>
              <button
                onClick={() => setShowCustom(false)}
                className="px-3 py-1.5 bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 rounded-lg text-xs hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
              >
                返回
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
