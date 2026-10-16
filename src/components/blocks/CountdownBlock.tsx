'use client';

import { useState, useEffect } from 'react';
import { Clock, Calendar, CheckCircle, Settings, Play } from 'lucide-react';
import { useBlockStore } from '@/store/blockStore';
import type { Block } from '@/types/block';

interface CountdownBlockProps {
  block: Block;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

function calculateTimeRemaining(targetIso: string): TimeRemaining {
  const target = new Date(targetIso).getTime();
  const now = Date.now();
  const diff = target - now;

  if (isNaN(target) || diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return { days, hours, minutes, seconds, isExpired: false };
}

export default function CountdownBlock({ block }: CountdownBlockProps) {
  const updateBlock = useBlockStore((state) => state.updateBlock);
  const [showConfig, setShowConfig] = useState(false);

  const targetDate = block.meta.targetDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
  const targetTime = block.meta.targetTime || '18:00';
  const targetIso = `${targetDate}T${targetTime}:00`;

  const [remaining, setRemaining] = useState<TimeRemaining>(() => calculateTimeRemaining(targetIso));

  useEffect(() => {
    setRemaining(calculateTimeRemaining(targetIso));
    const timer = setInterval(() => {
      setRemaining(calculateTimeRemaining(targetIso));
    }, 1000);
    return () => clearInterval(timer);
  }, [targetIso]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateBlock(block.id, {
      meta: {
        ...block.meta,
        targetDate: e.target.value,
      },
    });
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateBlock(block.id, {
      meta: {
        ...block.meta,
        targetTime: e.target.value,
      },
    });
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateBlock(block.id, { content: e.target.value });
  };

  return (
    <div className="relative p-3.5 bg-gradient-to-br from-indigo-50/80 to-purple-50/50 dark:from-zinc-900 dark:to-indigo-950/20 rounded-lg border border-indigo-200/60 dark:border-indigo-800/40 w-full select-none">
      {/* 头部：标题与配置按钮 */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <Clock className="w-4 h-4 text-indigo-500 shrink-0" />
          <input
            type="text"
            value={block.content || '版本发布冲刺里程碑'}
            onChange={handleContentChange}
            placeholder="输入冲刺目标或发布里程碑名称..."
            className="text-xs font-semibold text-gray-800 dark:text-zinc-200 bg-transparent outline-none w-full truncate placeholder:text-gray-400"
          />
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1 ${
              remaining.isExpired
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 animate-pulse'
            }`}
          >
            {remaining.isExpired ? <CheckCircle className="w-3 h-3" /> : <Play className="w-2.5 h-2.5" />}
            {remaining.isExpired ? '已达节点' : '冲刺进行中'}
          </span>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowConfig(!showConfig);
            }}
            className="p-1 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white/60 dark:hover:bg-zinc-800 rounded transition-colors"
            title="配置目标时间"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 倒计时 4 栏时间盒 */}
      <div className="grid grid-cols-4 gap-2 mb-2">
        {[
          { label: '天', value: remaining.days },
          { label: '时', value: String(remaining.hours).padStart(2, '0') },
          { label: '分', value: String(remaining.minutes).padStart(2, '0') },
          { label: '秒', value: String(remaining.seconds).padStart(2, '0') },
        ].map((item, idx) => (
          <div
            key={idx}
            className="flex flex-col items-center justify-center py-2 px-1 bg-white dark:bg-zinc-800/90 rounded-lg border border-indigo-100 dark:border-zinc-700/60 shadow-xs"
          >
            <span className="font-mono text-xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400">
              {item.value}
            </span>
            <span className="text-[10px] text-gray-400 dark:text-zinc-500 mt-0.5">{item.label}</span>
          </div>
        ))}
      </div>

      {/* 目标截止时间指示 */}
      <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-zinc-400 px-1 pt-1 border-t border-indigo-100/60 dark:border-zinc-800/60">
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3 text-gray-400" />
          目标节点：{targetDate} {targetTime}
        </span>
        <span className="text-[10px] font-mono text-gray-400">
          {remaining.isExpired ? '已截止' : '实时同步'}
        </span>
      </div>

      {/* 配置面板 */}
      {showConfig && (
        <div
          data-ui-control
          className="mt-3 p-3 bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700 shadow-md space-y-2 text-xs"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="font-medium text-gray-700 dark:text-zinc-300">配置目标截止时间</div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-gray-500 mb-0.5 block">截止日期</label>
              <input
                type="date"
                value={targetDate}
                onChange={handleDateChange}
                className="w-full px-2 py-1 rounded border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900 text-gray-800 dark:text-zinc-200 text-xs"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 mb-0.5 block">截止时间</label>
              <input
                type="time"
                value={targetTime}
                onChange={handleTimeChange}
                className="w-full px-2 py-1 rounded border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900 text-gray-800 dark:text-zinc-200 text-xs"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowConfig(false)}
              className="px-2.5 py-1 bg-indigo-500 text-white rounded text-xs hover:bg-indigo-600 transition-colors"
            >
              完成
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
