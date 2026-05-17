'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Wand2, X, Send, Loader2, Check } from 'lucide-react';
import { useBlockStore } from '@/store/blockStore';

interface AIGeneratePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AIGeneratePanel({ isOpen, onClose }: AIGeneratePanelProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [content, setContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const contentRef = useRef('');
  const rafIdRef = useRef<number | null>(null);
  const addBlock = useBlockStore((state) => state.addBlock);
  const updateBlock = useBlockStore((state) => state.updateBlock);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 0);
      setInput('');
      setContent('');
      setIsStreaming(false);
      setIsLoading(false);
    }
  }, [isOpen]);

  const handleSubmit = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    setIsLoading(true);
    setIsStreaming(true);
    setContent('');
    contentRef.current = '';

    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: input }),
      });

      if (!response.ok) throw new Error('Generate failed');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader');

      const decoder = new TextDecoder();

      const processChunk = () => {
        setContent(contentRef.current);
        rafIdRef.current = null;
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        contentRef.current += chunk;
        if (!rafIdRef.current) {
          rafIdRef.current = requestAnimationFrame(processChunk);
        }
      }

      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
      setContent(contentRef.current);
      setIsStreaming(false);
    } catch (error) {
      console.error('Generate Error:', error);
      const errorMsg = error instanceof Error ? error.message : '未知错误';
      setContent(`AI 生成失败，请重试。错误信息: ${errorMsg}`);
      setIsStreaming(false);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading]);

  useEffect(() => {
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  const handleKeep = useCallback(() => {
    if (content) {
      const newBlockId = addBlock('text');
      setTimeout(() => {
        updateBlock(newBlockId, { content });
      }, 0);
    }
    onClose();
  }, [content, addBlock, updateBlock, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden animate-scale-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/60">
          <div className="flex items-center gap-2.5">
            <Wand2 className="w-5 h-5 text-purple-400" />
            <span className="text-sm font-medium text-zinc-200">AI 生成内容</span>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.metaKey) handleSubmit();
              if (e.key === 'Escape') onClose();
            }}
            placeholder="描述你想要生成的内容，例如：写一篇关于人工智能的简短介绍..."
            className="w-full h-24 bg-zinc-950/50 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 outline-none resize-none focus:border-zinc-600 transition-colors"
          />
          <div className="flex items-center justify-between mt-3">
            <span className="text-[11px] text-zinc-600">Cmd + Enter 生成</span>
            <button
              onClick={handleSubmit}
              disabled={!input.trim() || isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-30 disabled:hover:bg-purple-600 text-white text-sm rounded-lg transition-colors"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {isLoading ? '生成中...' : '生成'}
            </button>
          </div>
        </div>

        {(content || isLoading) && (
          <div className="px-5 py-4 border-t border-zinc-800/60 bg-zinc-950/30">
            <div className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
              {content || (isLoading ? '思考中...' : '')}
              {isStreaming && (
                <span className="inline-block w-0.5 h-4 bg-purple-400 ml-0.5 align-text-bottom animate-cursor-blink" />
              )}
            </div>

            {!isLoading && content && (
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleKeep}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded-lg transition-colors"
                >
                  <Check className="w-4 h-4" />
                  创建为 Block
                </button>
                <button
                  onClick={() => setContent('')}
                  className="flex-1 px-3 py-2 bg-zinc-800/60 hover:bg-zinc-700 text-zinc-400 text-sm rounded-lg transition-colors"
                >
                  清除
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
