'use client';

import { useEffect, useState } from 'react';
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
  manual: {
    icon: <Clock className="w-4 h-4" />,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    border: 'border-blue-200 dark:border-blue-500/20',
    label: '保存快照',
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
  const blocks = useBlockStore(state => state.blocks);
  const [pendingRestore, setPendingRestore] = useState<(typeof history)[number] | null>(null);
  const [restored, setRestored] = useState<{ pageId: string; index: number; blocks: typeof blocks } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (pendingRestore) setPendingRestore(null); else onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose, pendingRestore]);

  useEffect(() => {
    if (isOpen) {
      const state = useBlockStore.getState();
      const existing = state.history.filter((h) => h.pageId === state.currentPageId);
      if (existing.length === 0 && state.blocks.length > 0) {
        state.saveHistory('编辑');
      }
    }
  }, [isOpen]);

  const pageHistory = history
    .map((entry, index) => ({ ...entry, index }))
    .filter((entry) => entry.pageId === currentPageId);

  const handleRestore = (index: number) => {
    setPendingRestore(history[index]);
  };
  const confirmRestore = () => {
    const state = useBlockStore.getState();
    const index = state.history.indexOf(pendingRestore!);
    if (state.restoreHistoryWithBackup(index)) {
      const after = useBlockStore.getState();
      setRestored({ pageId: after.currentPageId, index: after.historyIndex, blocks: after.blocks });
    }
    setPendingRestore(null);
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
      <div className="absolute inset-0 bg-black/30 dark:bg-black/60 backdrop-blur-xs" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label="文档版本历史" className="relative w-full max-w-lg bg-white dark:bg-[#1a1c20] border border-line dark:border-zinc-800 rounded-2xl shadow-modal overflow-hidden flex flex-col max-h-[80vh] animate-scale-in">
        {restored?.pageId === currentPageId && <div role="status" className="px-5 py-3 bg-blue-50 dark:bg-blue-950/30 text-sm text-blue-700 dark:text-blue-200">
          已恢复历史版本，恢复前内容已备份。
          {historyIndex === restored.index && blocks === restored.blocks && <button className="ml-2 underline" onClick={() => { useBlockStore.getState().undo(); setRestored(null); }}>撤销这次恢复</button>}
        </div>}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line-subtle dark:border-zinc-800 bg-[#f7f8fa]/60 dark:bg-zinc-900/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-light dark:bg-blue-950/40 text-brand flex items-center justify-center shadow-xs">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-content dark:text-zinc-100">文档版本历史</h2>
              <p className="text-xs text-content-tertiary dark:text-zinc-500">点击任意快照版本可恢复到该时间点</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={undo}
              disabled={!canUndo()}
              className="p-2 rounded-lg hover:bg-surface-hover dark:hover:bg-zinc-800 text-content-secondary dark:text-zinc-400 disabled:opacity-30 transition-colors"
              title="撤销 (Ctrl+Z)"
             aria-label="撤销 (Ctrl+Z)">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo()}
              className="p-2 rounded-lg hover:bg-surface-hover dark:hover:bg-zinc-800 text-content-secondary dark:text-zinc-400 disabled:opacity-30 transition-colors"
              title="重做 (Ctrl+Shift+Z)"
             aria-label="重做 (Ctrl+Shift+Z)">
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-surface-hover dark:hover:bg-zinc-800 rounded-lg text-content-tertiary hover:text-content-secondary dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors ml-1"
              title="关闭"
             aria-label="关闭">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-page/30 dark:bg-zinc-950/20">
          {pageHistory.length === 0 && (
            <div className="text-center py-16">
              <div className="w-12 h-12 rounded-2xl bg-brand-light dark:bg-blue-950/40 text-brand flex items-center justify-center mx-auto mb-3 shadow-xs">
                <Clock className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-content dark:text-zinc-400">暂无版本历史快照</p>
              <p className="text-xs text-content-tertiary dark:text-zinc-600 mt-1">编辑画布文档后将自动生成版本</p>
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
                className={`w-full text-left rounded-xl border transition-all duration-150 group p-4 ${
                  isCurrent
                    ? 'border-brand/50 dark:border-blue-700 bg-brand-light/70 dark:bg-blue-950/30 shadow-xs'
                    : 'border-line dark:border-zinc-800 hover:border-brand/40 bg-white dark:bg-[#1a1c20] hover:bg-surface-hover'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${meta.bg} ${meta.color} border ${meta.border} shadow-xs`}>
                    {isCurrent ? <RotateCcw className="w-4 h-4 text-brand dark:text-blue-400" /> : meta.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-content dark:text-zinc-200">{entry.action.startsWith('恢复') ? entry.action : meta.label}</span>
                      {isCurrent && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-brand text-white font-medium shadow-xs">
                          当前
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-content-tertiary dark:text-zinc-500">
                      <span className="flex items-center gap-1 truncate max-w-[150px]">
                        <FileText className="w-3 h-3" />
                        {page?.title || '未命名文档'}
                      </span>
                      <span>·</span>
                      <span>{entry.blockCount} 个 Block</span>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="text-xs text-content-secondary dark:text-zinc-400 font-medium">{formatTime(entry.timestamp)}</div>
                    {!isCurrent && (
                      <div className="text-[11px] text-brand dark:text-blue-400 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                        恢复此版本
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="px-6 py-3 bg-[#f7f8fa] dark:bg-zinc-950/60 border-t border-line-subtle dark:border-zinc-800 text-xs text-content-tertiary flex justify-between">
          <span>共 {pageHistory.length} 条记录</span>
          <span>系统最多保留 50 个快照版本</span>
        </div>
      </div>
      {pendingRestore && <div className="fixed inset-0 z-[260] flex items-center justify-center bg-black/40 p-4">
        <div role="alertdialog" aria-modal="true" aria-labelledby="restore-confirm-title" aria-describedby="restore-confirm-details" className="max-w-md rounded-xl bg-white dark:bg-zinc-900 border border-line p-5 shadow-modal">
          <h3 id="restore-confirm-title" className="font-semibold text-content dark:text-zinc-100">确认恢复此版本？</h3>
          <p id="restore-confirm-details" className="mt-3 text-sm leading-relaxed text-content-secondary dark:text-zinc-300">当前有 {blocks.length} 张卡片，目标版本有 {pendingRestore.blocks.length} 张卡片。恢复将替换当前内容，其中 {blocks.filter(block => !pendingRestore.blocks.some(target => target.id === block.id)).length} 张当前卡片不在目标版本中。恢复前会自动保存备份，并提供撤销入口。</p>
          <div className="mt-5 flex justify-end gap-3">
            <button autoFocus onClick={() => setPendingRestore(null)} className="rounded-lg border border-line px-4 py-2 text-sm">取消</button>
            <button onClick={confirmRestore} className="rounded-lg bg-brand text-white px-4 py-2 text-sm">确认恢复</button>
          </div>
        </div>
      </div>}
    </div>
  );
}
