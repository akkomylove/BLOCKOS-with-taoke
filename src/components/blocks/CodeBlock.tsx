'use client';

import { useState, useCallback, useRef } from 'react';
import { Play, Trash2, Loader2, Database, X } from 'lucide-react';
import { useBlockStore } from '@/store/blockStore';
import type { Block } from '@/types/block';

interface CodeBlockProps {
  content: string;
  language?: string;
  onChange: (content: string, language?: string) => void;
  readOnly?: boolean;
}

const LANGUAGES = ['javascript', 'typescript', 'python', 'java', 'cpp', 'go', 'rust', 'sql', 'html', 'css', 'json', 'markdown', 'bash'];

interface RunResult {
  output: string[];
  error: string | null;
  duration: number;
}

export default function CodeBlock({ content, language = 'javascript', onChange, readOnly }: CodeBlockProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [showRefPicker, setShowRefPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const blocks = useBlockStore((state) => state.blocks);

  const tryParseJSON = useCallback((str: string): unknown => {
    try {
      return JSON.parse(str);
    } catch {
      return str;
    }
  }, []);

  const parseRefs = useCallback((code: string): Array<{ id: string; varName: string }> => {
    const refs: Array<{ id: string; varName: string }> = [];
    const regex = /\/\/\s*@ref\s+(\w+)/g;
    let match;
    while ((match = regex.exec(code)) !== null) {
      const varName = match[1];
      const block = blocks.find((b) => b.id === varName || b.title === varName);
      if (block) {
        refs.push({ id: block.id, varName });
      }
    }
    return refs;
  }, [blocks]);

  const executeJS = useCallback(async () => {
    if (!content.trim() || isRunning) return;
    setIsRunning(true);
    setRunResult(null);

    const startTime = performance.now();

    try {
      const output: string[] = [];
      const fakeConsole = {
        log: (...args: unknown[]) => output.push(args.map((a) => String(a)).join(' ')),
        warn: (...args: unknown[]) => output.push(`[warn] ${args.map((a) => String(a)).join(' ')}`),
        error: (...args: unknown[]) => output.push(`[error] ${args.map((a) => String(a)).join(' ')}`),
        info: (...args: unknown[]) => output.push(`[info] ${args.map((a) => String(a)).join(' ')}`),
      };

      const refs = parseRefs(content);
      const refData: Record<string, unknown> = {};
      refs.forEach((ref) => {
        const block = blocks.find((b) => b.id === ref.id);
        if (block) {
          refData[ref.varName] = tryParseJSON(block.content);
        }
      });

      const wrappedCode = `
        ${refs.map((r) => `const ${r.varName} = refData["${r.varName}"];`).join('\n')}
        ${content.replace(/\/\/\s*@ref\s+\w+/g, '')}
      `;

      const fn = new Function('console', 'refData', wrappedCode);
      fn(fakeConsole, refData);

      setRunResult({
        output,
        error: null,
        duration: Math.round(performance.now() - startTime),
      });
    } catch (error) {
      setRunResult({
        output: [],
        error: error instanceof Error ? error.message : String(error),
        duration: Math.round(performance.now() - startTime),
      });
    } finally {
      setIsRunning(false);
    }
  }, [content, isRunning, blocks, parseRefs, tryParseJSON]);

  const insertRef = (block: Block) => {
    const varName = block.title || block.id.slice(0, 8);
    const refLine = `// @ref ${varName}\n`;
    const newContent = content + (content.endsWith('\n') ? '' : '\n') + refLine;
    onChange(newContent, language);
    setShowRefPicker(false);
  };

  const clearResult = () => setRunResult(null);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShowLangDropdown(!showLangDropdown)}
              className="flex items-center gap-1 px-2 py-1 text-[11px] bg-zinc-800 text-zinc-400 rounded hover:bg-zinc-700 transition-colors"
            >
              {language}
            </button>
            {showLangDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-10 py-1 min-w-[120px]">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang}
                    onClick={() => {
                      onChange(content, lang);
                      setShowLangDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-zinc-800 transition-colors ${
                      lang === language ? 'text-blue-400' : 'text-zinc-400'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => setShowRefPicker(!showRefPicker)}
            className="flex items-center gap-1 px-2 py-1 text-[11px] bg-zinc-800 text-zinc-400 rounded hover:bg-zinc-700 transition-colors"
          >
            <Database className="w-3 h-3" />
            引用
          </button>

          {language === 'javascript' && (
            <button
              onClick={executeJS}
              disabled={isRunning}
              className="flex items-center gap-1 px-2 py-1 text-[11px] bg-emerald-600/20 text-emerald-400 rounded hover:bg-emerald-600/30 transition-colors disabled:opacity-50"
            >
              {isRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
              运行
            </button>
          )}
        </div>

        {!readOnly && (
          <button
            onClick={clearResult}
            className="p-1 hover:bg-zinc-800 rounded transition-colors text-zinc-500"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>

      {showRefPicker && (
        <div className="mb-2 p-2 bg-zinc-900/80 border border-zinc-800 rounded-lg max-h-32 overflow-y-auto">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-zinc-500">选择要引用的 Block</span>
            <button onClick={() => setShowRefPicker(false)} className="text-zinc-500 hover:text-zinc-300">
              <X className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-1">
            {blocks.filter((b) => b.type === 'table' || b.type === 'text').map((block) => (
              <button
                key={block.id}
                onClick={() => insertRef(block)}
                className="w-full text-left px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800 rounded transition-colors"
              >
                <span className="text-zinc-500">[{block.type}]</span>{' '}
                {block.title || block.content.slice(0, 30) || block.id.slice(0, 8)}
              </button>
            ))}
            {blocks.filter((b) => b.type === 'table' || b.type === 'text').length === 0 && (
              <div className="text-xs text-zinc-600 py-1">没有可引用的 Block</div>
            )}
          </div>
        </div>
      )}

      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => onChange(e.target.value, language)}
        readOnly={readOnly}
        spellCheck={false}
        className="w-full h-32 bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs font-mono text-zinc-300 outline-none resize-y focus:border-zinc-600 transition-colors"
        placeholder="输入代码..."
      />

      {runResult && (
        <div className={`mt-2 p-3 rounded-lg text-xs font-mono ${
          runResult.error ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] opacity-70">
              {runResult.error ? '执行错误' : '执行成功'} · {runResult.duration}ms
            </span>
            <button onClick={clearResult} className="text-zinc-500 hover:text-zinc-300">
              <X className="w-3 h-3" />
            </button>
          </div>
          {runResult.error ? (
            <pre className="whitespace-pre-wrap">{runResult.error}</pre>
          ) : (
            <pre className="whitespace-pre-wrap">{runResult.output.join('\n') || '无输出'}</pre>
          )}
        </div>
      )}
    </div>
  );
}
