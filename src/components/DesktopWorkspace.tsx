'use client';

import { useEffect, useRef, useState } from 'react';
import BlockEditor from '@/components/BlockEditor';
import Toolbar from '@/components/Toolbar';
import AgentLogPanel from '@/components/AgentLogPanel';
import { Sidebar } from '@/components/Sidebar';
import OnboardingTour from '@/components/OnboardingTour';
import HelpPanel from '@/components/HelpPanel';
import SearchPanel from '@/components/SearchPanel';
import GroupPanel from '@/components/GroupPanel';
import ImportPanel from '@/components/ImportPanel';
import ExportPanel from '@/components/ExportPanel';
import HistoryPanel from '@/components/HistoryPanel';
import CopilotPanel from '@/components/CopilotPanel';
import dynamic from 'next/dynamic';
import { useAccountStore } from '@/store/accountStore';
const AnalyzePanel = dynamic(() => import('@/components/AnalyzePanel'), { ssr: false });
import ChatPanel from '@/components/ChatPanel';
import ReviewEnrichPanel from '@/components/ReviewEnrichPanel';
import FoldPlanPanel from '@/components/FoldPlanPanel';
import DocRelationsPanel from '@/components/DocRelationsPanel';
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
  const [showChat, setShowChat] = useState(false);
  const [showReviewEnrich, setShowReviewEnrich] = useState(false);
  const [showFoldPlan, setShowFoldPlan] = useState(false);
  const [showDocRelations, setShowDocRelations] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [workspaceError, setWorkspaceError] = useState('');

  useAgent();

  useEffect(() => {
    if (!account?.id) return;
    const controller = new AbortController();
    setWorkspaceError('');
    initializeWorkspace(account.id, initialMode.current, controller.signal)
      .then(created => { if (!controller.signal.aborted && created) setShowOnboarding(true); })
      .catch(err => { if (!controller.signal.aborted) setWorkspaceError(err instanceof Error ? err.message : '文档加载失败'); });
    return () => controller.abort();
  }, [account?.id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowAIAssistant((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <ThemeProvider>
      <div className="h-screen flex bg-white text-gray-900 dark:bg-zinc-950 dark:text-zinc-100">
        <Sidebar collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <div className="flex-1 flex flex-col min-w-0">
          <Toolbar
            onToggleLogs={() => setShowLogs(!showLogs)}
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
            onToggleCopilot={() => setShowCopilot(true)}
            onToggleAnalyze={() => setShowAnalyze(true)}
            onToggleChat={() => setShowChat(true)}
            onToggleReviewEnrich={() => setShowReviewEnrich(true)}
            onToggleFoldPlan={() => setShowFoldPlan(true)}
            onToggleDocRelations={() => setShowDocRelations(true)}
          />
          <div role="status" className="text-sm text-red-500">{workspaceError}</div>
          <AgentLogPanel isOpen={showLogs} onClose={() => setShowLogs(false)} />
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
        <CopilotPanel isOpen={showCopilot} onClose={() => setShowCopilot(false)} />
        {enterprise && showAnalyze && <AnalyzePanel isOpen onClose={() => setShowAnalyze(false)} />}
        <ChatPanel isOpen={showChat} onClose={() => setShowChat(false)} />
        <ReviewEnrichPanel isOpen={showReviewEnrich} onClose={() => setShowReviewEnrich(false)} />
        <FoldPlanPanel isOpen={showFoldPlan} onClose={() => setShowFoldPlan(false)} />
        <DocRelationsPanel isOpen={showDocRelations} onClose={() => setShowDocRelations(false)} />
      <ProfilePanel isOpen={showProfile} onClose={() => setShowProfile(false)} />
    </div>
  </ThemeProvider>
);
}
