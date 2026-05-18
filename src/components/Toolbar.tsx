'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  Bot, Activity, Trash2, Sparkles, GitBranch, Undo2, Redo2, HelpCircle,
  Search, Download, Upload, CopyPlus, Wand2, Layers, Sun, Moon, History, Users,
  LogOut, UserCircle, LayoutGrid, FileText, Command
} from 'lucide-react';
import Logo from '@/components/Logo';
import { useBlockStore } from '@/store/blockStore';
import { useTheme } from '@/components/ThemeProvider';


interface ToolbarProps {
  onToggleLogs: () => void;
  showLogs: boolean;
  onToggleAIAssistant: () => void;
  onToggleRelationDrawer: () => void;
  onToggleHelp: () => void;
  onToggleSearch: () => void;
  onToggleImport: () => void;
  onToggleExport: () => void;
  onToggleGroupPanel: () => void;
  showGroupPanel: boolean;
  onToggleHistory: () => void;
  onOpenProfile: () => void;
}

export default function Toolbar({
  onToggleLogs, showLogs, onToggleAIAssistant, onToggleRelationDrawer,
  onToggleHelp, onToggleSearch, onToggleImport, onToggleExport,
  onToggleGroupPanel, showGroupPanel, onToggleHistory, onOpenProfile,
}: ToolbarProps) {
  const router = useRouter();
  const agentEnabled = useBlockStore((state) => state.agentEnabled);
  const toggleAgent = useBlockStore((state) => state.toggleAgent);
  const selectedIds = useBlockStore((state) => state.selectedIds);
  const deleteBlock = useBlockStore((state) => state.deleteBlock);
  const clearSelection = useBlockStore((state) => state.clearSelection);
  const duplicateBlock = useBlockStore((state) => state.duplicateBlock);
  const undo = useBlockStore((state) => state.undo);
  const redo = useBlockStore((state) => state.redo);
  const canUndo = useBlockStore((state) => state.canUndo);
  const canRedo = useBlockStore((state) => state.canRedo);
  const currentPageId = useBlockStore((state) => state.currentPageId);
  const pages = useBlockStore((state) => state.pages);
  const updatePageTitle = useBlockStore((state) => state.updatePageTitle);
  const blocks = useBlockStore((state) => state.blocks);
  const updateBlock = useBlockStore((state) => state.updateBlock);
  const { theme, toggleTheme } = useTheme();

  const currentPage = pages.find((p) => p.id === currentPageId);
  const [formatting, setFormatting] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const res = await fetch('/api/auth/user');
        if (res.ok) {
          const data = await res.json();
          setUserName(data.name || '用户');
        }
      } catch (err) {
        console.error('Failed to load user info:', err);
      }
    };
    loadUserInfo();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const handleDeleteSelected = () => {
    selectedIds.forEach((id) => deleteBlock(id));
    clearSelection();
  };

  const handleDuplicateSelected = () => {
    selectedIds.forEach((id) => duplicateBlock(id));
    clearSelection();
  };

  const handleFormatDocument = async () => {
    const textBlock = blocks.find((b) => selectedIds.includes(b.id) && b.type === 'text');
    if (!textBlock) return;
    setFormatting(true);
    try {
      const res = await fetch('/api/ai/format-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: textBlock.content }),
      });
      if (!res.ok) throw new Error('Format failed');
      const html = await res.text();
      const cleanHtml = html.replace(/```html/g, '').replace(/```/g, '').trim();
      updateBlock(textBlock.id, { content: cleanHtml });
    } catch {
      alert('AI 格式化失败，请检查网络或 API 配置');
    } finally {
      setFormatting(false);
    }
  };

  const isTextSelected = selectedIds.length === 1 && blocks.find((b) => b.id === selectedIds[0])?.type === 'text';

  const iconBtn = 'flex items-center justify-center w-8 h-8 rounded-lg text-xs transition-colors hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200';
  const iconBtnActive = 'flex items-center justify-center w-8 h-8 rounded-lg text-xs transition-colors bg-purple-500/10 dark:bg-purple-500/15 text-purple-600 dark:text-purple-300';
  const iconBtnBlue = 'flex items-center justify-center w-8 h-8 rounded-lg text-xs transition-colors bg-blue-500/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-300';

  return (
    <>
      <div className="h-11 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-zinc-700 flex items-center justify-between px-3 shrink-0">
      {/* Left: Logo + Page Title */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1.5">
          <Logo size={16} />
          <span className="text-sm font-semibold text-gray-900 dark:text-zinc-100 tracking-tight">BlockOS</span>
        </div>
        <div className="h-4 w-px bg-gray-300 dark:bg-zinc-700 mx-1" />
        {currentPage && (
          <input
            className="bg-transparent text-sm text-gray-600 dark:text-zinc-300 outline-none hover:text-gray-900 dark:hover:text-zinc-100 focus:text-gray-900 dark:focus:text-zinc-100 transition-colors w-40 lg:w-56"
            value={currentPage.title}
            onChange={(e) => updatePageTitle(currentPage.id, e.target.value)}
          />
        )}
      </div>

      {/* Center: Main Actions */}
      <div className="flex items-center gap-0.5">
        {/* AI Group */}
        <button onClick={onToggleAIAssistant} className={iconBtnBlue} title="AI 助手">
          <Sparkles className="w-4 h-4" />
        </button>
        <button onClick={toggleAgent} className={agentEnabled ? iconBtnActive : iconBtn} title="Agent">
          <Bot className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-gray-300 dark:bg-zinc-700 mx-1" />

        {/* Edit Group */}
        <button onClick={undo} disabled={!canUndo()} className={`${iconBtn} disabled:opacity-30`} title="撤销">
          <Undo2 className="w-4 h-4" />
        </button>
        <button onClick={redo} disabled={!canRedo()} className={`${iconBtn} disabled:opacity-30`} title="重做">
          <Redo2 className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-gray-300 dark:bg-zinc-700 mx-1" />

        {/* View Group */}
        <button onClick={onToggleGroupPanel} className={showGroupPanel ? iconBtnActive : iconBtn} title="导航">
          <LayoutGrid className="w-4 h-4" />
        </button>
        <button onClick={onToggleRelationDrawer} className={iconBtn} title="关系">
          <GitBranch className="w-4 h-4" />
        </button>
        <button onClick={onToggleSearch} className={iconBtn} title="搜索">
          <Search className="w-4 h-4" />
        </button>
        <button onClick={onToggleHistory} className={iconBtn} title="历史">
          <History className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-gray-300 dark:bg-zinc-700 mx-1" />

        {/* Tools Group */}
        <button onClick={onToggleExport} className={iconBtn} title="导出">
          <Download className="w-4 h-4" />
        </button>
        <button onClick={onToggleImport} className={iconBtn} title="导入">
          <Upload className="w-4 h-4" />
        </button>
        <button onClick={() => router.push('/teams')} className={iconBtn} title="协作">
          <Users className="w-4 h-4" />
        </button>
        <button onClick={onToggleLogs} className={showLogs ? iconBtnActive : iconBtn} title="日志">
          <Activity className="w-4 h-4" />
        </button>
        <button onClick={toggleTheme} className={iconBtn} title="切换主题">
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <button onClick={onToggleHelp} className={iconBtn} title="帮助">
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* Selected Count + Actions */}
        {selectedIds.length > 0 && (
          <>
            <div className="w-px h-5 bg-gray-300 dark:bg-zinc-700 mx-1" />
            <div className="flex items-center gap-0.5 px-2 py-1 bg-blue-500/10 dark:bg-blue-500/15 rounded-lg">
              <span className="text-blue-600 dark:text-blue-300 font-mono text-[11px] min-w-[16px] text-center">{selectedIds.length}</span>
              <button onClick={handleDuplicateSelected} className={`${iconBtn} !w-6 !h-6`} title="复制">
                <CopyPlus className="w-3.5 h-3.5 text-blue-600 dark:text-blue-300" />
              </button>
              <button onClick={handleDeleteSelected} className={`${iconBtn} !w-6 !h-6`} title="删除">
                <Trash2 className="w-3.5 h-3.5 text-red-500 dark:text-red-400" />
              </button>
            </div>
          </>
        )}

        {isTextSelected && (
          <button onClick={handleFormatDocument} disabled={formatting} className={iconBtnBlue} title="AI 格式化">
            <Wand2 className={`w-4 h-4 ${formatting ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>

      {/* Right: User */}
      <div className="flex items-center gap-1 shrink-0">
        <div className="relative">
          <button
            ref={userBtnRef}
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className={`${iconBtn} gap-1 px-2 w-auto`}
          >
            <UserCircle className="w-4 h-4" />
            <span className="hidden lg:inline text-xs max-w-[80px] truncate">
              {userName || '用户'}
            </span>
          </button>

          {userMenuOpen && typeof document !== 'undefined' && createPortal(
            <>
              <div
                className="fixed inset-0 z-[200]"
                onClick={() => setUserMenuOpen(false)}
              />
              <div
                className="fixed z-[210] bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-lg min-w-[140px]"
                style={{
                  top: (userBtnRef.current?.getBoundingClientRect().bottom ?? 0) + 4,
                  right: window.innerWidth - (userBtnRef.current?.getBoundingClientRect().right ?? 0),
                }}
              >
                <div className="p-1.5">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-md transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>登出</span>
                  </button>
                  <button
                    onClick={() => { setUserMenuOpen(false); onOpenProfile(); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-md transition-colors"
                  >
                    <UserCircle className="w-4 h-4" />
                    <span>个人中心</span>
                  </button>
                </div>
              </div>
            </>,
            document.body
          )}
        </div>
      </div>
    </div>
    </>
  );
}
