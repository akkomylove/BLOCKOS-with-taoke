'use client';

import { useState, useEffect, useRef } from 'react';
import { Eye, Code, AlertTriangle, RefreshCw, Sparkles, RotateCcw } from 'lucide-react';
import { useBlockStore } from '@/store/blockStore';
import type { Block } from '@/types/block';

interface MermaidBlockProps {
  block: Block;
}

export const MERMAID_TEMPLATES = {
  flow: `graph TD
  Client["客户端 (Web / 移动端)"] --> Gateway["API 网关 / 鉴权"]
  Gateway --> Engine["BlockOS 规则引擎"]
  Engine --> AI["智谱 GLM 4.7 Flash 大模型"]
  Engine --> DB[("PostgreSQL / SQLite 混合持久化")]`,
  sequence: `sequenceDiagram
  autonumber
  actor User as 用户
  participant App as 前端工作台
  participant Server as API 服务端
  participant DB as 数据库

  User->>App: 触发协同操作
  App->>Server: POST /api/pages/[id]/blocks
  Server->>DB: 事务持久化写入
  DB-->>Server: 成功确认
  Server-->>App: 200 OK
  App-->>User: 画布平滑更新`,
  state: `stateDiagram-v2
  [*] --> 待办
  待办 --> 进行中: 认领任务
  进行中 --> 待验收: 提交产研交付物
  待验收 --> 已完成: 审核通过
  待验收 --> 进行中: 退回修正
  已完成 --> [*]`,
};

export const DEFAULT_MERMAID_CODE = MERMAID_TEMPLATES.flow;

export default function MermaidBlock({ block }: MermaidBlockProps) {
  const updateBlock = useBlockStore((state) => state.updateBlock);
  const [mode, setMode] = useState<'preview' | 'code'>('preview');
  const [svgHtml, setSvgHtml] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderSeq = useRef(0);

  // Auto-heal legacy unquoted template if detected in persistent storage
  useEffect(() => {
    if (block.content && block.content.includes('Client[客户端 (Web / Mobile)]')) {
      const healed = block.content
        .replace(/Client\[客户端 \(Web \/ Mobile\)\]/g, 'Client["客户端 (Web / 移动端)"]')
        .replace(/Gateway\[API 网关 \/ 鉴权\]/g, 'Gateway["API 网关 / 鉴权"]')
        .replace(/Engine\[BlockOS 规则引擎\]/g, 'Engine["BlockOS 规则引擎"]')
        .replace(/AI\[智谱 GLM 4.7 Flash 大模型\]/g, 'AI["智谱 GLM 4.7 Flash 大模型"]')
        .replace(/DB\[\(PostgreSQL \/ SQLite 混合持久化\)\]/g, 'DB[("PostgreSQL / SQLite 混合持久化")]');
      updateBlock(block.id, { content: healed });
    }
  }, [block.content, block.id, updateBlock]);

  const rawCode = block.content || DEFAULT_MERMAID_CODE;
  // Fallback to healed code for immediate render
  const code = rawCode.includes('Client[客户端 (Web / Mobile)]')
    ? DEFAULT_MERMAID_CODE
    : rawCode;

  useEffect(() => {
    let active = true;
    const seq = ++renderSeq.current;
    const safeBlockId = block.id.replace(/[^a-zA-Z0-9_-]/g, '');
    const id = `mermaid-${safeBlockId}-${seq}`;

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
          suppressErrorRendering: true,
        });

        const { svg } = await mermaid.render(id, code);

        if (active && seq === renderSeq.current) {
          setSvgHtml(svg);
          setErrorMsg(null);
        }
      } catch (err: unknown) {
        // Clean up Mermaid's injected error container in DOM
        if (typeof document !== 'undefined') {
          const strayEl = document.getElementById(`d${id}`);
          if (strayEl) strayEl.remove();
        }

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

  const applyTemplate = (templateKey: keyof typeof MERMAID_TEMPLATES) => {
    const nextCode = MERMAID_TEMPLATES[templateKey];
    updateBlock(block.id, { content: nextCode });
    setErrorMsg(null);
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

      {/* 源码模式快捷模板条 */}
      {mode === 'code' && (
        <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-100/60 dark:bg-zinc-800/40 border-b border-gray-200/50 dark:border-zinc-700/50 text-[10px] text-gray-500 dark:text-zinc-400 overflow-x-auto no-scrollbar shrink-0">
          <span className="flex items-center gap-1 font-medium text-gray-700 dark:text-zinc-300 shrink-0">
            <Sparkles className="w-2.5 h-2.5 text-blue-500" />
            快速模板:
          </span>
          <button
            type="button"
            onClick={() => applyTemplate('flow')}
            className="px-2 py-0.5 bg-white dark:bg-zinc-800 rounded border border-gray-200/70 dark:border-zinc-700 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shrink-0"
          >
            架构流向图
          </button>
          <button
            type="button"
            onClick={() => applyTemplate('sequence')}
            className="px-2 py-0.5 bg-white dark:bg-zinc-800 rounded border border-gray-200/70 dark:border-zinc-700 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shrink-0"
          >
            协作时序图
          </button>
          <button
            type="button"
            onClick={() => applyTemplate('state')}
            className="px-2 py-0.5 bg-white dark:bg-zinc-800 rounded border border-gray-200/70 dark:border-zinc-700 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shrink-0"
          >
            研发状态机
          </button>
        </div>
      )}

      {/* 内容区域 */}
      <div className="flex-1 min-h-[160px] overflow-auto p-3 relative flex items-center justify-center">
        {mode === 'preview' ? (
          errorMsg ? (
            <div className="flex flex-col items-center justify-center gap-2 p-4 text-center">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <div className="text-xs text-amber-700 dark:text-amber-400 font-medium">Mermaid 语法格式错误</div>
              <div className="text-[10px] text-gray-400 font-mono max-w-sm line-clamp-2">{errorMsg}</div>
              <div className="flex items-center gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setMode('code')}
                  className="px-2.5 py-1 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 rounded hover:bg-amber-200 transition-colors"
                >
                  前往源码修正
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateBlock(block.id, { content: DEFAULT_MERMAID_CODE });
                    setErrorMsg(null);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  恢复标准模板
                </button>
              </div>
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
