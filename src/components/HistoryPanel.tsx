'use client';

import { X, Clock, RotateCcw, ChevronLeft, ChevronRight, FileText, Plus, Trash2, Edit3, History } from 'lucide-react';
import { useBlockStore } from '@/store/blockStore';

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const ACTION_META: Record<string, { icon: React.ReactNode; color: string; bg: string; border: string; label: string }> = {
  创建: {
    icon: <Plus className="w-4 h-4" />,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    border: 'border-emerald-200 dark:border-emerald-500/20',
    label: '创建了内容',
  },
  删除: {
    icon: <Trash2 className="w-4 h-4" />,
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-500/10',
    border: 'border-red-200 dark:border-red-500/20',
    label: '删除了内容',
  },
  编辑: {
    icon: <Edit3 className="w-4 h-4" />,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    border: 'border-blue-200 dark:border-blue-500/20',
    label: '编辑了内容',
  },
};

export default function HistoryPanel({ isOpen, onClose }: HistoryPanelProps) {
  const history = useBlockStore((state) => state.history);
  const historyIndex = useBlockStore((state) => state.historyIndex);
  const undo = useBlockStore((state) => state.undo);
  const redo = useBlockStore((state) => state.redo);
  const canUndo = useBlockStore((state) => state.canUndo);
  const canRedo = useBlockStore((state) => state.canRedo);

  const currentPageId = useBlockStore((state) => state.currentPageId);
  const pages = useBlockStore((state) => state.pages);

  const pageHistory = history
    .map((entry, index) => ({ ...entry, index }))
    .filter((entry) => entry.pageId === currentPageId);

  const handleRestore = (index: number) => {
    const targetIndex = history.findIndex((h) => h.timestamp === history[index]?.timestamp);
    if (targetIndex === -1) return;
    const diff = targetIndex - historyIndex;
    if (diff < 0) {
      for (let i = 0; i < Math.abs(diff); i++) undo();
    } else if (diff > 0) {
      for (let i = 0; i < diff; i++) redo();
    }
    onClose();
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    if (isToday) return `今天 ${timeStr}`;
    return `${d.getMonth() + 1}月${d.getDate()}日 ${timeStr}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[8vh]">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center">
              <History className="w-5 h-5 text-gray-700 dark:text-zinc-300" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-zinc-100">版本历史</h2>
              <p className="text-xs text-gray-400 dark:text-zinc-500">点击任意版本可恢复到该状态</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={undo}
              disabled={!canUndo()}
              className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-600 dark:text-zinc-400 disabled:opacity-30 transition-colors"
              title="撤销"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo()}
              className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-600 dark:text-zinc-400 disabled:opacity-30 transition-colors"
              title="重做"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <button onClick={onClose} className="p-2.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl text-gray-400 dark:text-zinc-500 transition-colors ml-1">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {pageHistory.length === 0 && (
            <div className="text-center py-16">
              <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                <Clock className="w-6 h-6 text-gray-400 dark:text-zinc-500" />
              </div>
              <p className="text-sm text-gray-500 dark:text-zinc-400">暂无历史记录</p>
              <p className="text-xs text-gray-400 dark:text-zinc-600 mt-1">编辑文档后将自动保存版本</p>
            </div>
          )}

          {pageHistory.map((entry) => {
            const isCurrent = entry.index === historyIndex;
            const page = pages.find((p) => p.id === entry.pageId);
            const meta = ACTION_META[entry.action] || ACTION_META['编辑'];

            return (
              <button
                key={entry.timestamp}
                onClick={() => handleRestore(entry.index)}
                className={`w-full text-left rounded-xl border transition-all duration-150 group ${
                  isCurrent
                    ? 'border-blue-400 dark:border-blue-500/50 bg-blue-50/80 dark:bg-blue-500/10 shadow-sm'
                    : `border-gray-200 dark:border-zinc-700 hover:border-gray-300 dark:hover:border-zinc-600 bg-white dark:bg-zinc-900 hover:bg-gray-50 dark:hover:bg-zinc-950`
                }`}
              >
                <div className="flex items-center gap-4 px-5 py-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${meta.bg} ${meta.color} border ${meta.border}`}>
                    {isCurrent ? <RotateCcw className="w-5 h-5 text-blue-600 dark:text-blue-400" /> : meta.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-gray-800 dark:text-zinc-200">{meta.label}</span>
                      {isCurrent && (
                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 font-semibold">
                          当前版本
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-zinc-500">
                      <span className="flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" />
                        {page?.title || '未知页面'}
                      </span>
                      <span className="text-gray-300 dark:text-zinc-700">·</span>
                      <span>{entry.blockCount} 个 Block</span>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="text-sm text-gray-600 dark:text-zinc-400 font-medium">{formatTime(entry.timestamp)}</div>
                    {!isCurrent && (
                      <div className="text-xs text-gray-400 dark:text-zinc-600 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        点击恢复
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="px-6 py-4 bg-gray-50 dark:bg-zinc-950 border-t border-gray-100 dark:border-zinc-800 text-xs text-gray-400 dark:text-zinc-500 flex justify-between">
          <span>共 {pageHistory.length} 条记录</span>
          <span>最多保留 50 条</span>
        </div>
      </div>
    </div>
  );
}
