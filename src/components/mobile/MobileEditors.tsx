'use client';

import { useEffect, useState } from 'react';
import { nanoid } from 'nanoid';
import { ArrowDown, ArrowLeft, ArrowUp, Plus, Trash2 } from 'lucide-react';
import type { Block } from '@/types/block';
import type { DocumentChapter } from '@/types/page';
import { blockTitle, type ReadingChapter } from '@/lib/document-outline';
import { readTable } from './MobileBlockContent';

function useDraft(key: string, original: string) {
  const [value, setValue] = useState(() => {
    try { return localStorage.getItem(key) ?? original; } catch { return original; }
  });
  useEffect(() => {
    if (value === original) return;
    try { localStorage.setItem(key, value); } catch { /* Keep the visible input available when device storage is full. */ }
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [key, original, value]);
  const clear = () => { try { localStorage.removeItem(key); } catch {} };
  return { value, setValue, clear };
}

export function MobileBlockEditor({ block, userId, saving, error, onBack, onSave }: {
  block: Block; userId: string; saving: boolean; error: string;
  onBack: () => void; onSave: (content: string, title: string) => Promise<boolean>;
}) {
  const draft = useDraft(`blockos-mobile-edit:${userId}:${block.id}`, JSON.stringify({ title: block.title, content: block.content }));
  const [tableIndex, setTableIndex] = useState(0);
  let parsed: { title: string; content: string };
  try {
    parsed = JSON.parse(draft.value);
    if (!parsed || typeof parsed.title !== 'string' || typeof parsed.content !== 'string') throw new Error('Invalid draft');
  } catch { parsed = { title: block.title, content: block.content }; }
  const table = block.type === 'table' ? readTable(parsed.content) : null;
  const update = (changes: Partial<typeof parsed>) => draft.setValue(JSON.stringify({ ...parsed, ...changes }));
  const save = async () => { if (await onSave(parsed.content, parsed.title)) { draft.clear(); onBack(); } };
  return <>
    <header className="mw-header"><button className="mw-icon-button" aria-label="返回阅读" onClick={onBack} disabled={saving}><ArrowLeft size={21} /></button><span>编辑当前内容</span><button className="mw-text-button" disabled={saving} onClick={() => void save()}>{saving ? '保存中…' : '保存'}</button></header>
    <main className="mw-editor-main">
      <label className="mw-field-label" htmlFor="mobile-block-title">内容标题</label>
      <input id="mobile-block-title" className="mw-title-input" value={parsed.title} maxLength={200} onChange={(event) => update({ title: event.target.value })} placeholder={blockTitle(block)} />
      {table ? <div className="mw-table-editor"><label>选择记录<select aria-label="选择要编辑的记录" value={tableIndex} onChange={(event) => setTableIndex(Number(event.target.value))}>{table.rows.map((row, index) => <option key={index} value={index}>{row[0] || `记录 ${index + 1}`}</option>)}</select></label>{table.rows.slice(tableIndex, tableIndex + 1).map((row) => <fieldset key={tableIndex}><legend>记录 {tableIndex + 1}</legend>{table.columns.map((column, col) => <label key={col}>{column}<textarea rows={2} value={row[col] || ''} onChange={(event) => {
        const index = tableIndex;
        const rows = table.rows.map((r, ri) => ri === index ? table.columns.map((_, ci) => ci === col ? event.target.value : r[ci] || '') : r);
        update({ content: JSON.stringify({ ...table.source, rows }) });
      }} /></label>)}</fieldset>)}</div>
        : <><label className="mw-field-label" htmlFor="mobile-block-content">正文</label><textarea id="mobile-block-content" className="mw-content-input" value={parsed.content} onChange={(event) => update({ content: event.target.value })} spellCheck={block.type !== 'code'} /></>}
      <p className="mw-caption">草稿暂存在本机，点击保存后同步云端。桌面布局保持不变。</p>
      {error && <p role="alert" className="mw-error">{error}</p>}
    </main>
  </>;
}

export function MobileCapture({ userId, saving, error, onBack, onSave }: {
  userId: string; saving: boolean; error: string; onBack: () => void; onSave: (content: string) => Promise<boolean>;
}) {
  const draft = useDraft(`blockos-mobile-capture:${userId}`, '');
  return <>
    <header className="mw-header"><button className="mw-icon-button" aria-label="返回" onClick={onBack} disabled={saving}><ArrowLeft size={21} /></button><span>随手记</span><button className="mw-text-button" disabled={saving || !draft.value.trim()} onClick={async () => { if (await onSave(draft.value)) draft.clear(); }}>{saving ? '保存中…' : '存入收件箱'}</button></header>
    <main className="mw-editor-main"><p className="mw-eyebrow">先记下来，稍后整理</p><h1>此刻的想法</h1><label className="mw-sr-only" htmlFor="mobile-capture-content">随手记录内容</label><textarea id="mobile-capture-content" className="mw-content-input" placeholder="记一个想法，或粘贴一段内容…" value={draft.value} maxLength={20000} onChange={(event) => draft.setValue(event.target.value)} /><p className="mw-caption">无需先选文档。记录会保存到「随手记收件箱」。</p>{error && <p role="alert" className="mw-error">{error}</p>}</main>
  </>;
}

export function MobileOutlineEditor({ chapters, blocks, saving, error, onBack, onSave }: {
  chapters: ReadingChapter[]; blocks: Block[]; saving: boolean; error: string;
  onBack: () => void; onSave: (chapters: DocumentChapter[]) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState<DocumentChapter[]>(() => chapters.map(({ id, title, blockIds }) => ({ id, title, blockIds: [...blockIds] })));
  const [validation, setValidation] = useState('');
  const assigned = new Set(draft.flatMap((chapter) => chapter.blockIds));
  const unassigned = blocks.filter((block) => !assigned.has(block.id));
  const move = (index: number, step: number) => setDraft((current) => {
    const copy = [...current]; [copy[index], copy[index + step]] = [copy[index + step], copy[index]]; return copy;
  });
  const assign = (blockId: string, target: string) => setDraft((current) => current.map((chapter) => ({ ...chapter, blockIds: chapter.id === target ? [...chapter.blockIds.filter((id) => id !== blockId), blockId] : chapter.blockIds.filter((id) => id !== blockId) })));
  const save = async () => {
    if (draft.some((chapter) => !chapter.title.trim())) { setValidation('请填写章节标题'); return; }
    if (await onSave(draft.map((chapter) => ({ ...chapter, title: chapter.title.trim() })))) onBack();
  };
  return <>
    <header className="mw-header"><button className="mw-icon-button" aria-label="返回目录" onClick={onBack} disabled={saving}><ArrowLeft size={21} /></button><span>整理章节</span><button className="mw-text-button" disabled={saving} onClick={() => void save()}>{saving ? '保存中…' : '保存'}</button></header>
    <main className="mw-outline-main"><p className="mw-caption">一章可包含多段内容。这里只调整阅读归属和顺序，保留画布位置。</p>
      {draft.map((chapter, index) => <fieldset className="mw-chapter-editor" key={chapter.id}>
        <legend>第 {index + 1} 节</legend>
        <label className="mw-sr-only" htmlFor={`chapter-${chapter.id}`}>第 {index + 1} 节标题</label><input id={`chapter-${chapter.id}`} value={chapter.title} maxLength={200} placeholder="章节标题" onChange={(event) => setDraft((current) => current.map((item) => item.id === chapter.id ? { ...item, title: event.target.value } : item))} />
        <div className="mw-outline-actions"><button className="mw-icon-button" aria-label={`上移${chapter.title}`} disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp size={18} /></button><button className="mw-icon-button" aria-label={`下移${chapter.title}`} disabled={index === draft.length - 1} onClick={() => move(index, 1)}><ArrowDown size={18} /></button><button className="mw-icon-button" aria-label={`移除章节${chapter.title}，保留内容`} onClick={() => setDraft((current) => current.filter((item) => item.id !== chapter.id))}><Trash2 size={18} /></button></div>
        {chapter.blockIds.map((id, blockIndex) => {
          const block = blocks.find((item) => item.id === id);
          return block ? <div className="mw-assignment" key={id}><span>{blockTitle(block)}</span><select aria-label={`${blockTitle(block)}所属章节`} value={chapter.id} onChange={(event) => assign(id, event.target.value)}><option value="">未分章</option>{draft.map((item) => <option key={item.id} value={item.id}>{item.title || '未命名章节'}</option>)}</select><button className="mw-icon-button" disabled={blockIndex === 0} aria-label={`上移内容${blockTitle(block)}`} onClick={() => setDraft((current) => current.map((item) => {
            if (item.id !== chapter.id) return item;
            const ids = [...item.blockIds]; [ids[blockIndex - 1], ids[blockIndex]] = [ids[blockIndex], ids[blockIndex - 1]]; return { ...item, blockIds: ids };
          }))}><ArrowUp size={16} /></button></div> : null;
        })}
        {!chapter.blockIds.length && <p className="mw-caption">可将其他内容移到这一章</p>}
      </fieldset>)}
      <button className="mw-secondary-button" onClick={() => setDraft((current) => [...current, { id: nanoid(), title: '', blockIds: [] }])}><Plus size={18} />新增章节</button>
      {unassigned.length > 0 && <section><h2>未分章内容</h2>{unassigned.map((block) => <label className="mw-assignment" key={block.id}><span>{blockTitle(block)}</span><select aria-label={`${blockTitle(block)}所属章节`} value="" onChange={(event) => assign(block.id, event.target.value)}><option value="">选择章节</option>{draft.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.title || '未命名章节'}</option>)}</select></label>)}</section>}
      {(validation || error) && <p role="alert" className="mw-error">{validation || error}</p>}
    </main>
  </>;
}
