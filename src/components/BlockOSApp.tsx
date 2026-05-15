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
import { useAgent } from '@/hooks/useAgent';
import { useBlockStore } from '@/store/blockStore';
import { ThemeProvider } from '@/components/ThemeProvider';

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

        <HelpPanel isOpen={showHelp} onClose={() => setShowHelp(false)} />
        <SearchPanel isOpen={showSearch} onClose={() => setShowSearch(false)} />
        <GroupPanel isOpen={showGroupPanel} onClose={() => setShowGroupPanel(false)} />
        <ImportPanel isOpen={showImport} onClose={() => setShowImport(false)} />
        <ExportPanel isOpen={showExport} onClose={() => setShowExport(false)} />
        <HistoryPanel isOpen={showHistory} onClose={() => setShowHistory(false)} />
      </div>
    </ThemeProvider>
  );
}
