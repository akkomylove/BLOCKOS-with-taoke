/* eslint-disable @next/next/no-img-element */
'use client';

import { Fragment, useState } from 'react';
import dynamic from 'next/dynamic';
import { CheckSquare, Square, ExternalLink } from 'lucide-react';
import type { Block } from '@/types/block';

const MathBlock = dynamic(() => import('../blocks/MathBlock'));
const ignoreChange = () => {};

export function safeMediaUrl(value: string): string | undefined {
  if (/^data:(image|audio|video)\//i.test(value)) return value;
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : undefined; }
  catch { return undefined; }
}

function inline(text: string) {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`')) return <code key={i}>{part.slice(1, -1)}</code>;
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      const href = safeMediaUrl(link[2]);
      if (href && !href.startsWith('data:')) return <a key={i} href={href} target="_blank" rel="noreferrer">{link[1]}</a>;
      return <Fragment key={i}>{link[1]}</Fragment>;
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

export function MobileText({ content }: { content: string }) {
  const lines = content.split('\n');
  const nodes = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('```')) {
      const code: string[] = [];
      const key = i;
      while (++i < lines.length && !lines[i].startsWith('```')) code.push(lines[i]);
      nodes.push(<pre key={key}><code>{code.join('\n')}</code></pre>);
    } else if (/^#{1,6}\s/.test(line)) {
      nodes.push(<h3 key={i}>{inline(line.replace(/^#{1,6}\s+/, ''))}</h3>);
    } else if (/^\s*[-*]\s/.test(line) || /^\s*\d+[.)]\s/.test(line)) {
      const text = line.replace(/^\s*(?:[-*]|\d+[.)])\s+/, '');
      const check = text.match(/^\[([ xX])\]\s*(.*)/);
      nodes.push(<div className="mw-list-line" key={i}>{check ? (check[1].trim() ? <CheckSquare size={17} /> : <Square size={17} />) : <span aria-hidden="true">•</span>}<span>{inline(check ? check[2] : text)}</span></div>);
    } else if (line.startsWith('>')) {
      nodes.push(<blockquote key={i}>{inline(line.replace(/^>\s?/, ''))}</blockquote>);
    } else if (line.trim()) nodes.push(<p key={i}>{inline(line)}</p>);
  }
  return <div className="mw-prose">{nodes.length ? nodes : <p className="mw-muted">暂无内容</p>}</div>;
}

export function readTable(content: string): { source: Record<string, unknown>; columns: string[]; rows: string[][] } | null {
  try {
    const source = JSON.parse(content);
    if (!source || typeof source !== 'object' || !Array.isArray(source.rows)) return null;
    const columns = source.columns || source.headers;
    if (!Array.isArray(columns)) return null;
    return { source, columns: columns.map(String), rows: source.rows.map((row: unknown) => Array.isArray(row) ? row.map((cell) => String(cell ?? '')) : []) };
  } catch { return null; }
}

function MobileTable({ content }: { content: string }) {
  const [limit, setLimit] = useState(5);
  const table = readTable(content);
  if (!table) return <div className="mw-prose"><p>表格格式暂不支持，请在电脑端检查。原始内容：</p><pre>{content}</pre></div>;
  return <div className="mw-table-records">
    <p className="mw-muted">{table.rows.length} 条记录 · 点击查看字段</p>
    {table.rows.slice(0, limit).map((row, index) => <details key={index}>
      <summary>{row[0] || `记录 ${index + 1}`}</summary>
      <dl>{table.columns.map((column, col) => <div key={col}><dt>{column}</dt><dd>{row[col] || '—'}</dd></div>)}</dl>
    </details>)}
    {table.rows.length > limit && <button className="mw-text-button" onClick={() => setLimit((value) => value + 10)}>继续显示（还有 {table.rows.length - limit} 条）</button>}
  </div>;
}

interface MindmapNode { text?: string; children?: MindmapNode[]; }
function MindmapOutline({ content }: { content: string }) {
  let root: MindmapNode;
  try { root = JSON.parse(content); } catch { return <MobileText content={content} />; }
  if (!root || typeof root.text !== 'string') return <MobileText content={content} />;
  let count = 0;
  const renderNode = (node: MindmapNode, depth: number, key: string): React.ReactNode => {
    if (++count > 300 || depth > 20) return <p key={key}>更多节点可在电脑端查看</p>;
    const children = Array.isArray(node.children) ? node.children : [];
    return children.length ? <details key={key} open={depth === 0}><summary>{node.text || '未命名节点'}</summary><div className="mw-tree-children">{children.map((child, i) => renderNode(child, depth + 1, `${key}-${i}`))}</div></details> : <p key={key}>{node.text || '未命名节点'}</p>;
  };
  return <div className="mw-tree">{renderNode(root, 0, 'root')}</div>;
}

