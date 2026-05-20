'use client';

import { useEffect, useState } from 'react';
import BlockEditor from '@/components/BlockEditor';
import Toolbar from '@/components/Toolbar';
import AgentLogPanel from '@/components/AgentLogPanel';
import { Sidebar } from '@/components/Sidebar';
import OnboardingTour from '@/components/OnboardingTour';
import PdfNoticeModal from '@/components/PdfNoticeModal';
import HelpPanel from '@/components/HelpPanel';
import SearchPanel from '@/components/SearchPanel';
import GroupPanel from '@/components/GroupPanel';
import ImportPanel from '@/components/ImportPanel';
import ExportPanel from '@/components/ExportPanel';
import HistoryPanel from '@/components/HistoryPanel';
import CopilotPanel from '@/components/CopilotPanel';
import AnalyzePanel from '@/components/AnalyzePanel';
import ChatPanel from '@/components/ChatPanel';
import ReviewEnrichPanel from '@/components/ReviewEnrichPanel';
import FoldPlanPanel from '@/components/FoldPlanPanel';
import DocRelationsPanel from '@/components/DocRelationsPanel';
import { ProfilePanel } from '@/components/collaboration/ProfilePanel';
import { useAgent } from '@/hooks/useAgent';
import { useBlockStore } from '@/store/blockStore';
import { ThemeProvider } from '@/components/ThemeProvider';

export default function BlockOSApp() {
  const [showLogs, setShowLogs] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [showRelationDrawer, setShowRelationDrawer] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showPdfNotice, setShowPdfNotice] = useState(false);
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
  const hydrate = useBlockStore((state) => state.hydrate);

  useAgent();

  const syncPages = useBlockStore((state) => state.syncPages);
  const loadFromServer = useBlockStore((state) => state.loadFromServer);

  useEffect(() => {
    useBlockStore.persist.rehydrate();
    hydrate();

    const loadServerData = async () => {
      await syncPages();
      const state = useBlockStore.getState();
      if (state.currentPageId) {
        await loadFromServer(state.currentPageId);
      }
    };
    loadServerData();

    const completed = localStorage.getItem('blockos-onboarding-completed');
    if (!completed) {
      setShowOnboarding(true);
    }

    const pdfDismissed = localStorage.getItem('blockos-pdf-notice-dismissed');
    if (!pdfDismissed) {
      setShowPdfNotice(true);
    }
  }, [hydrate, syncPages, loadFromServer]);

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

        {showPdfNotice && (
          <PdfNoticeModal onClose={() => setShowPdfNotice(false)} />
        )}

        <HelpPanel isOpen={showHelp} onClose={() => setShowHelp(false)} />
        <SearchPanel isOpen={showSearch} onClose={() => setShowSearch(false)} />
        <GroupPanel isOpen={showGroupPanel} onClose={() => setShowGroupPanel(false)} />
        <ImportPanel isOpen={showImport} onClose={() => setShowImport(false)} />
        <ExportPanel isOpen={showExport} onClose={() => setShowExport(false)} />
        <HistoryPanel isOpen={showHistory} onClose={() => setShowHistory(false)} />
        <CopilotPanel isOpen={showCopilot} onClose={() => setShowCopilot(false)} />
        <AnalyzePanel isOpen={showAnalyze} onClose={() => setShowAnalyze(false)} />
        <ChatPanel isOpen={showChat} onClose={() => setShowChat(false)} />
        <ReviewEnrichPanel isOpen={showReviewEnrich} onClose={() => setShowReviewEnrich(false)} />
        <FoldPlanPanel isOpen={showFoldPlan} onClose={() => setShowFoldPlan(false)} />
        <DocRelationsPanel isOpen={showDocRelations} onClose={() => setShowDocRelations(false)} />
      <ProfilePanel isOpen={showProfile} onClose={() => setShowProfile(false)} />
    </div>
  </ThemeProvider>
);
}
