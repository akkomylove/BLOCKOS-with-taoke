'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useAccountStore } from '@/store/accountStore';
const AccountPanel = dynamic(() => import('@/components/collaboration/ProfilePanel').then(module => module.ProfilePanel), { ssr: false });
import { ArrowLeft, BookOpen, Check, ChevronLeft, ChevronRight, Cloud, Folder, Inbox, Loader2, LogIn, Moon, Plus, Search, Sun } from 'lucide-react';
import { ThemeProvider, useTheme } from '@/components/ThemeProvider';
import { useBlockStore } from '@/store/blockStore';
import { useMobileDocuments } from '@/hooks/useMobileDocuments';
import { blockTitle, buildReadingChapters } from '@/lib/document-outline';
import type { Block } from '@/types/block';
import MobileBlockContent, { canEditBlock } from './MobileBlockContent';
import { MobileBlockEditor, MobileCapture, MobileOutlineEditor } from './MobileEditors';
import './mobile.css';

type Screen = 'library' | 'overview' | 'reading' | 'edit' | 'capture' | 'inbox' | 'outline' | 'choose-edit' | 'new' | 'note';
const signIn = () => { window.location.href = '/login'; };

function MobileWorkspaceContent() {
  const account = useAccountStore(state => state.user);
  const [showAccount, setShowAccount] = useState(false);
  const documents = useMobileDocuments();
  const pages = useBlockStore((state) => state.pages);
  const folders = useBlockStore((state) => state.folders);
  const groups = useBlockStore((state) => state.groups);
  const currentPageId = useBlockStore((state) => state.currentPageId);
  const blocks = useBlockStore((state) => state.blocks);
  const userId = useBlockStore((state) => state.currentUserId);
  const { theme, toggleTheme } = useTheme();
  const [screen, setScreen] = useState<Screen>('library');
  const [chapterId, setChapterId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Block | null>(null);
  const [editReturn, setEditReturn] = useState<Screen>('reading');
  const [folderId, setFolderId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [noteId, setNoteId] = useState<string | null>(null);
  const [lastChapterId, setLastChapterId] = useState<string | null>(null);
  const contentRef = useRef<HTMLElement>(null);
  const page = pages.find((item) => item.id === currentPageId);
  const chapters = useMemo(() => buildReadingChapters(page || {}, blocks, groups), [page, blocks, groups]);
  const chapterIndex = chapters.findIndex((chapter) => chapter.id === chapterId);
  const chapter = chapters[chapterIndex];
  const note = blocks.find((block) => block.id === noteId);
  const inboxPage = pages.find((item) => item.kind === 'inbox');
  const saving = busy || documents.saveState === 'saving';
  const editable = documents.session === 'ready';
  const docs = pages.filter((item) => item.kind !== 'inbox');
  const matchingDocs = docs.filter((item) => search ? item.title.toLowerCase().includes(search.toLowerCase()) : folderId ? item.folderId === folderId : true)
    .sort((a, b) => b.updatedAt - a.updatedAt);

  useEffect(() => { contentRef.current?.scrollTo?.({ top: 0 }); }, [screen, chapterId, currentPageId]);

  async function openDocument(id: string) {
    if (await documents.openPage(id)) {
      try { setLastChapterId(localStorage.getItem(`blockos-mobile-reading:${userId || 'guest'}:${id}`)); }
      catch { setLastChapterId(null); }
      setScreen('overview'); setChapterId(null);
    }
  }
  function readChapter(id: string) {
    setChapterId(id); setScreen('reading'); setLastChapterId(id);
    try { localStorage.setItem(`blockos-mobile-reading:${userId || 'guest'}:${currentPageId}`, id); } catch {}
  }
  function startEdit(block: Block, returnTo: Screen = 'reading') {
    if (!editable) { signIn(); return; }
    documents.setError(''); setEditing(block); setEditReturn(returnTo); setScreen('edit');
  }
  async function appendText(returnTo: 'reading' | 'overview') {
    if (!editable || saving) return;
    setBusy(true);
    try {
      const state = useBlockStore.getState();
      const bottom = state.blocks.reduce((max, block) => Math.max(max, block.y + (block.height || 240)), 0);
      const id = state.addBlock('text', undefined, { x: 40, y: bottom + 60 });
      const updated = useBlockStore.getState().blocks;
      if (!await documents.saveBlocks(currentPageId, updated)) return;
      if (returnTo === 'reading' && chapter) {
        const outline = chapters.map((item) => ({ id: item.id, title: item.title, blockIds: item.id === chapter.id ? [...item.blockIds, id] : item.blockIds }));
        if (!await documents.saveOutline(outline)) return;
      }
      const block = updated.find((item) => item.id === id);
      if (block) startEdit(block, returnTo);
    } finally { setBusy(false); }
  }
  async function showInbox() {
    if (inboxPage && !await documents.openPage(inboxPage.id)) return;
    setScreen('inbox');
  }
  function back() {
    documents.setError('');
    if (screen === 'reading' || screen === 'choose-edit' || screen === 'outline') setScreen('overview');
    else if (screen === 'edit') setScreen(editReturn);
    else if (screen === 'note') setScreen('inbox');
    else setScreen('library');
  }

  if (screen === 'edit' && editing && userId) return <div className="mobile-workspace"><MobileBlockEditor key={editing.id} userId={userId} block={editing} saving={saving} error={documents.error} onBack={back} onSave={async (content, title) => {
    const state = useBlockStore.getState();
    const updated = state.blocks.map((block) => block.id === editing.id ? { ...block, content, title, updatedAt: Date.now() } : block);
    return documents.saveBlocks(state.currentPageId, updated);
  }} /></div>;

  if (screen === 'capture' && userId) return <div className="mobile-workspace"><MobileCapture userId={userId} saving={saving} error={documents.error} onBack={back} onSave={async (content) => {
    setBusy(true);
    try {
      const result = await documents.captureNote(content);
      setNoteId(result.noteId); setScreen('inbox');
      return true;
    } catch (err) { documents.setError(err instanceof Error ? err.message : '记录保存失败，草稿已保留'); return false; }
    finally { setBusy(false); }
  }} /></div>;

  if (screen === 'outline') return <div className="mobile-workspace"><MobileOutlineEditor key={currentPageId} chapters={chapters} blocks={blocks} saving={saving} error={documents.error} onBack={back} onSave={documents.saveOutline} /></div>;

  const isLibrary = screen === 'library';
  const isReading = screen === 'reading' && !!chapter;
  const savedLabel = documents.saveState === 'saving' ? '正在保存' : documents.saveState === 'saved' ? '已保存至云端' : documents.saveState === 'pending' ? '修改保留在本机，待同步' : documents.saveState === 'conflict' ? '本机修改待合并' : editable ? '云端文档' : '示例阅读';

  return <div className="mobile-workspace" data-testid="mobile-workspace">
    <header className="mw-header">
      {isLibrary || screen === 'inbox' ? <button className="mw-brand" onClick={() => { setScreen('library'); setFolderId(null); }}><span>B</span>BlockOS</button> : <button className="mw-icon-button" onClick={back} aria-label={isReading ? '返回章节目录' : '返回文档列表'}><ArrowLeft size={21} /></button>}
      {!isLibrary && screen !== 'inbox' && <span className="mw-header-title">{isReading ? page?.title : screen === 'new' ? '新建文档' : screen === 'note' ? '收件箱' : '文档目录'}</span>}
      {isReading ? <button className="mw-text-button" disabled={!chapter.blocks.some(canEditBlock) || saving} onClick={() => {
        if (!editable) { signIn(); return; }
        const candidates = chapter.blocks.filter(canEditBlock);
        if (candidates.length === 1) startEdit(candidates[0]); else setScreen('choose-edit');
      }}>编辑</button> : <div className="mw-header-actions"><button className="mw-icon-button" aria-label={theme === 'dark' ? '切换浅色' : '切换深色'} onClick={toggleTheme}>{theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}</button>{!editable && documents.session !== 'loading' && <button className="mw-text-button" onClick={signIn}><LogIn size={17} />登录</button>}</div>}
    </header>

    {(documents.error || documents.saveState === 'pending' || documents.saveState === 'conflict') && screen !== 'new' && <div className="mw-status-banner" role="status"><span>{documents.error || savedLabel}</span>{documents.saveState === 'pending' && <button disabled={saving} onClick={() => void documents.retrySave()}>重试保存</button>}</div>}

    {editable && <div className="flex items-center justify-between px-5 py-2 text-xs"><button onClick={() => setShowAccount(true)} className="text-blue-500">{account?.mode === 'enterprise' ? '企业模式' : '个人模式'} · 账号中心</button>{account?.mode === 'enterprise' && <Link className="text-blue-500" href="/teams">企业协作</Link>}</div>}
    {showAccount && <AccountPanel isOpen onClose={() => setShowAccount(false)} />}
    <main className="mw-main" ref={contentRef} aria-busy={documents.loading || documents.session === 'loading'}>
      {documents.session === 'loading' && !documents.error ? <div className="mw-empty"><Loader2 className="animate-spin" size={25} /><p>正在打开文档…</p></div> : documents.loading ? <div className="mw-empty"><Loader2 className="animate-spin" size={25} /><p>正在读取内容…</p></div> : <>
        {isLibrary && <>
          <p className="mw-eyebrow">随时读，随手记</p><div className="mw-page-heading"><h1>{folderId ? folders.find((folder) => folder.id === folderId)?.name || '文件夹' : '文档'}</h1>{editable && <button className="mw-icon-button" aria-label="新建文档" onClick={() => setScreen('new')}><Plus size={22} /></button>}</div>
          <label className="mw-search"><Search size={18} /><input aria-label="搜索文档" type="search" placeholder="搜索文档…" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
          {folderId && <button className="mw-text-button" onClick={() => setFolderId(null)}><ChevronLeft size={16} />全部文件夹</button>}
          {!folderId && !search && folders.map((folder) => <button key={folder.id} className="mw-document-row" onClick={() => setFolderId(folder.id)}><span className="mw-file-icon"><Folder size={21} /></span><span className="mw-row-copy"><strong>{folder.name}</strong><small>{docs.filter((doc) => doc.folderId === folder.id).length} 份文档</small></span><ChevronRight size={17} /></button>)}
          <p className="mw-list-label">{search ? '搜索结果' : folderId ? '文件夹中的文档' : '最近文档'}</p>
          {matchingDocs.map((doc) => <button className="mw-document-row" key={doc.id} onClick={() => void openDocument(doc.id)}><span className="mw-file-icon"><BookOpen size={21} /></span><span className="mw-row-copy"><strong>{doc.title}</strong><small>{doc.chapters ? `${doc.chapters.length} 个章节` : '打开章节目录'}{doc.updatedAt > 0 ? ` · ${new Date(doc.updatedAt).toLocaleDateString('zh-CN')}` : ''}</small></span><ChevronRight size={17} /></button>)}
          {!matchingDocs.length && <div className="mw-empty"><BookOpen size={30} /><p>{search ? '没有找到匹配的文档' : '这里还没有文档'}</p>{editable && !search && <button className="mw-secondary-button" onClick={() => setScreen('new')}>创建第一份文档</button>}</div>}
          {!editable && documents.session === 'guest' && <p className="mw-caption">当前可阅读示例。登录后可访问自己的云端文档、编辑和记录。</p>}
        </>}

        {screen === 'overview' && page && <>
          <p className="mw-eyebrow">{page.folderId ? folders.find((folder) => folder.id === page.folderId)?.name || '文件夹' : '我的文档'}</p><h1>{page.title}</h1>
          <p className="mw-caption">{chapters.length} 个章节 · {blocks.length} 段内容</p>
          {lastChapterId && chapters.some((item) => item.id === lastChapterId) && <button className="mw-resume" onClick={() => readChapter(lastChapterId)}><span>继续上次阅读</span><strong>{chapters.find((item) => item.id === lastChapterId)?.title}</strong><span>继续阅读 <ChevronRight size={16} /></span></button>}
          <div className="mw-section-heading"><h2>章节目录</h2>{editable && <button className="mw-text-button" disabled={documents.saveState === 'pending' || documents.saveState === 'conflict'} onClick={() => setScreen('outline')}>整理章节</button>}</div>
          {chapters.map((item, index) => <button key={item.id} className="mw-chapter-row" onClick={() => readChapter(item.id)}><span className="mw-number">{String(index + 1).padStart(2, '0')}</span><span className="mw-row-copy"><strong>{item.title}</strong><small>{item.blocks.length} 段内容</small></span><ChevronRight size={17} /></button>)}
          {!chapters.length && <div className="mw-empty"><p>文档还没有内容</p>{editable && <button disabled={saving} className="mw-secondary-button" onClick={() => void appendText('overview')}>写下第一段</button>}</div>}
        </>}

        {isReading && <>
          <p className="mw-eyebrow">第 {chapterIndex + 1} / {chapters.length} 节</p><h1>{chapter.title}</h1>
          <div className="mw-chapter-body">{chapter.blocks.map((block) => <section className="mw-block" key={block.id}>{chapter.blocks.length > 1 && block.title && block.title !== chapter.title && <h2>{block.title}</h2>}<MobileBlockContent block={block} /></section>)}</div>
          {!chapter.blocks.length && <p className="mw-caption">本章还没有内容，可以在整理章节中添加内容归属。</p>}
          {editable && <button className="mw-secondary-button" disabled={saving || documents.saveState === 'pending' || documents.saveState === 'conflict'} onClick={() => void appendText('reading')}><Plus size={17} />追加正文</button>}
          <button className="mw-text-button" onClick={() => setScreen('overview')}>打开章节目录</button>
          <p className="mw-save-indicator" aria-live="polite">{documents.saveState === 'saved' ? <Check size={14} /> : <Cloud size={14} />}{savedLabel}</p>
        </>}

        {screen === 'choose-edit' && chapter && <><p className="mw-eyebrow">{chapter.title}</p><h1>选择要编辑的内容</h1>{chapter.blocks.filter(canEditBlock).map((block) => <button className="mw-document-row" key={block.id} onClick={() => startEdit(block)}><span className="mw-row-copy"><strong>{blockTitle(block)}</strong><small>{block.type === 'table' ? '按记录编辑表格' : '打开正文编辑'}</small></span><ChevronRight size={18} /></button>)}</>}

        {screen === 'inbox' && <><p className="mw-eyebrow">先保存，稍后整理</p><h1>收件箱</h1>{inboxPage && currentPageId === inboxPage.id && blocks.length ? [...blocks].sort((a, b) => b.createdAt - a.createdAt).map((block) => {
          const preview = (block.content.startsWith(block.title) ? block.content.slice(block.title.length).trim() : block.content).slice(0, 100);
          return <button key={block.id} className="mw-note-row" onClick={() => { setNoteId(block.id); setScreen('note'); }}><strong>{blockTitle(block)}</strong>{preview && <span>{preview}</span>}<small>{new Date(block.createdAt).toLocaleString('zh-CN')}</small></button>;
        }) : <div className="mw-empty"><Inbox size={32} /><p>这里留给尚未整理的想法</p><p className="mw-caption">点击下方 ＋，先记下一条。</p></div>}</>}
        {screen === 'note' && note && <><p className="mw-eyebrow">随手记录</p><h1>{blockTitle(note)}</h1>{note.content.trim() !== note.title.trim() && <MobileBlockContent block={note} />}{editable && <button className="mw-secondary-button" onClick={() => startEdit(note, 'note')}>编辑记录</button>}<p className="mw-caption">电脑端可在「随手记收件箱」文档中继续整理。</p></>}

        {screen === 'new' && <form onSubmit={async (event) => {
          event.preventDefault(); if (!newTitle.trim() || busy) return; setBusy(true);
          try { const created = await documents.createPage(newTitle.trim()); setNewTitle(''); await openDocument(created.id); }
          catch (err) { documents.setError(err instanceof Error ? err.message : '文档创建失败'); }
          finally { setBusy(false); }
        }}><p className="mw-eyebrow">云端文档</p><h1>给文档起个名字</h1><label className="mw-field-label" htmlFor="mobile-new-title">文档标题</label><input id="mobile-new-title" autoFocus maxLength={200} className="mw-title-input" placeholder="例如：产品需求说明" value={newTitle} onChange={(event) => setNewTitle(event.target.value)} /><button className="mw-primary-button" disabled={busy || !newTitle.trim()}>{busy ? '创建中…' : '创建文档'}</button>{documents.error && <p role="alert" className="mw-error">{documents.error}</p>}</form>}
      </>}
    </main>

    {isReading ? <footer className="mw-reading-footer"><button className="mw-text-button" disabled={chapterIndex === 0} onClick={() => readChapter(chapters[chapterIndex - 1].id)}>上一节</button><span>{chapterIndex + 1} / {chapters.length}</span><button className="mw-text-button" disabled={chapterIndex === chapters.length - 1} onClick={() => readChapter(chapters[chapterIndex + 1].id)}>下一节</button></footer>
      : !['new', 'choose-edit', 'note'].includes(screen) && <nav className="mw-bottom-nav" aria-label="主要入口"><button aria-current={screen !== 'inbox' ? 'page' : undefined} onClick={() => setScreen('library')}><BookOpen size={21} /><span>文档</span></button><button className="mw-capture-button" aria-label="随手记" disabled={documents.session === 'loading'} onClick={() => { if (!editable) { signIn(); return; } documents.setError(''); setScreen('capture'); }}><Plus size={23} /></button><button aria-current={screen === 'inbox' ? 'page' : undefined} onClick={() => void showInbox()}><Inbox size={21} /><span>收件箱</span></button></nav>}
  </div>;
}

export default function MobileWorkspace() {
  return <ThemeProvider><MobileWorkspaceContent /></ThemeProvider>;
}
