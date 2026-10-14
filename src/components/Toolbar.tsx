'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  Bot, Activity, Trash2, Sparkles, GitBranch, Undo2, Redo2, HelpCircle,
  Search, Download, Upload, CopyPlus, Wand2, Layers, Sun, Moon, History, Users,
  LogOut, UserCircle, LayoutGrid, BarChart3, BrainCircuit,
  ClipboardCheck, Link2, MoreHorizontal, Loader2, Check, AlertCircle, MessageSquare, WifiOff
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
  onToggleCopilot: () => void;
  onToggleAnalyze: () => void;
  onToggleChat: () => void;
  onToggleReviewEnrich: () => void;
  onToggleFoldPlan: () => void;
  onToggleDocRelations: () => void;
}

export default function Toolbar({
  onToggleLogs, showLogs, onToggleAIAssistant, onToggleRelationDrawer,
  onToggleHelp, onToggleSearch, onToggleImport, onToggleExport,
  onToggleGroupPanel, showGroupPanel, onToggleHistory, onOpenProfile,
  onToggleCopilot, onToggleAnalyze, onToggleChat, onToggleReviewEnrich,
  onToggleFoldPlan, onToggleDocRelations,
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
  const saveStatus = useBlockStore((state) => state.saveStatus);
  const saveError = useBlockStore((state) => state.saveError);
  const retrySave = useBlockStore((state) => state.retrySave);
  const setCurrentUserId = useBlockStore((state) => state.setCurrentUserId);
  const { theme, toggleTheme } = useTheme();

  const currentPage = pages.find((p) => p.id === currentPageId);
  const [formatting, setFormatting] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userBtnRef = useRef<HTMLButtonElement>(null);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreBtnRef = useRef<HTMLButtonElement>(null);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      const pending = localStorage.getItem('block-os-offline-pending');
      if (pending) {
        retrySave();
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [retrySave]);

  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const res = await fetch('/api/auth/user');
        if (res.ok) {
          const data = await res.json();
          setUserName(data.name || '用户');
          if (data.id) {
            setCurrentUserId(data.id);
          }
        }
      } catch (err) {
        console.error('Failed to load user info:', err);
      }
    };
    loadUserInfo();
  }, [setCurrentUserId]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      if (typeof window !== 'undefined') {
        try {
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('block-os') || key.startsWith('doc-') || key.includes('guide'))) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach((k) => localStorage.removeItem(k));
        } catch {}
      }
      useBlockStore.getState().reset();
      router.push('/login');
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
      <div className="h-11 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-zinc-700 flex items-center justify-between px-2 sm:px-3 shrink-0 overflow-hidden">
      {/* Left: Logo + Page Title (自适应弹性缩短) */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 min-w-0">
        <div className="flex items-center gap-1.5 shrink-0">
          <Logo size={16} />
          <span className="text-sm font-semibold text-gray-900 dark:text-zinc-100 tracking-tight hidden sm:inline">BlockOS</span>
        </div>
        <div className="h-4 w-px bg-gray-300 dark:bg-zinc-700 mx-0.5 sm:mx-1 shrink-0" />
        {currentPage && (
          <input
            className="bg-transparent text-sm text-gray-600 dark:text-zinc-300 outline-none hover:text-gray-900 dark:hover:text-zinc-100 focus:text-gray-900 dark:focus:text-zinc-100 transition-colors w-24 sm:w-36 md:w-44 lg:w-52 truncate"
            value={currentPage.title}
            onChange={(e) => updatePageTitle(currentPage.id, e.target.value)}
            title={currentPage.title}
          />
        )}
        {/* 保存状态胶囊 */}
        {saveStatus === 'saving' && (
          <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 shrink-0">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span className="hidden md:inline">保存中</span>
          </span>
        )}
        {saveStatus === 'saved' && (
          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 shrink-0" title="已同步至云端">
            <Check className="w-3 h-3" />
            <span className="hidden md:inline">已保存</span>
          </span>
        )}
        {saveStatus === 'error' && (
          <button
            onClick={() => retrySave()}
            className="inline-flex items-center gap-1 text-[11px] text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 px-1.5 py-0.5 rounded border border-rose-500/30 shrink-0 transition-colors cursor-pointer"
            title={saveError || '云端同步失败，点击重新同步'}
          >
            <AlertCircle className="w-3 h-3" />
            <span>保存失败 (重试)</span>
          </button>
        )}
        {!isOnline && (
          <span
            className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/25 shrink-0"
            title="网络已断开，修改已暂存本地队列，网络恢复后将自动同步"
          >
            <WifiOff className="w-3 h-3" />
            <span className="hidden md:inline">离线保护</span>
          </span>
        )}
      </div>

      {/* Center: Main Actions (响应式折叠，小屏自动收纳进「更多」) */}
      <div className="flex items-center gap-0.5 min-w-0" data-tour="toolbar-actions">
        {/* AI Group (核心常驻 + 进阶响应式) */}
        <button onClick={onToggleAIAssistant} className={iconBtnBlue} title="AI 助手">
          <Sparkles className="w-4 h-4" />
        </button>
        <button onClick={onToggleChat} className={iconBtnBlue} title="AI 对话">
          <MessageSquare className="w-4 h-4" />
        </button>
        <button onClick={toggleAgent} className={agentEnabled ? iconBtnActive : iconBtn} title="Agent 规则引擎">
          <Bot className="w-4 h-4" />
        </button>
        <button onClick={onToggleCopilot} className={`${iconBtnBlue} hidden xl:flex`} title="AI Copilot">
          <BrainCircuit className="w-4 h-4" />
        </button>
        <button onClick={onToggleAnalyze} className={`${iconBtnBlue} hidden xl:flex`} title="工作流分析">
          <BarChart3 className="w-4 h-4" />
        </button>
        <button onClick={onToggleReviewEnrich} className={`${iconBtnBlue} hidden 2xl:flex`} title="角色审阅">
          <ClipboardCheck className="w-4 h-4" />
        </button>
        <button onClick={onToggleDocRelations} className={`${iconBtnBlue} hidden 2xl:flex`} title="文档关联">
          <Link2 className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-gray-300 dark:bg-zinc-700 mx-0.5 sm:mx-1 shrink-0" />

        {/* Edit Group (撤销 / 重做常驻) */}
        <button onClick={undo} disabled={!canUndo()} className={`${iconBtn} disabled:opacity-30`} title="撤销">
          <Undo2 className="w-4 h-4" />
        </button>
        <button onClick={redo} disabled={!canRedo()} className={`${iconBtn} disabled:opacity-30`} title="重做">
          <Redo2 className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-gray-300 dark:bg-zinc-700 mx-0.5 sm:mx-1 shrink-0 hidden sm:block" />

        {/* View Group (搜索常驻，导航/关系/历史响应式展示) */}
        <button onClick={onToggleSearch} className={iconBtn} title="全局搜索 (Cmd+K)">
          <Search className="w-4 h-4" />
        </button>
        <button onClick={onToggleGroupPanel} className={`${showGroupPanel ? iconBtnActive : iconBtn} hidden lg:flex`} title="块级导航">
          <LayoutGrid className="w-4 h-4" />
        </button>
        <button onClick={onToggleRelationDrawer} className={`${iconBtn} hidden lg:flex`} title="关系图谱">
          <GitBranch className="w-4 h-4" />
        </button>
        <button onClick={onToggleHistory} className={`${iconBtn} hidden lg:flex`} title="历史版本">
          <History className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-gray-300 dark:bg-zinc-700 mx-0.5 sm:mx-1 shrink-0 hidden md:block" />

        {/* Tools Group (协作与日志中屏展开，导入/导出宽屏展开) */}
        <button onClick={() => router.push('/teams')} className={`${iconBtn} hidden md:flex`} title="协作看板">
          <Users className="w-4 h-4" />
        </button>
        <button onClick={onToggleLogs} className={`${showLogs ? iconBtnActive : iconBtn} hidden md:flex`} title="执行日志">
          <Activity className="w-4 h-4" />
        </button>
        <button onClick={onToggleExport} className={`${iconBtn} hidden xl:flex`} title="导出">
          <Download className="w-4 h-4" />
        </button>
        <button onClick={onToggleImport} className={`${iconBtn} hidden xl:flex`} title="导入">
          <Upload className="w-4 h-4" />
        </button>
        <button onClick={onToggleHelp} className={`${iconBtn} hidden lg:flex`} title="帮助">
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* 响应式「更多」菜单：小屏与中屏自适应展开，全量容纳所有工具 */}
        <div className="relative 2xl:hidden">
          <button
            ref={moreBtnRef}
            onClick={() => setMoreMenuOpen(!moreMenuOpen)}
            className={`${moreMenuOpen ? iconBtnActive : iconBtn} ${moreMenuOpen ? '!bg-blue-500/15 !text-blue-600 dark:!text-blue-300' : ''}`}
            title="更多工具与功能"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Selected Count + Actions */}
        {selectedIds.length > 0 && (
          <>
            <div className="w-px h-5 bg-gray-300 dark:bg-zinc-700 mx-0.5 sm:mx-1 shrink-0" />
            <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-500/10 dark:bg-blue-500/15 rounded-lg shrink-0">
              <span className="text-blue-600 dark:text-blue-300 font-mono text-[11px] min-w-[14px] text-center">{selectedIds.length}</span>
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
          <button onClick={handleFormatDocument} disabled={formatting} className={`${iconBtnBlue} shrink-0`} title="AI 格式化">
            <Wand2 className={`w-4 h-4 ${formatting ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>

      {/* Right: Theme + User (右侧常驻，永不被挤压溢出) */}
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={toggleTheme} className={iconBtn} title="切换主题">
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <div className="relative">
          <button
            ref={userBtnRef}
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className={`${iconBtn} gap-1 px-1.5 sm:px-2 w-auto`}
            title="个人中心"
          >
            <UserCircle className="w-4 h-4" />
            <span className="hidden sm:inline text-xs max-w-[60px] md:max-w-[80px] truncate">
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
                className="fixed z-[210] bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-xl min-w-[140px] animate-in fade-in zoom-in-95 duration-100"
                style={{
                  top: (userBtnRef.current?.getBoundingClientRect().bottom ?? 0) + 4,
                  right: Math.max(8, window.innerWidth - (userBtnRef.current?.getBoundingClientRect().right ?? 0)),
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

    {/* 更多功能响应式弹出层 */}
    {moreMenuOpen && typeof document !== 'undefined' && createPortal(
      <>
        <div
          className="fixed inset-0 z-[200]"
          onClick={() => setMoreMenuOpen(false)}
        />
        <div
          className="fixed z-[210] bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl shadow-2xl p-2.5 w-60 animate-in fade-in zoom-in-95 duration-100"
          style={{
            top: (moreBtnRef.current?.getBoundingClientRect().bottom ?? 0) + 6,
            left: Math.max(8, Math.min(
              (typeof window !== 'undefined' ? window.innerWidth : 1200) - 250,
              (moreBtnRef.current?.getBoundingClientRect().left ?? 0) - 100
            )),
          }}
        >
          <div className="space-y-2 text-xs">
            {/* AI 进阶套件 */}
            <div>
              <div className="px-2 py-1 text-[10px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">AI 进阶套件</div>
              <div className="space-y-0.5">
                <button
                  onClick={() => { setMoreMenuOpen(false); onToggleCopilot(); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-gray-700 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors text-left"
                >
                  <BrainCircuit className="w-4 h-4 text-blue-500 shrink-0" />
                  <span>Copilot 规划</span>
                </button>
                <button
                  onClick={() => { setMoreMenuOpen(false); onToggleAnalyze(); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-gray-700 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors text-left"
                >
                  <BarChart3 className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span>工作流分析</span>
                </button>
                <button
                  onClick={() => { setMoreMenuOpen(false); onToggleReviewEnrich(); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-gray-700 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors text-left"
                >
                  <ClipboardCheck className="w-4 h-4 text-purple-500 shrink-0" />
                  <span>多角色审阅</span>
                </button>
                <button
                  onClick={() => { setMoreMenuOpen(false); onToggleDocRelations(); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-gray-700 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors text-left"
                >
                  <Link2 className="w-4 h-4 text-cyan-500 shrink-0" />
                  <span>文档拓扑</span>
                </button>
                <button
                  onClick={() => { setMoreMenuOpen(false); onToggleFoldPlan(); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-gray-700 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors text-left"
                >
                  <Layers className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>智能折叠</span>
                </button>
              </div>
            </div>

            <div className="h-px bg-gray-100 dark:bg-zinc-800" />

            {/* 视图与图谱 */}
            <div>
              <div className="px-2 py-1 text-[10px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">视图与图谱</div>
              <div className="space-y-0.5">
                <button
                  onClick={() => { setMoreMenuOpen(false); onToggleGroupPanel(); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-gray-700 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors text-left"
                >
                  <LayoutGrid className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>大纲导航</span>
                </button>
                <button
                  onClick={() => { setMoreMenuOpen(false); onToggleRelationDrawer(); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-gray-700 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors text-left"
                >
                  <GitBranch className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>关系图谱</span>
                </button>
                <button
                  onClick={() => { setMoreMenuOpen(false); onToggleHistory(); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-gray-700 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors text-left"
                >
                  <History className="w-4 h-4 text-zinc-500 shrink-0" />
                  <span>历史版本</span>
                </button>
              </div>
            </div>

            <div className="h-px bg-gray-100 dark:bg-zinc-800" />

            {/* 工具与协作 */}
            <div>
              <div className="px-2 py-1 text-[10px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">工具与协作</div>
              <div className="space-y-0.5">
                <button
                  onClick={() => { setMoreMenuOpen(false); onToggleExport(); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-gray-700 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors text-left"
                >
                  <Download className="w-4 h-4 text-gray-600 dark:text-zinc-400 shrink-0" />
                  <span>导出文档</span>
                </button>
                <button
                  onClick={() => { setMoreMenuOpen(false); onToggleImport(); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-gray-700 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors text-left"
                >
                  <Upload className="w-4 h-4 text-gray-600 dark:text-zinc-400 shrink-0" />
                  <span>导入文档</span>
                </button>
                <button
                  onClick={() => { setMoreMenuOpen(false); router.push('/teams'); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-gray-700 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors text-left"
                >
                  <Users className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>敏捷看板</span>
                </button>
                <button
                  onClick={() => { setMoreMenuOpen(false); onToggleLogs(); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-gray-700 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors text-left"
                >
                  <Activity className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>执行审计</span>
                </button>
                <button
                  onClick={() => { setMoreMenuOpen(false); onToggleHelp(); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-gray-700 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors text-left"
                >
                  <HelpCircle className="w-4 h-4 text-sky-500 shrink-0" />
                  <span>使用指南</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </>,
      document.body
    )}
    </>
  );
}
