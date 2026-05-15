'use client';

import { useState } from 'react';
import { Check, X, ArrowLeft, FilePlus, Replace, Target } from 'lucide-react';
import { useBlockStore } from '@/store/blockStore';

interface AIResultCardProps {
  result: string;
  blockId: string;
  onClose: () => void;
}

export default function AIResultCard({ result, blockId, onClose }: AIResultCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showTargetPicker, setShowTargetPicker] = useState(false);
  const updateBlock = useBlockStore((state) => state.updateBlock);
  const addBlock = useBlockStore((state) => state.addBlock);
  const blocks = useBlockStore((state) => state.blocks);

  const handleReplace = async () => {
    setIsLoading(true);
    setError(null);
    try {
      updateBlock(blockId, { content: result });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } catch {
      setError('替换失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeep = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const newBlockId = addBlock('text', blockId);
      setTimeout(() => {
        updateBlock(newBlockId, { content: result });
      }, 50);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } catch {
      setError('创建失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToBlock = async (targetId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      updateBlock(targetId, { content: result });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } catch {
      setError('保存失败');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 animate-scale-in">
        <div className="flex items-center gap-2 text-emerald-400 text-sm">
          <Check className="w-4 h-4" />
          <span>已保存</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm border border-gray-200 dark:border-zinc-700/50 rounded-xl p-4 shadow-xl shadow-black/30 animate-scale-in">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
            <Check className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-medium text-gray-800 dark:text-zinc-200">AI 处理完成</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors text-gray-500 dark:text-zinc-500"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="bg-gray-50/50 dark:bg-zinc-950/50 border border-gray-200/50 dark:border-zinc-800/50 rounded-lg p-3 mb-4 max-h-32 overflow-y-auto">
        <p className="text-sm text-gray-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">{result}</p>
      </div>

      {error && (
        <div className="mb-3 p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
          {error}
        </div>
      )}

      {showTargetPicker && (
        <div className="mb-3 p-2 bg-gray-50/50 dark:bg-zinc-950/50 border border-gray-200/50 dark:border-zinc-800/50 rounded-lg max-h-32 overflow-y-auto">
          <div className="text-[10px] text-gray-500 dark:text-zinc-500 mb-1.5">选择目标 Block</div>
          <div className="space-y-1">
            {blocks.map((b) => (
              <button
                key={b.id}
                onClick={() => handleSaveToBlock(b.id)}
                disabled={isLoading}
                className="w-full text-left px-2 py-1.5 text-xs text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded transition-colors disabled:opacity-50"
              >
                <span className="text-gray-400 dark:text-zinc-500">[{b.type}]</span>{' '}
                {b.title || b.content.slice(0, 30) || b.id.slice(0, 8)}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowTargetPicker(false)}
            className="mt-2 text-[10px] text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 underline"
          >
            取消
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleReplace}
          disabled={isLoading}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs rounded-lg transition-all"
        >
          <Replace className="w-3.5 h-3.5" />
          替换原内容
        </button>
        <button
          onClick={() => setShowTargetPicker(true)}
          disabled={isLoading}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs rounded-lg transition-all"
        >
          <Target className="w-3.5 h-3.5" />
          保存到...
        </button>
        <button
          onClick={handleKeep}
          disabled={isLoading}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs rounded-lg transition-all"
        >
          <FilePlus className="w-3.5 h-3.5" />
          创建新 Block
        </button>
        <button
          onClick={onClose}
          disabled={isLoading}
          className="px-3 py-2 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-500 dark:text-zinc-400 text-xs rounded-lg transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
