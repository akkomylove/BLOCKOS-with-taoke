'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Play, Trash2, Loader2, Database, X, Eye, EyeOff } from 'lucide-react';
import { useBlockStore } from '@/store/blockStore';
import type { Block } from '@/types/block';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-kotlin';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-ruby';
import 'prismjs/components/prism-php';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-toml';
import 'prismjs/components/prism-graphql';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-powershell';
import 'prismjs/components/prism-docker';
import 'prismjs/components/prism-regex';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-scss';

interface CodeBlockProps {
  content: string;
  language?: string;
  onChange: (content: string, language?: string) => void;
  readOnly?: boolean;
}

const LANGUAGES = [
  { id: 'javascript', label: 'JavaScript' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'jsx', label: 'JSX' },
  { id: 'tsx', label: 'TSX' },
  { id: 'html', label: 'HTML' },
  { id: 'css', label: 'CSS' },
  { id: 'scss', label: 'SCSS' },
  { id: 'json', label: 'JSON' },
  { id: 'markdown', label: 'Markdown' },
  { id: 'python', label: 'Python' },
  { id: 'java', label: 'Java' },
  { id: 'kotlin', label: 'Kotlin' },
  { id: 'go', label: 'Go' },
  { id: 'rust', label: 'Rust' },
  { id: 'c', label: 'C' },
  { id: 'cpp', label: 'C++' },
  { id: 'csharp', label: 'C#' },
  { id: 'ruby', label: 'Ruby' },
  { id: 'php', label: 'PHP' },
  { id: 'sql', label: 'SQL' },
  { id: 'yaml', label: 'YAML' },
  { id: 'toml', label: 'TOML' },
  { id: 'graphql', label: 'GraphQL' },
  { id: 'bash', label: 'Bash' },
  { id: 'powershell', label: 'PowerShell' },
  { id: 'docker', label: 'Dockerfile' },
  { id: 'regex', label: 'Regex' },
];

