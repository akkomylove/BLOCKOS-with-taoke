'use client';

import { useState, useEffect, useRef } from 'react';
import { Eye, Code, AlertTriangle, RefreshCw } from 'lucide-react';
import { useBlockStore } from '@/store/blockStore';
import type { Block } from '@/types/block';

interface MermaidBlockProps {
  block: Block;
}

export default function MermaidBlock({ block }: MermaidBlockProps) {
  const updateBlock = useBlockStore((state) => state.updateBlock);
  const [mode, setMode] = useState<'preview' | 'code'>('preview');
  const [svgHtml, setSvgHtml] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderSeq = useRef(0);

  const code = block.content || `graph TD\n  Client[客户端 (Web / Mobile)] --> Gateway[API 网关 / 鉴权]\n  Gateway --> Engine[BlockOS 规则引擎]\n  Engine --> AI[智谱 GLM 4.7 Flash 大模型]\n  Engine --> DB[(PostgreSQL / SQLite 混合持久化)]`;

  useEffect(() => {
    let active = true;
    const seq = ++renderSeq.current;

    async function renderMermaid() {
      try {
        setErrorMsg(null);
        const mermaidModule = await import('mermaid');
        const mermaid = mermaidModule.default;
        mermaid.initialize({
          startOnLoad: false,
          theme: 'default',
          securityLevel: 'loose',
          fontFamily: 'inherit',
        });

        const id = `mermaid-${block.id.replace(/[^a-zA-Z0-9_-]/g, '')}-${seq}`;
        const { svg } = await mermaid.render(id, code);

        if (active && seq === renderSeq.current) {
          setSvgHtml(svg);
          setErrorMsg(null);
        }
      } catch (err: unknown) {
        if (active && seq === renderSeq.current) {
          setErrorMsg(err instanceof Error ? err.message : 'Mermaid 语法解析失败');
        }
      }
    }

    if (mode === 'preview') {
      void renderMermaid();
    }

    return () => {
      active = false;
    };
  }, [code, mode, block.id]);

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateBlock(block.id, { content: e.target.value });
  };

  return (
    <div className="relative flex flex-col h-full w-full bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 overflow-hidden">
      {/* 顶部工具条 */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50/80 dark:bg-zinc-800/60 border-b border-gray-100 dark:border-zinc-800/80 shrink-0 text-xs">
        <span className="font-mono text-[11px] text-gray-500 dark:text-zinc-400">
          Mermaid 流程图
        </span>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMode('preview')}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] transition-colors ${
              mode === 'preview'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-medium'
                : 'text-gray-500 hover:bg-gray-200/60 dark:hover:bg-zinc-700'
            }`}
          >
            <Eye className="w-3 h-3" />
            预览
          </button>

          <button
            type="button"
            onClick={() => setMode('code')}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] transition-colors ${
              mode === 'code'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-medium'
                : 'text-gray-500 hover:bg-gray-200/60 dark:hover:bg-zinc-700'
            }`}
          >
            <Code className="w-3 h-3" />
            源码
          </button>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 min-h-[160px] overflow-auto p-3 relative flex items-center justify-center">
        {mode === 'preview' ? (
          errorMsg ? (
            <div className="flex flex-col items-center justify-center gap-2 p-4 text-center">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <div className="text-xs text-amber-700 dark:text-amber-400 font-medium">Mermaid 语法格式错误</div>
              <div className="text-[10px] text-gray-400 font-mono max-w-sm line-clamp-2">{errorMsg}</div>
              <button
                type="button"
                onClick={() => setMode('code')}
                className="mt-1 px-2.5 py-1 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 rounded hover:bg-amber-200 transition-colors"
              >
                前往源码修正
              </button>
            </div>
          ) : svgHtml ? (
            <div
              ref={containerRef}
              className="w-full h-full flex items-center justify-center overflow-auto [&_svg]:max-w-full [&_svg]:h-auto"
              dangerouslySetInnerHTML={{ __html: svgHtml }}
            />
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              正在渲染架构图...
            </div>
          )
        ) : (
          <textarea
            value={code}
            onChange={handleCodeChange}
            placeholder="输入 Mermaid 流程图或时序图代码..."
            className="w-full h-full p-2 font-mono text-xs text-gray-800 dark:text-zinc-200 bg-gray-50/50 dark:bg-zinc-950/40 border border-gray-100 dark:border-zinc-800 rounded resize-none outline-none leading-relaxed"
            rows={8}
          />
        )}
      </div>
    </div>
  );
}
