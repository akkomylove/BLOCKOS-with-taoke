'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import BlockEditor from '@/components/BlockEditor';
import Toolbar from '@/components/Toolbar';
import { Sidebar } from '@/components/Sidebar';
import OnboardingTour from '@/components/OnboardingTour';
import HelpPanel from '@/components/HelpPanel';
import SearchPanel from '@/components/SearchPanel';
import GroupPanel from '@/components/GroupPanel';
import ImportPanel from '@/components/ImportPanel';
import ExportPanel from '@/components/ExportPanel';
import HistoryPanel from '@/components/HistoryPanel';
import dynamic from 'next/dynamic';
import { useAccountStore } from '@/store/accountStore';
const AnalyzePanel = dynamic(() => import('@/components/AnalyzePanel'), { ssr: false });
const AgentLogPanel = dynamic(() => import('@/components/AgentLogPanel'), { ssr: false });
const CopilotPanel = dynamic(() => import('@/components/CopilotPanel'), { ssr: false });
const ReviewEnrichPanel = dynamic(() => import('@/components/ReviewEnrichPanel'), { ssr: false });
const FoldPlanPanel = dynamic(() => import('@/components/FoldPlanPanel'), { ssr: false });
const DocRelationsPanel = dynamic(() => import('@/components/DocRelationsPanel'), { ssr: false });
import { ProfilePanel } from '@/components/collaboration/ProfilePanel';
import { useAgent } from '@/hooks/useAgent';
import { useBlockStore } from '@/store/blockStore';
import { ThemeProvider } from '@/components/ThemeProvider';
import { getAccountGuide } from '@/config/account-guide';
import { initializeWorkspace } from '@/lib/initialize-workspace';