const PRISM_LANGUAGE_MAP: Record<string, string> = {
  javascript: 'javascript',
  typescript: 'typescript',
  jsx: 'jsx',
  tsx: 'tsx',
  html: 'html',
  css: 'css',
  scss: 'scss',
  json: 'json',
  markdown: 'markdown',
  python: 'python',
  java: 'java',
  kotlin: 'kotlin',
  go: 'go',
  rust: 'rust',
  c: 'c',
  cpp: 'cpp',
  csharp: 'csharp',
  ruby: 'ruby',
  php: 'php',
  sql: 'sql',
  yaml: 'yaml',
  toml: 'toml',
  graphql: 'graphql',
  bash: 'bash',
  powershell: 'powershell',
  docker: 'docker',
  regex: 'regex',
};

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
  const [previewMode, setPreviewMode] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLPreElement>(null);
  const blocks = useBlockStore((state) => state.blocks);
  const getDependents = useBlockStore((state) => state.getDependents);

  useEffect(() => {
    if (previewMode && previewRef.current && content) {
      const prismLang = PRISM_LANGUAGE_MAP[language] || 'javascript';
      const grammar = Prism.languages[prismLang] || Prism.languages.javascript;
      if (!grammar) {
        previewRef.current.textContent = content;
        return;
      }
      try {
        const highlighted = Prism.highlight(content, grammar, prismLang);
        previewRef.current.innerHTML = highlighted;
      } catch {
        previewRef.current.textContent = content;
      }
    }
  }, [previewMode, content, language]);

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

  const executeCode = useCallback(async () => {
    if (!content.trim() || isRunning) return;
    setIsRunning(true);
    setRunResult(null);

    const startTime = performance.now();

    if (language === 'javascript') {
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
      return;
    }

    if (language === 'python') {
      try {
        const res = await fetch('/api/run-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: content, language: 'python' }),
        });
        const data = await res.json();
        setRunResult({
          output: data.output || [],
          error: data.error || null,
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
      return;
    }

    setIsRunning(false);
  }, [content, isRunning, language, blocks, parseRefs, tryParseJSON]);

  const insertRef = (block: Block) => {
    const varName = block.title || block.id.slice(0, 8);
    const refLine = `// @ref ${varName}\n`;
    const newContent = content + (content.endsWith('\n') ? '' : '\n') + refLine;
    onChange(newContent, language);
    setShowRefPicker(false);
  };

  const clearResult = () => setRunResult(null);

  const langLabel = LANGUAGES.find((l) => l.id === language)?.label || language;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShowLangDropdown(!showLangDropdown)}
              className="flex items-center gap-1 px-2 py-1 text-[11px] bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 rounded hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
            >
              {langLabel}
            </button>
            {showLangDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-xl z-10 py-1 min-w-[140px] max-h-48 overflow-y-auto">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.id}
                    onClick={() => {
                      onChange(content, lang.id);
                      setShowLangDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors ${
                      lang.id === language ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-zinc-400'
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => setShowRefPicker(!showRefPicker)}
            className="flex items-center gap-1 px-2 py-1 text-[11px] bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 rounded hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
          >
            <Database className="w-3 h-3" />
            引用
          </button>

          <button
            onClick={() => setPreviewMode(!previewMode)}
            className="flex items-center gap-1 px-2 py-1 text-[11px] bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 rounded hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
          >
            {previewMode ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            {previewMode ? '编辑' : '预览'}
          </button>

          {(language === 'javascript' || language === 'python') && (
            <button
              onClick={executeCode}
              disabled={isRunning}
              className="flex items-center gap-1 px-2 py-1 text-[11px] bg-emerald-500/10 dark:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 rounded hover:bg-emerald-500/20 dark:hover:bg-emerald-600/30 transition-colors disabled:opacity-50"
            >
              {isRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
              运行
            </button>
          )}
        </div>

        {(() => {
          const deps = getDependents(blocks.find((b) => b.content === content)?.id || '');
          return deps.length > 0 ? (
            <div className="flex items-center gap-1 mb-2 text-[10px] text-blue-500/70 dark:text-blue-400/60">
              <Database className="w-2.5 h-2.5" />
              被 {deps.length} 个 Block 引用
            </div>
          ) : null;
        })()}

        {!readOnly && (
          <button
            onClick={clearResult}
            className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded transition-colors text-gray-400 dark:text-zinc-500"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>

      {showRefPicker && (
        <div className="mb-2 p-2 bg-white/90 dark:bg-zinc-900/80 border border-gray-200 dark:border-zinc-800 rounded-lg max-h-32 overflow-y-auto">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-gray-400 dark:text-zinc-500">选择要引用的 Block</span>
            <button onClick={() => setShowRefPicker(false)} className="text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300">
              <X className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-1">
            {blocks.filter((b) => b.type === 'table' || b.type === 'text').map((block) => (
              <button
                key={block.id}
                onClick={() => insertRef(block)}
                className="w-full text-left px-2 py-1 text-xs text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded transition-colors"
              >
                <span className="text-gray-400 dark:text-zinc-500">[{block.type}]</span>{' '}
                {block.title || block.content.slice(0, 30) || block.id.slice(0, 8)}
              </button>
            ))}
            {blocks.filter((b) => b.type === 'table' || b.type === 'text').length === 0 && (
              <div className="text-xs text-gray-400 dark:text-zinc-600 py-1">没有可引用的 Block</div>
            )}
          </div>
        </div>
      )}

      {previewMode ? (
        <pre
          ref={previewRef}
          className="w-full h-32 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-lg p-3 text-xs font-mono text-gray-800 dark:text-zinc-300 overflow-auto"
        />
      ) : (
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => onChange(e.target.value, language)}
          readOnly={readOnly}
          spellCheck={false}
          className="w-full h-32 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-lg p-3 text-xs font-mono text-gray-800 dark:text-zinc-300 outline-none resize-y focus:border-gray-400 dark:focus:border-zinc-600 transition-colors"
          placeholder="输入代码..."
        />
      )}

      {runResult && (
        <div className={`mt-2 p-3 rounded-lg text-xs font-mono ${
          runResult.error ? 'bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] opacity-70">
              {runResult.error ? '执行错误' : '执行成功'} · {runResult.duration}ms
            </span>
            <button onClick={clearResult} className="text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300">
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
