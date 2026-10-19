'use client';

import { useBlockStore } from '@/store/blockStore';
import { X, Terminal } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface AgentLogPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AgentLogPanel({ isOpen, onClose }: AgentLogPanelProps) {
  const agentLogs = useBlockStore((state) => state.agentLogs);
  const activityStatus = useBlockStore(state => state.activityStatus);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearError, setClearError] = useState('');
  const [cleared, setCleared] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const clearingRef = useRef(false);

  useEffect(() => {
    if (!isOpen) { setConfirmOpen(false); setClearError(''); setCleared(false); }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !confirmOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault(); event.stopPropagation();
        if (!clearingRef.current) setConfirmOpen(false);
      }
      if (event.key === 'Tab') {
        const buttons = dialogRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
        if (!buttons?.length) { event.preventDefault(); return; }
        const first = buttons[0], last = buttons[buttons.length - 1];
        if (!dialogRef.current?.contains(document.activeElement)) { event.preventDefault(); first.focus(); }
        else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', handleKey, true);
    return () => {
      window.removeEventListener('keydown', handleKey, true);
      if (previous?.isConnected && previous !== document.body && !(previous instanceof HTMLButtonElement && previous.disabled)) previous.focus();
      else closeButtonRef.current?.focus();
    };
  }, [confirmOpen, isOpen]);

  useEffect(() => {
    if (confirmOpen && !clearing && !dialogRef.current?.contains(document.activeElement)) dialogRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
  }, [confirmOpen, clearing]);

  const confirmClear = async () => {
    if (clearingRef.current) return;
    clearingRef.current = true;
    setClearing(true); setClearError('');
    try {
      await useBlockStore.getState().clearAgentLogs();
      setConfirmOpen(false); setCleared(true);
    } catch (error) {
      setClearError(error instanceof Error ? error.message : '清空失败，请重试');
      useBlockStore.setState({ activityStatus: 'error' });
    } finally { clearingRef.current = false; setClearing(false); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-14 bottom-0 w-96 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border-l border-gray-200 dark:border-zinc-800/50 z-40 overflow-hidden flex flex-col animate-slide-up shadow-2xl shadow-black/30">
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-200 dark:border-zinc-800/60">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <Terminal className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">Agent 日志</h3>
        </div>
        <button ref={closeButtonRef} disabled={clearing} onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300" aria-label="关闭执行日志">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {agentLogs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-zinc-600">
            <Terminal className="w-8 h-8 mb-3 text-gray-300 dark:text-zinc-700" />
            <p className="text-sm">暂无 Agent 操作记录</p>
            <p className="text-xs text-gray-400 dark:text-zinc-700 mt-1">AI 执行的操作将显示在这里</p>
          </div>
        )}
        {agentLogs.map((log) => (
          <div key={log.id} className="rounded-xl border border-gray-200/50 dark:border-zinc-800/50 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-gray-100/40 dark:bg-zinc-800/40 border-b border-gray-200/40 dark:border-zinc-800/40">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                <span className="text-[11px] text-gray-700 dark:text-zinc-300 font-medium">Agent 执行</span>
              </div>
              <span className="text-[10px] text-gray-400 dark:text-zinc-600 font-mono">{new Date(log.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            </div>
            <div className="px-3 py-2.5 space-y-1.5">
              <div className="flex items-start gap-2">
                <div className="w-1 h-1 rounded-full bg-gray-400 dark:bg-zinc-600 mt-1.5 shrink-0" />
                <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">{log.result}</p>
              </div>
              {log.ruleId && (
                <div className="flex items-start gap-2">
                  <div className="w-1 h-1 rounded-full bg-gray-400 dark:bg-zinc-600 mt-1.5 shrink-0" />
                  <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">规则: {log.ruleId}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {cleared && <p role="status" className="px-4 py-2 text-xs text-emerald-600 dark:text-emerald-400">已清空日志</p>}
      <div className="px-4 py-2.5 border-t border-gray-200 dark:border-zinc-800/60 bg-gray-50/40 dark:bg-zinc-950/40 flex items-center justify-between">
        <span className="text-[10px] text-gray-400 dark:text-zinc-600">共 {agentLogs.length} 条记录 · {activityStatus === 'saved' ? '已同步到账号' : activityStatus === 'saving' ? '同步中…' : activityStatus === 'error' ? <button onClick={() => void useBlockStore.getState().flushActivity().catch(() => {})}>同步失败，点击重试</button> : '等待同步'}</span>
        <button
          onClick={() => {
            setClearError(''); setCleared(false); setConfirmOpen(true);
          }}
          disabled={agentLogs.length === 0 || clearing}
          className="text-[10px] text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          清空日志
        </button>
      </div>
      {confirmOpen && createPortal(
        <div className="fixed inset-0 z-[260] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div ref={dialogRef} role="alertdialog" aria-modal="true" aria-labelledby="clear-logs-title" aria-describedby="clear-logs-description" aria-busy={clearing} className="w-full max-w-md rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-5 shadow-2xl">
            <h3 id="clear-logs-title" className="font-semibold text-gray-900 dark:text-zinc-100">确认清空日志？</h3>
            <p id="clear-logs-description" className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-zinc-300">将清空当前账号的全部 Agent 执行日志（本页显示 {agentLogs.length} 条）。清空会同步到其他设备，且无法撤销。画布内容和历史版本会保留。</p>
            {clearError && <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">{clearError}</p>}
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" disabled={clearing} onClick={() => setConfirmOpen(false)} className="rounded-lg border border-gray-200 dark:border-zinc-700 px-4 py-2 text-sm text-gray-700 dark:text-zinc-200 disabled:opacity-50">取消</button>
              <button type="button" disabled={clearing} onClick={() => void confirmClear()} className="rounded-lg bg-red-600 hover:bg-red-700 px-4 py-2 text-sm text-white disabled:opacity-50">{clearing ? '正在清空…' : '确认清空'}</button>
            </div>
          </div>
        </div>, document.body,
      )}
    </div>
  );
}
