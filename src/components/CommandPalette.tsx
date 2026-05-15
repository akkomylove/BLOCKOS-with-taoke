'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, Send, Loader2, X, Trash2, Zap, Mic, MicOff } from 'lucide-react';
import { useBlockStore } from '@/store/blockStore';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

const COMMAND_KEYWORDS = [
  '删除', '高亮', '标红', '创建', '清空', '移动', '排序', '整理',
  '添加', '修改', '更新', '移除', '全部', '所有', '新建', '生成'
];

function isCommandIntent(input: string): boolean {
  return COMMAND_KEYWORDS.some((kw) => input.includes(kw));
}

interface Operation {
  action: string;
  target?: string;
  content?: string;
  update?: Record<string, unknown>;
}

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState('');
  const [streamText, setStreamText] = useState('');
  const [executedOps, setExecutedOps] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const blocks = useBlockStore((state) => state.blocks);
  const updateBlock = useBlockStore((state) => state.updateBlock);
  const deleteBlock = useBlockStore((state) => state.deleteBlock);
  const addBlock = useBlockStore((state) => state.addBlock);

  const { isListening, transcript, startListening, stopListening, resetTranscript, isSupported } = useSpeechRecognition();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 0);
      setInput('');
      setResult('');
      setStreamText('');
      setExecutedOps([]);
      resetTranscript();
    }
  }, [isOpen, resetTranscript]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const executeOperations = useCallback((operations: Operation[]) => {
    const ops: string[] = [];

    operations.forEach((op) => {
      switch (op.action) {
        case 'deleteAllBlocks': {
          const allIds = blocks.map((b) => b.id);
          allIds.forEach((id) => deleteBlock(id));
          ops.push(`已删除 ${allIds.length} 个 Block`);
          break;
        }
        case 'deleteBlock': {
          const blockToDelete = blocks.find(
            (b) => b.id === op.target || b.content.includes(op.target || '') || b.title?.includes(op.target || '')
          );
          if (blockToDelete) {
            deleteBlock(blockToDelete.id);
            ops.push(`已删除 Block: ${blockToDelete.content.substring(0, 20)}`);
          }
          break;
        }
        case 'updateBlock': {
          const targetBlock = blocks.find(
            (b) => b.id === op.target || b.content.includes(op.target || '')
          );
          if (targetBlock && op.update) {
            updateBlock(targetBlock.id, op.update);
            ops.push(`已更新 Block: ${targetBlock.content.substring(0, 20)}`);
          }
          break;
        }
        case 'highlightBlocks':
          blocks.forEach((b) => {
            if (b.content.includes(op.target || '')) {
              updateBlock(b.id, { meta: { ...b.meta, highlight: 'red' } });
            }
          });
          ops.push(`已高亮包含"${op.target}"的 Block`);
          break;
        case 'createBlock': {
          const newBlockId = addBlock('text');
          if (op.content) {
            setTimeout(() => {
              updateBlock(newBlockId, { content: op.content || '' });
            }, 0);
          }
          ops.push(`已创建新 Block`);
          break;
        }
        case 'clearAllContent':
          blocks.forEach((b) => {
            updateBlock(b.id, { content: '' });
          });
          ops.push('已清空所有 Block 内容');
          break;
      }
    });

    setExecutedOps(ops);
    return ops;
  }, [blocks, updateBlock, deleteBlock, addBlock]);

  const handleSubmit = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    setIsLoading(true);
    setResult('');
    setStreamText('');
    setExecutedOps([]);

    const useCommand = isCommandIntent(input);

    try {
      const endpoint = useCommand ? '/api/ai/command' : '/api/ai/generate';
      const body = useCommand
        ? JSON.stringify({
            command: input,
            blocks: blocks.map((b) => ({
              id: b.id,
              type: b.type,
              title: b.title || '',
              content: b.content.substring(0, 200),
            })),
          })
        : JSON.stringify({ prompt: input });

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });

      if (!response.ok) throw new Error('Request failed');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader');

      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        setStreamText(accumulated);
      }

      const text = accumulated.trim();

      if (useCommand) {
        try {
          const jsonMatch = text.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const operations = JSON.parse(jsonMatch[0]) as Operation[];
            const ops = executeOperations(operations);
            setResult(ops.join('\n') || '命令已执行');
          } else {
            setResult(text || '命令已处理');
          }
        } catch {
          setResult(text || '命令已处理');
        }
      } else {
        setResult(text || '生成完成');
      }
    } catch (error) {
      console.error('AI Error:', error);
      setResult(useCommand ? '命令执行失败' : '生成失败');
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, blocks, executeOperations]);

  const handleKeep = useCallback(() => {
    if (streamText) {
      const newBlockId = addBlock('text');
      setTimeout(() => {
        updateBlock(newBlockId, { content: streamText });
      }, 0);
    }
    onClose();
  }, [streamText, addBlock, updateBlock, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-gray-200 dark:border-zinc-700/50 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden animate-scale-in">
        <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-200 dark:border-zinc-800/60">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <span className="text-sm font-medium text-gray-800 dark:text-zinc-200">AI 助手</span>
            <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400 border border-purple-500/20">Agent</span>
          </div>
        </div>

        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-200 dark:border-zinc-800/60">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
              if (e.key === 'Escape') onClose();
            }}
            placeholder="输入命令，例如：删除所有 Block、创建 3 个文本 Block、高亮包含风险的 Block..."
            className="flex-1 bg-transparent outline-none text-gray-800 dark:text-zinc-200 placeholder-gray-400 dark:placeholder-zinc-600 text-sm"
          />
          {isSupported && (
            <button
              onClick={isListening ? stopListening : startListening}
              className={`p-2 rounded-lg transition-colors ${
                isListening ? 'bg-red-500/15 text-red-400' : 'hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 dark:text-zinc-500'
              }`}
              title={isListening ? '停止录音' : '语音输入'}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          )}
          {isLoading ? (
            <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!input.trim()}
              className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-30"
            >
              <Send className="w-4 h-4 text-purple-400" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors text-gray-500 dark:text-zinc-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {executedOps.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-200 dark:border-zinc-800/60 bg-emerald-500/5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-4 h-4 rounded bg-emerald-500/20 flex items-center justify-center">
                <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
              </div>
              <span className="text-xs text-emerald-400 font-medium">操作已执行</span>
            </div>
            <div className="space-y-1">
              {executedOps.map((op, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-gray-500 dark:text-zinc-400">
                  <Trash2 className="w-3 h-3 text-gray-400 dark:text-zinc-600" />
                  {op}
                </div>
              ))}
            </div>
          </div>
        )}

        {(streamText || result) && !executedOps.length && (
          <div className="px-5 py-3 text-sm text-gray-700 dark:text-zinc-300 border-t border-gray-200 dark:border-zinc-800/60 bg-gray-50/30 dark:bg-zinc-950/30 max-h-48 overflow-y-auto">
            <div className="whitespace-pre-wrap leading-relaxed">
              {streamText || result}
              {isLoading && (
                <span className="inline-block w-0.5 h-4 bg-purple-400 ml-0.5 align-text-bottom animate-cursor-blink" />
              )}
            </div>
          </div>
        )}

        {!isLoading && streamText && !executedOps.length && (
          <div className="flex gap-2 px-5 py-3 border-t border-gray-200 dark:border-zinc-800/60">
            <button
              onClick={handleKeep}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded-lg transition-colors"
            >
              创建为 Block
            </button>
            <button
              onClick={() => { setStreamText(''); setResult(''); }}
              className="flex-1 px-3 py-2 bg-gray-100/60 dark:bg-zinc-800/60 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-500 dark:text-zinc-400 text-sm rounded-lg transition-colors"
            >
              清除
            </button>
          </div>
        )}

        <div className="px-5 py-2.5 bg-gray-50/40 dark:bg-zinc-950/40 text-[11px] text-gray-400 dark:text-zinc-600">
          <span className="text-gray-500 dark:text-zinc-500">示例：</span>
          「删除所有 Block」「创建 3 个文本 Block」「高亮所有包含合规的 Block」「写一篇关于人工智能的简短介绍」
        </div>
      </div>
    </div>
  );
}