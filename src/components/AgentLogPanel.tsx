'use client';

import { useBlockStore } from '@/store/blockStore';
import { X, Clock, Zap } from 'lucide-react';

interface AgentLogPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AgentLogPanel({ isOpen, onClose }: AgentLogPanelProps) {
  const agentLogs = useBlockStore((state) => state.agentLogs);

  if (!isOpen) return null;

  return (
    <div className="fixed top-12 left-0 right-0 bg-zinc-950/95 backdrop-blur-xl border-b border-zinc-800/50 z-40 animate-slide-down">
      <div className="max-w-3xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-blue-400" />
            <h3 className="text-sm font-medium text-zinc-200">Agent 操作日志</h3>
            <span className="text-[11px] text-zinc-600 font-mono">{agentLogs.length}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {agentLogs.length === 0 ? (
          <div className="text-xs text-zinc-600 py-4 text-center">暂无日志记录</div>
        ) : (
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {agentLogs.slice(0, 8).map((log, i) => (
              <div
                key={log.id}
                className="flex items-center gap-3 px-3 py-2 bg-zinc-900/60 rounded-lg border border-zinc-800/40 animate-log-entry"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <Clock className="w-3 h-3 text-zinc-600 flex-shrink-0" />
                <span className="text-[11px] text-zinc-500 font-mono flex-shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                <span className="text-[11px] text-emerald-400 font-mono flex-shrink-0">{log.ruleId}</span>
                <span className="text-xs text-zinc-400 truncate">{log.result}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