export default function DesktopWorkspace() {
  const account = useAccountStore(state => state.user);
  const enterprise = account?.mode === 'enterprise';
  const initialMode = useRef(account?.mode || 'personal');
  const [showLogs, setShowLogs] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [showRelationDrawer, setShowRelationDrawer] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showGroupPanel, setShowGroupPanel] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showCopilot, setShowCopilot] = useState(false);
  const [showAnalyze, setShowAnalyze] = useState(false);
  const [showReviewEnrich, setShowReviewEnrich] = useState(false);
  const [showFoldPlan, setShowFoldPlan] = useState(false);
  const [showDocRelations, setShowDocRelations] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [workspaceError, setWorkspaceError] = useState('');

  useAgent();

  useEffect(() => {
    if (enterprise) return;
    setShowLogs(false);
    setShowCopilot(false);
    setShowAnalyze(false);
    setShowReviewEnrich(false);
    setShowFoldPlan(false);
    setShowDocRelations(false);
  }, [enterprise]);

  useEffect(() => {
    if (!account?.id) return;
    const controller = new AbortController();
    setWorkspaceError('');
    initializeWorkspace(account.id, initialMode.current, controller.signal)
      .then(created => { if (!controller.signal.aborted && created) setShowOnboarding(true); })
      .catch(err => { if (!controller.signal.aborted) setWorkspaceError(err instanceof Error ? err.message : '文档加载失败'); });
    return () => controller.abort();
  }, [account?.id]);

  const [saveToast, setSaveToast] = useState<{
    show: boolean;
    message: string;
    type: 'saving' | 'success' | 'error';
    isManual?: boolean;
  } | null>(null);

  const saveToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerSaveToast = (message: string, type: 'saving' | 'success' | 'error', isManual = false) => {
    if (saveToastTimer.current) clearTimeout(saveToastTimer.current);
    setSaveToast({ show: true, message, type, isManual });
    if (type !== 'saving') {
      saveToastTimer.current = setTimeout(() => {
        setSaveToast((prev) => (prev ? { ...prev, show: false } : null));
      }, 2500);
    }
  };

  const handleManualSave = async () => {
    triggerSaveToast('正在同步保存到云端...', 'saving', true);
    try {
      await useBlockStore.getState().syncToServer();
      const nowTime = new Date().toLocaleTimeString('zh-CN', { hour12: false });
      triggerSaveToast(`画布内容已实时保存到云端 (${nowTime})`, 'success', true);
    } catch (err: unknown) {
      triggerSaveToast(err instanceof Error ? err.message : '保存失败，已暂存本地队列', 'error', true);
    }
  };

  // 监听云端自动保存完成事件，自动弹出轻量提示
  const lastSavedAt = useBlockStore((state) => state.lastSavedAt);
  const prevSavedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (lastSavedAt && prevSavedAtRef.current !== null && lastSavedAt !== prevSavedAtRef.current) {
      const timeStr = new Date(lastSavedAt).toLocaleTimeString('zh-CN', { hour12: false });
      triggerSaveToast(`内容已自动保存到云端 (${timeStr})`, 'success', false);
    }
    prevSavedAtRef.current = lastSavedAt;
  }, [lastSavedAt]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S / Cmd+S 手动保存快捷键
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        e.stopPropagation();
        handleManualSave();
        return;
      }

      // Ctrl+K / Cmd+K AI 助手中枢快捷键
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowAIAssistant((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, []);

  return (
    <ThemeProvider>
      <div className="h-screen flex bg-[#f7f8fa] text-[#1f2329] dark:bg-[#141517] dark:text-[#f2f3f5] overflow-hidden">
        <Sidebar collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <div className="flex-1 flex flex-col min-w-0">
          <Toolbar
            onToggleLogs={() => { if (enterprise) setShowLogs(!showLogs); }}
            showLogs={showLogs}
            onToggleAIAssistant={() => setShowAIAssistant(true)}
            onToggleRelationDrawer={() => setShowRelationDrawer(!showRelationDrawer)}
            onToggleHelp={() => setShowHelp(true)}
            onToggleSearch={() => setShowSearch(true)}
            onToggleImport={() => setShowImport(true)}
            onToggleExport={() => setShowExport(true)}
            onToggleGroupPanel={() => setShowGroupPanel(!showGroupPanel)}
            showGroupPanel={showGroupPanel}
            onToggleHistory={() => setShowHistory(true)}
            onOpenProfile={() => setShowProfile(true)}
            onToggleCopilot={() => { if (enterprise) setShowCopilot(true); }}
            onToggleAnalyze={() => { if (enterprise) setShowAnalyze(true); }}
            onToggleReviewEnrich={() => { if (enterprise) setShowReviewEnrich(true); }}
            onToggleFoldPlan={() => { if (enterprise) setShowFoldPlan(true); }}
            onToggleDocRelations={() => { if (enterprise) setShowDocRelations(true); }}
          />
          {workspaceError ? (
            <div role="status" className="px-4 py-1.5 text-xs text-[#d64b42] bg-[#fff5f4] dark:bg-rose-950/30 border-b border-[#ffd9d5] dark:border-rose-900/40">
              {workspaceError}
            </div>
          ) : (
            <div role="status" className="sr-only" />
          )}
          {enterprise && showLogs && <AgentLogPanel isOpen onClose={() => setShowLogs(false)} />}
          <BlockEditor
            commandPaletteOpen={showAIAssistant}
            relationDrawerOpen={showRelationDrawer}
            onCloseCommandPalette={() => setShowAIAssistant(false)}
            onCloseRelationDrawer={() => setShowRelationDrawer(false)}
          />
        </div>

        {showOnboarding && (
          <OnboardingTour
            onComplete={() => setShowOnboarding(false)}
            onSkip={() => setShowOnboarding(false)}
          />
        )}

        <HelpPanel
          isOpen={showHelp}
          onClose={() => setShowHelp(false)}
          onRestartTour={() => {
            setShowHelp(false);
            const state = useBlockStore.getState();
            const guidePage = state.pages.find((p) => p.title.includes('新手') || p.id === 'doc-guide');
            const targetGuideId = guidePage?.id || 'doc-guide';
            if (state.currentPageId !== targetGuideId) {
              state.setCurrentPage(targetGuideId);
            }
            const freshBlocks = getAccountGuide(account?.mode || 'personal');
            const currentGuideBlocks = useBlockStore.getState().blocks;
            if (!currentGuideBlocks || currentGuideBlocks.length === 0) {
              useBlockStore.setState((prev) => ({
                blocks: freshBlocks,
                pageBlocks: {
                  ...prev.pageBlocks,
                  [targetGuideId]: freshBlocks,
                },
              }));
              useBlockStore.getState().syncToServer();
            }
            setShowOnboarding(true);
          }}
        />
        <SearchPanel isOpen={showSearch} onClose={() => setShowSearch(false)} />
        <GroupPanel isOpen={showGroupPanel} onClose={() => setShowGroupPanel(false)} />
        <ImportPanel isOpen={showImport} onClose={() => setShowImport(false)} />
        <ExportPanel isOpen={showExport} onClose={() => setShowExport(false)} />
        <HistoryPanel isOpen={showHistory} onClose={() => setShowHistory(false)} />
        {enterprise && showCopilot && <CopilotPanel isOpen onClose={() => setShowCopilot(false)} />}
        {enterprise && showAnalyze && <AnalyzePanel isOpen onClose={() => setShowAnalyze(false)} />}
        {enterprise && showReviewEnrich && <ReviewEnrichPanel isOpen onClose={() => setShowReviewEnrich(false)} />}
        {enterprise && showFoldPlan && <FoldPlanPanel isOpen onClose={() => setShowFoldPlan(false)} />}
        <ProfilePanel isOpen={showProfile} onClose={() => setShowProfile(false)} />

        {/* 实时保存浮动 Toast 弹窗反馈 */}
        {saveToast?.show && (
          <div
            role="status"
            aria-live="polite"
            className="fixed top-14 left-1/2 -translate-x-1/2 z-[400] flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/95 dark:bg-[#1a1c20]/95 backdrop-blur-md border border-[#dee0e3] dark:border-zinc-700 shadow-modal text-xs font-medium text-[#1f2329] dark:text-zinc-100 animate-save-toast transition-all select-none"
          >
            {saveToast.type === 'saving' && <Loader2 className="w-3.5 h-3.5 text-brand animate-spin" />}
            {saveToast.type === 'success' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
            {saveToast.type === 'error' && <AlertCircle className="w-3.5 h-3.5 text-red-500" />}
            <span>{saveToast.message}</span>
            {saveToast.isManual && (
              <span className="text-[10px] text-content-tertiary bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded font-mono border border-line-subtle dark:border-zinc-700">
                Ctrl+S
              </span>
            )}
          </div>
        )}
      </div>
    </ThemeProvider>
);
}
