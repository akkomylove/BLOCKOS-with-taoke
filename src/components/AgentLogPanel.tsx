'use client';

import { useBlockStore } from '@/store/blockStore';
import { X, Clock, Zap, Terminal } from 'lucide-react';

interface AgentLogPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AgentLogPanel({ isOpen, onClose }: AgentLogPanelProps) {
  const agentLogs = useBlockStore((state) => state.agentLogs);

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
        <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300">
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

      <div className="px-4 py-2.5 border-t border-gray-200 dark:border-zinc-800/60 bg-gray-50/40 dark:bg-zinc-950/40 flex items-center justify-between">
        <span className="text-[10px] text-gray-400 dark:text-zinc-600">共 {agentLogs.length} 条记录</span>
        <button
          onClick={() => {
            const state = useBlockStore.getState() as unknown as Record<string, unknown>;
            (state.clearAgentLogs as (() => void) | undefined)?.();
          }}
          className="text-[10px] text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 transition-colors"
        >
          清空日志
        </button>
      </div>
    </div>
  );
}
