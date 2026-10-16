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
  return ['text', 'quote', 'toggle', 'todo', 'code', 'math'].includes(block.type) || (block.type === 'table' && !!readTable(block.content));
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
