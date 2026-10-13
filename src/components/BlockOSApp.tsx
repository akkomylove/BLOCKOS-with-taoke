'use client';

import { useEffect, useState } from 'react';
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
import AnalyzePanel from '@/components/AnalyzePanel';
import ChatPanel from '@/components/ChatPanel';
import ReviewEnrichPanel from '@/components/ReviewEnrichPanel';
import FoldPlanPanel from '@/components/FoldPlanPanel';
import DocRelationsPanel from '@/components/DocRelationsPanel';
import { ProfilePanel } from '@/components/collaboration/ProfilePanel';
import { useAgent } from '@/hooks/useAgent';
import { useBlockStore } from '@/store/blockStore';
import { ThemeProvider } from '@/components/ThemeProvider';
import { getPresetDocumentBlocks } from '@/config/presetDocuments';

export default function BlockOSApp() {
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
  const hydrate = useBlockStore((state) => state.hydrate);

  useAgent();

  const syncPages = useBlockStore((state) => state.syncPages);
  const loadFromServer = useBlockStore((state) => state.loadFromServer);

  useEffect(() => {
    useBlockStore.persist.rehydrate();
    hydrate();

    // 飞书/钉钉风格官方新手入门系统保障与激活机制
    const GUIDE_ID = 'doc-guide';
    const GUIDE_TITLE = '👋 欢迎使用 BlockOS ｜ 新手快速入门指南';
    const GUIDE_VERSION_KEY = 'blockos-guide-v3-dingtalk';
    const hasUpgraded = localStorage.getItem(GUIDE_VERSION_KEY);

    const state = useBlockStore.getState();
    const freshGuideBlocks = getPresetDocumentBlocks('doc-guide');

    if (!hasUpgraded) {
      const existingGuide = state.pages.find(
        (p) => p.id === GUIDE_ID || p.title.includes('新手') || p.title.includes('入门')
      );

      if (!existingGuide) {
        // 创建新指南页面并置顶
        const newGuidePage = {
          id: GUIDE_ID,
          title: GUIDE_TITLE,
          icon: '👋',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        useBlockStore.setState((prev) => ({
          pages: [newGuidePage, ...prev.pages],
          pageBlocks: {
            ...prev.pageBlocks,
            [GUIDE_ID]: freshGuideBlocks,
          },
          currentPageId: GUIDE_ID,
          blocks: freshGuideBlocks,
        }));
      } else {
        const guideId = existingGuide.id;
        useBlockStore.setState((prev) => {
          const otherPages = prev.pages.filter((p) => p.id !== guideId);
          const updatedGuidePage = { ...existingGuide, title: GUIDE_TITLE, icon: '👋', updatedAt: Date.now() };
          return {
            pages: [updatedGuidePage, ...otherPages],
            pageBlocks: {
              ...prev.pageBlocks,
              [guideId]: freshGuideBlocks,
            },
            currentPageId: guideId,
            blocks: freshGuideBlocks,
          };
        });
      }
      localStorage.setItem(GUIDE_VERSION_KEY, 'true');
      setShowOnboarding(true);
    } else {
      // 检查当前是否仍停留在旧的“产品需求文档”上，若是则切到新手指南
      const guidePage = state.pages.find(
        (p) => p.id === GUIDE_ID || p.title.includes('新手') || p.title.includes('入门')
      );
      if (guidePage && state.currentPageId !== guidePage.id) {
        const curPage = state.pages.find((p) => p.id === state.currentPageId);
        if (curPage && (curPage.title.includes('需求') || curPage.title.includes('PRD'))) {
          state.setCurrentPage(guidePage.id);
        }
      }
    }

    const loadServerData = async () => {
      await syncPages();
      const st = useBlockStore.getState();
      if (st.currentPageId) {
        await loadFromServer(st.currentPageId);
      }
    };
    loadServerData();
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

        <HelpPanel
          isOpen={showHelp}
          onClose={() => setShowHelp(false)}
          onRestartTour={() => {
            setShowHelp(false);
            const state = useBlockStore.getState();
            const guidePage = state.pages.find((p) => p.title.includes('新手') || p.id === 'doc-guide');
            if (guidePage && state.currentPageId !== guidePage.id) {
              state.setCurrentPage(guidePage.id);
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
