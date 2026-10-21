'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  Activity, Trash2, Sparkles, GitBranch, Undo2, Redo2, HelpCircle,
  Search, Download, Upload, CopyPlus, Wand2, Layers, Sun, Moon, History, Users,
  LogOut, UserCircle, LayoutGrid, BarChart3, BrainCircuit,
  ClipboardCheck, Link2, MoreHorizontal, Loader2, Check, AlertCircle, WifiOff
} from 'lucide-react';
import Logo from '@/components/Logo';
import { useAccountStore } from '@/store/accountStore';
import { useBlockStore } from '@/store/blockStore';
import { useTheme } from '@/components/ThemeProvider';
import { workspaceStorage } from '@/lib/workspace-storage';


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
  onToggleReviewEnrich: () => void;
  onToggleFoldPlan: () => void;
  onToggleDocRelations: () => void;
}

export default function Toolbar({
  onToggleLogs, showLogs, onToggleAIAssistant, onToggleRelationDrawer,
  onToggleHelp, onToggleSearch, onToggleImport, onToggleExport,
  onToggleGroupPanel, showGroupPanel, onToggleHistory, onOpenProfile,
  onToggleCopilot, onToggleAnalyze, onToggleReviewEnrich,
  onToggleFoldPlan, onToggleDocRelations,
}: ToolbarProps) {
  const router = useRouter();
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
  const localCacheError = useBlockStore((state) => state.localCacheError);
  const retrySave = useBlockStore((state) => state.retrySave);
  const user = useAccountStore(state => state.user);
  const logout = useAccountStore(state => state.logout);
  const enterprise = user?.mode === 'enterprise';
  const [logoutError, setLogoutError] = useState('');
  const { theme, toggleTheme } = useTheme();

  const currentPage = pages.find((p) => p.id === currentPageId);
  const [formatting, setFormatting] = useState(false);
  const userName = user?.name;
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userBtnRef = useRef<HTMLButtonElement>(null);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreBtnRef = useRef<HTMLButtonElement>(null);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsOnline(navigator.onLine);

    const handleOnline = async () => {
      setIsOnline(true);
      const pending = await workspaceStorage.getItem('block-os-offline-pending');
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

  const handleLogout = async () => {
    try { await logout(); }
    catch (err) { setLogoutError(err instanceof Error ? err.message : '退出失败，请重试'); }
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

  const iconBtn = 'flex items-center justify-center w-8 h-8 rounded-md text-xs transition-all duration-150 hover:bg-[#eff0f2] dark:hover:bg-[#282a30] text-[#646a73] dark:text-[#9ca3af] hover:text-[#1f2329] dark:hover:text-[#f2f3f5]';
  const iconBtnActive = 'flex items-center justify-center w-8 h-8 rounded-md text-xs transition-all duration-150 bg-[#eff4ff] dark:bg-blue-500/15 text-[#3370ff] dark:text-[#4b85ff] font-medium';
  const iconBtnBlue = 'flex items-center justify-center w-8 h-8 rounded-md text-xs transition-all duration-150 text-[#3370ff] dark:text-[#4b85ff] hover:bg-[#eff4ff] dark:hover:bg-blue-500/15';

  return (
    <>
      <div className="h-11 bg-white/90 dark:bg-[#1a1c20]/90 backdrop-blur-md border-b border-[#dee0e3] dark:border-[#33363e] flex items-center justify-between px-2 sm:px-3.5 shrink-0 overflow-hidden select-none">
      {/* Left: Logo + Page Title (自适应弹性缩短) */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 min-w-0">
        <div className="flex items-center gap-1.5 shrink-0">
          <Logo size={24} />
          <span className="text-sm font-semibold text-[#1f2329] dark:text-[#f2f3f5] tracking-tight hidden sm:inline">BlockOS</span>
        </div>
        <div className="h-4 w-px bg-[#dee0e3] dark:bg-[#33363e] mx-0.5 sm:mx-1 shrink-0" />
        {currentPage && (
          <input
            className="bg-transparent text-sm text-[#1f2329] dark:text-[#f2f3f5] outline-none font-medium hover:text-[#3370ff] dark:hover:text-[#4b85ff] focus:text-[#3370ff] dark:focus:text-[#4b85ff] transition-colors w-24 sm:w-36 md:w-44 lg:w-52 truncate"
            value={currentPage.title}
            onChange={(e) => updatePageTitle(currentPage.id, e.target.value)}
            title={currentPage.title}
          />
        )}
        {/* 保存状态胶囊 */}
        {saveStatus === 'saving' && (
          <span className="inline-flex items-center gap-1 text-[11px] text-[#e37318] bg-[#fef3e6] dark:bg-amber-950/20 px-2.5 py-0.5 rounded-full border border-[#fedbb2] dark:border-amber-800/40 shrink-0 font-medium shadow-xs">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span className="hidden md:inline">保存中</span>
          </span>
        )}
        {(saveStatus === 'saved' || saveStatus === 'idle') && (
          <button
            type="button"
            onClick={() => {
              useBlockStore.getState().syncToServer().catch(() => {});
            }}
            className="inline-flex items-center gap-1 text-[11px] text-[#2ba471] hover:text-[#188050] bg-[#e8f8f0] hover:bg-[#d8f3e5] dark:bg-emerald-950/20 dark:hover:bg-emerald-900/30 px-2.5 py-0.5 rounded-full border border-[#b7ebcf] dark:border-emerald-800/40 shrink-0 font-medium transition-colors cursor-pointer shadow-xs"
            title="已同步至云端 (点击或按 Ctrl+S 手动保存)"
           aria-label="已同步至云端 (点击或按 Ctrl+S 手动保存)">
            <Check className="w-3 h-3" />
            <span className="hidden md:inline">已保存</span>
          </button>
        )}
        {saveStatus === 'error' && (
          <button
            type="button"
            onClick={() => retrySave()}
            className="inline-flex items-center gap-1 text-[11px] text-[#d64b42] bg-[#fff5f4] hover:bg-[#ffeceb] dark:bg-rose-950/20 px-2.5 py-0.5 rounded-full border border-[#ffd9d5] dark:border-rose-800/40 shrink-0 transition-colors cursor-pointer font-medium"
            title={saveError || '云端同步失败，点击重新同步'}
           aria-label={saveError || '云端同步失败，点击重新同步'}>
            <AlertCircle className="w-3 h-3" />
            <span>保存失败 (重试)</span>
          </button>
        )}
        {localCacheError && (
          <span role="status" title={localCacheError} className="inline-flex items-center gap-1 text-[11px] text-amber-700 px-2 shrink-0">
            <AlertCircle className="w-3 h-3" />
            本地缓存不可用，请导出备份
          </span>
        )}
        {!isOnline && (
          <span
            className="inline-flex items-center gap-1 text-[11px] text-[#e37318] bg-[#fef3e6] dark:bg-amber-950/20 px-2 py-0.5 rounded-full border border-[#fedbb2] dark:border-amber-800/40 shrink-0 font-medium"
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
        <button onClick={onToggleAIAssistant} className={iconBtnBlue} title="AI 助手" aria-keyshortcuts="Control+k Meta+k" aria-label="AI 助手">
          <Sparkles className="w-4 h-4" />
        </button>
        {enterprise && (<button onClick={onToggleCopilot} className={`${iconBtnBlue} hidden xl:flex`} title="AI Copilot" aria-label="AI Copilot">
          <BrainCircuit className="w-4 h-4" />
        </button>)}
        {enterprise && (<button onClick={onToggleAnalyze} className={`${iconBtnBlue} hidden xl:flex`} title="工作流分析" aria-label="工作流分析">
          <BarChart3 className="w-4 h-4" />
        </button>)}
        {enterprise && (<button onClick={onToggleReviewEnrich} className={`${iconBtnBlue} hidden 2xl:flex`} title="角色审阅" aria-label="角色审阅">
          <ClipboardCheck className="w-4 h-4" />
        </button>)}
        {enterprise && (<button onClick={onToggleDocRelations} className={`${iconBtnBlue} hidden 2xl:flex`} title="文档关联" aria-label="文档关联">
          <Link2 className="w-4 h-4" />
        </button>)}

        <div className="w-px h-4 bg-[#dee0e3] dark:bg-[#33363e] mx-1 shrink-0" />

        {/* Edit Group (撤销 / 重做常驻) */}
        <button onClick={undo} disabled={!canUndo()} className={`${iconBtn} disabled:opacity-30`} title="撤销" aria-label="撤销">
          <Undo2 className="w-4 h-4" />
        </button>
        <button onClick={redo} disabled={!canRedo()} className={`${iconBtn} disabled:opacity-30`} title="重做" aria-label="重做">
          <Redo2 className="w-4 h-4" />
        </button>

        <div className="w-px h-4 bg-[#dee0e3] dark:bg-[#33363e] mx-1 shrink-0 hidden sm:block" />

        {/* View Group (搜索常驻，导航/关系/历史响应式展示) */}
        <button onClick={onToggleSearch} className={iconBtn} title="全局搜索 (Cmd+K)" aria-label="全局搜索 (Cmd+K)">
          <Search className="w-4 h-4" />
        </button>
        <button onClick={onToggleGroupPanel} className={`${showGroupPanel ? iconBtnActive : iconBtn} hidden lg:flex`} title="块级导航" aria-label="块级导航">
          <LayoutGrid className="w-4 h-4" />
        </button>
        <button onClick={onToggleRelationDrawer} className={`${iconBtn} hidden lg:flex`} title="关系图谱" aria-label="关系图谱">
          <GitBranch className="w-4 h-4" />
        </button>
        <button onClick={onToggleHistory} className={`${iconBtn} hidden lg:flex`} title="历史版本" aria-label="历史版本">
          <History className="w-4 h-4" />
        </button>

        <div className="w-px h-4 bg-[#dee0e3] dark:bg-[#33363e] mx-1 shrink-0 hidden md:block" />

        {/* Tools Group (协作与日志中屏展开，导入/导出宽屏展开) */}
        {enterprise && (<button onClick={() => router.push('/teams')} className={`${iconBtn} hidden md:flex`} title="协作看板" aria-label="协作看板">
          <Users className="w-4 h-4" />
        </button>)}
        {enterprise && (<button onClick={onToggleLogs} className={`${showLogs ? iconBtnActive : iconBtn} hidden md:flex`} title="执行日志" aria-label="执行日志">
          <Activity className="w-4 h-4" />
        </button>)}
        <button onClick={onToggleExport} className={`${iconBtn} hidden xl:flex`} title="导出" aria-label="导出">
          <Download className="w-4 h-4" />
        </button>
        <button onClick={onToggleImport} className={`${iconBtn} hidden xl:flex`} title="导入" aria-label="导入">
          <Upload className="w-4 h-4" />
        </button>
        <button onClick={onToggleHelp} className={`${iconBtn} hidden lg:flex`} title="帮助" aria-label="帮助">
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* 响应式「更多」菜单：小屏与中屏自适应展开，全量容纳所有工具 */}
        <div className="relative 2xl:hidden">
          <button
            ref={moreBtnRef}
            onClick={() => setMoreMenuOpen(!moreMenuOpen)}
            className={`${moreMenuOpen ? iconBtnActive : iconBtn} ${moreMenuOpen ? '!bg-blue-500/15 !text-blue-600 dark:!text-blue-300' : ''}`}
            title="更多工具与功能"
           aria-label="更多工具与功能">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Selected Count + Actions */}
        {selectedIds.length > 0 && (
          <>
            <div className="w-px h-4 bg-[#dee0e3] dark:bg-[#33363e] mx-1 shrink-0" />
            <div className="flex items-center gap-0.5 px-2 py-0.5 bg-[#eff4ff] dark:bg-blue-500/15 border border-[#c2d6ff] dark:border-blue-500/30 rounded-md shrink-0">
              <span className="text-[#3370ff] dark:text-[#4b85ff] font-medium text-xs min-w-[14px] text-center">{selectedIds.length}</span>
              <button onClick={handleDuplicateSelected} className={`${iconBtn} !w-6 !h-6`} title="复制" aria-label="复制">
                <CopyPlus className="w-3.5 h-3.5 text-[#3370ff] dark:text-[#4b85ff]" />
              </button>
              <button onClick={handleDeleteSelected} className={`${iconBtn} !w-6 !h-6 hover:bg-[#fff5f4] dark:hover:bg-rose-950/20`} title="删除" aria-label="删除">
                <Trash2 className="w-3.5 h-3.5 text-[#d64b42]" />
              </button>
            </div>
          </>
        )}

        {isTextSelected && (
          <button onClick={handleFormatDocument} disabled={formatting} className={`${iconBtnBlue} shrink-0`} title="AI 格式化" aria-label="AI 格式化">
            <Wand2 className={`w-4 h-4 ${formatting ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>

      {/* Right: Theme + User (右侧常驻，永不被挤压溢出) */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={onOpenProfile}
          className="rounded-md bg-[#eff4ff] dark:bg-blue-500/15 border border-[#c2d6ff]/70 dark:border-blue-500/30 px-2.5 py-1 text-xs font-medium text-[#3370ff] dark:text-[#4b85ff] hover:bg-[#e0ebff] dark:hover:bg-blue-500/25 transition-colors"
          title="切换使用模式"
         aria-label={enterprise ? "企业模式" : "个人模式"}>
          {enterprise ? '企业模式' : '个人模式'}
        </button>
        <button onClick={toggleTheme} className={iconBtn} title="切换主题" aria-label="切换主题">
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-[#646a73]" />}
        </button>

        <div className="relative">
          <button
            ref={userBtnRef}
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className={`${iconBtn} gap-1 px-2 w-auto`}
            title="个人中心"
           aria-label="个人中心">
            <UserCircle className="w-4 h-4" />
            <span className="hidden sm:inline text-xs max-w-[60px] md:max-w-[80px] truncate text-[#1f2329] dark:text-[#f2f3f5] font-medium">
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
                className="fixed z-[210] bg-white dark:bg-[#1f2125] border border-[#dee0e3] dark:border-[#33363e] rounded-xl shadow-popover min-w-[150px] p-1.5 animate-in fade-in zoom-in-95 duration-100"
                style={{
                  top: (userBtnRef.current?.getBoundingClientRect().bottom ?? 0) + 4,
                  right: Math.max(8, window.innerWidth - (userBtnRef.current?.getBoundingClientRect().right ?? 0)),
                }}
              >
                <div>
                  {logoutError && <p role="alert" className="p-2 text-xs text-[#d64b42]">{logoutError}</p>}
                  <button
                    onClick={() => { setUserMenuOpen(false); onOpenProfile(); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#1f2329] dark:text-[#f2f3f5] hover:bg-[#eff4ff] dark:hover:bg-blue-500/10 hover:text-[#3370ff] dark:hover:text-[#4b85ff] rounded-md transition-colors font-medium"
                  >
                    <UserCircle className="w-3.5 h-3.5 text-[#8f959e]" />
                    <span>个人中心</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#d64b42] dark:text-rose-400 hover:bg-[#fff5f4] dark:hover:bg-rose-950/20 rounded-md transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>退出登录</span>
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
          className="fixed z-[210] bg-white dark:bg-[#1f2125] border border-[#dee0e3] dark:border-[#33363e] rounded-xl shadow-popover p-2.5 w-60 animate-in fade-in zoom-in-95 duration-100"
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
            {enterprise && (<>
            <div>
              <div className="px-2 py-1 text-[11px] font-semibold text-[#8f959e] dark:text-[#6b7280] uppercase tracking-wider">AI 进阶套件</div>
              <div className="space-y-0.5">
                <button
                  onClick={() => { setMoreMenuOpen(false); onToggleCopilot(); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[#1f2329] dark:text-[#f2f3f5] hover:bg-[#eff4ff] dark:hover:bg-blue-500/10 hover:text-[#3370ff] dark:hover:text-[#4b85ff] transition-colors text-left"
                >
                  <BrainCircuit className="w-4 h-4 text-[#3370ff] shrink-0" />
                  <span>Copilot 规划</span>
                </button>
                {enterprise && (<button
                  onClick={() => { setMoreMenuOpen(false); onToggleAnalyze(); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[#1f2329] dark:text-[#f2f3f5] hover:bg-[#eff4ff] dark:hover:bg-blue-500/10 hover:text-[#3370ff] dark:hover:text-[#4b85ff] transition-colors text-left"
                >
                  <BarChart3 className="w-4 h-4 text-[#8a73df] shrink-0" />
                  <span>工作流分析</span>
                </button>)}
                <button
                  onClick={() => { setMoreMenuOpen(false); onToggleReviewEnrich(); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[#1f2329] dark:text-[#f2f3f5] hover:bg-[#eff4ff] dark:hover:bg-blue-500/10 hover:text-[#3370ff] dark:hover:text-[#4b85ff] transition-colors text-left"
                >
                  <ClipboardCheck className="w-4 h-4 text-[#8a73df] shrink-0" />
                  <span>多角色审阅</span>
                </button>
                <button
                  onClick={() => { setMoreMenuOpen(false); onToggleDocRelations(); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[#1f2329] dark:text-[#f2f3f5] hover:bg-[#eff4ff] dark:hover:bg-blue-500/10 hover:text-[#3370ff] dark:hover:text-[#4b85ff] transition-colors text-left"
                >
                  <Link2 className="w-4 h-4 text-[#3370ff] shrink-0" />
                  <span>文档拓扑</span>
                </button>
                <button
                  onClick={() => { setMoreMenuOpen(false); onToggleFoldPlan(); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[#1f2329] dark:text-[#f2f3f5] hover:bg-[#eff4ff] dark:hover:bg-blue-500/10 hover:text-[#3370ff] dark:hover:text-[#4b85ff] transition-colors text-left"
                >
                  <Layers className="w-4 h-4 text-[#2ba471] shrink-0" />
                  <span>智能折叠</span>
                </button>
              </div>
            </div>

            <div className="h-px bg-[#eff0f2] dark:bg-[#2e3037]" />
            </>)}

            {/* 视图与图谱 */}
            <div>
              <div className="px-2 py-1 text-[11px] font-semibold text-[#8f959e] dark:text-[#6b7280] uppercase tracking-wider">视图与图谱</div>
              <div className="space-y-0.5">
                <button
                  onClick={() => { setMoreMenuOpen(false); onToggleGroupPanel(); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[#1f2329] dark:text-[#f2f3f5] hover:bg-[#eff4ff] dark:hover:bg-blue-500/10 hover:text-[#3370ff] dark:hover:text-[#4b85ff] transition-colors text-left"
                >
                  <LayoutGrid className="w-4 h-4 text-[#e37318] shrink-0" />
                  <span>大纲导航</span>
                </button>
                <button
                  onClick={() => { setMoreMenuOpen(false); onToggleRelationDrawer(); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[#1f2329] dark:text-[#f2f3f5] hover:bg-[#eff4ff] dark:hover:bg-blue-500/10 hover:text-[#3370ff] dark:hover:text-[#4b85ff] transition-colors text-left"
                >
                  <GitBranch className="w-4 h-4 text-[#2ba471] shrink-0" />
                  <span>关系图谱</span>
                </button>
                <button
                  onClick={() => { setMoreMenuOpen(false); onToggleHistory(); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[#1f2329] dark:text-[#f2f3f5] hover:bg-[#eff4ff] dark:hover:bg-blue-500/10 hover:text-[#3370ff] dark:hover:text-[#4b85ff] transition-colors text-left"
                >
                  <History className="w-4 h-4 text-[#8f959e] shrink-0" />
                  <span>历史版本</span>
                </button>
              </div>
            </div>

            <div className="h-px bg-[#eff0f2] dark:bg-[#2e3037]" />

            {/* 工具与协作 */}
            <div>
              <div className="px-2 py-1 text-[11px] font-semibold text-[#8f959e] dark:text-[#6b7280] uppercase tracking-wider">{enterprise ? '工具与协作' : '个人工具'}</div>
              <div className="space-y-0.5">
                <button
                  onClick={() => { setMoreMenuOpen(false); onToggleExport(); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[#1f2329] dark:text-[#f2f3f5] hover:bg-[#eff4ff] dark:hover:bg-blue-500/10 hover:text-[#3370ff] dark:hover:text-[#4b85ff] transition-colors text-left"
                >
                  <Download className="w-4 h-4 text-[#646a73] dark:text-[#9ca3af] shrink-0" />
                  <span>导出文档</span>
                </button>
                <button
                  onClick={() => { setMoreMenuOpen(false); onToggleImport(); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[#1f2329] dark:text-[#f2f3f5] hover:bg-[#eff4ff] dark:hover:bg-blue-500/10 hover:text-[#3370ff] dark:hover:text-[#4b85ff] transition-colors text-left"
                >
                  <Upload className="w-4 h-4 text-[#646a73] dark:text-[#9ca3af] shrink-0" />
                  <span>导入文档</span>
                </button>
                {enterprise && (<button
                  onClick={() => { setMoreMenuOpen(false); router.push('/teams'); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[#1f2329] dark:text-[#f2f3f5] hover:bg-[#eff4ff] dark:hover:bg-blue-500/10 hover:text-[#3370ff] dark:hover:text-[#4b85ff] transition-colors text-left"
                >
                  <Users className="w-4 h-4 text-[#3370ff] dark:text-[#4b85ff] shrink-0" />
                  <span>敏捷看板</span>
                </button>)}
                {enterprise && (<button
                  onClick={() => { setMoreMenuOpen(false); onToggleLogs(); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[#1f2329] dark:text-[#f2f3f5] hover:bg-[#eff4ff] dark:hover:bg-blue-500/10 hover:text-[#3370ff] dark:hover:text-[#4b85ff] transition-colors text-left"
                >
                  <Activity className="w-4 h-4 text-[#d64b42] shrink-0" />
                  <span>执行审计</span>
                </button>)}
                <button
                  onClick={() => { setMoreMenuOpen(false); onToggleHelp(); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[#1f2329] dark:text-[#f2f3f5] hover:bg-[#eff4ff] dark:hover:bg-blue-500/10 hover:text-[#3370ff] dark:hover:text-[#4b85ff] transition-colors text-left"
                >
                  <HelpCircle className="w-4 h-4 text-[#3370ff] shrink-0" />
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