export function canEditBlock(block: Block) {
  return ['text', 'quote', 'toggle', 'todo', 'code', 'math', 'callout', 'bookmark', 'mermaid'].includes(block.type) || (block.type === 'table' && !!readTable(block.content));
}

export default function MobileBlockContent({ block }: { block: Block }) {
  switch (block.type) {
    case 'text': case 'quote': case 'toggle': return <MobileText content={block.content} />;
    case 'todo': return <div className="mw-list-line">{block.meta.checked ? <CheckSquare size={19} aria-label="已勾选" /> : <Square size={19} aria-label="未勾选" />}<span>{block.content}</span></div>;
    case 'divider': return <hr />;
    case 'table': return <MobileTable content={block.content} />;
    case 'mindmap': return <MindmapOutline content={block.content} />;
    case 'code': return <details className="mw-attachment"><summary>查看代码 · {block.meta.language || '纯文本'}</summary><pre><code>{block.content}</code></pre></details>;
    case 'math': return <div className="mw-formula"><MathBlock content={block.content} onChange={ignoreChange} readOnly /></div>;
    case 'callout': {
      const emoji = block.meta.calloutIcon || block.meta.calloutEmoji || '💡';
      return (
        <div className="p-3 my-2 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20 text-sm">
          <div className="flex items-start gap-2">
            <span className="text-lg shrink-0">{emoji}</span>
            <div className="flex-1 min-w-0">
              <MobileText content={block.content || '暂无内容'} />
            </div>
          </div>
        </div>
      );
    }
    case 'countdown': {
      const title = block.title || block.meta.countdownTitle || '冲刺目标倒计时';
      const target = block.meta.targetDate
        ? `${block.meta.targetDate} ${block.meta.targetTime || '18:00'}`
        : block.meta.countdownTarget
          ? new Date(block.meta.countdownTarget).toLocaleString('zh-CN')
          : '未设定时间';
      return (
        <div className="p-3 my-2 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 text-sm">
          <div className="font-semibold text-emerald-900 dark:text-emerald-300">{title}</div>
          <div className="text-xs text-emerald-700/80 dark:text-emerald-400/80 mt-1">目标时间：{target}</div>
        </div>
      );
    }
    case 'bookmark': {
      const url = block.meta.bookmarkUrl || block.content || 'https://';
      const title = block.meta.bookmarkTitle || block.title || '外部链接';
      const desc = block.meta.bookmarkDesc;
      return (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="block p-3 my-2 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/30 dark:bg-indigo-950/20 hover:bg-indigo-50/60 transition-colors text-sm"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-indigo-900 dark:text-indigo-200 truncate">{title}</span>
            <ExternalLink size={15} className="shrink-0 text-indigo-500" />
          </div>
          {desc && <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1 line-clamp-2">{desc}</p>}
          <span className="text-[11px] text-indigo-600/80 dark:text-indigo-400/80 truncate block mt-1">{url}</span>
        </a>
      );
    }
    case 'mermaid': {
      return (
        <details className="mw-attachment my-2" open>
          <summary>架构流程图代码 ({block.title || 'Mermaid'})</summary>
          <pre><code>{block.content}</code></pre>
        </details>
      );
    }
    case 'media': case 'whiteboard': {
      const url = safeMediaUrl(block.content);
      if (!url) return <div className="mw-attachment"><p>此内容暂不支持手机预览</p>{block.content && <details><summary>查看原始内容</summary><pre>{block.content}</pre></details>}</div>;
      const clean = url.split(/[?#]/)[0];
      const image = url.startsWith('data:image/') || /\.(png|jpe?g|webp|gif|svg|bmp)$/i.test(clean) || block.type === 'whiteboard';
      const video = url.startsWith('data:video/') || /\.(mp4|webm|mov)$/i.test(clean);
      const audio = url.startsWith('data:audio/') || /\.(mp3|wav|m4a|ogg)$/i.test(clean);
      return <figure className="mw-media">{image ? <img src={url} alt={block.meta.caption || block.title || '文档图片'} loading="lazy" /> : video ? <video src={url} controls playsInline preload="metadata" /> : audio ? <audio src={url} controls preload="metadata" /> : <a href={url} target="_blank" rel="noreferrer">打开附件 <ExternalLink size={15} /></a>}{block.meta.caption && <figcaption>{block.meta.caption}</figcaption>}</figure>;
    }
  }
}
