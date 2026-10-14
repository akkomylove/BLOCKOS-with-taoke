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
    const GUIDE_VERSION_KEY = 'blockos-guide-v12-permanent-onboarding';
    const hasUpgraded = localStorage.getItem(GUIDE_VERSION_KEY);

    const state = useBlockStore.getState();
    const freshGuideBlocks = getPresetDocumentBlocks('doc-guide');

    // 检查当前指南文档卡片是否丢失或为空（如被旧版本同步冲掉）
    const curGuideBlocks = state.pageBlocks[GUIDE_ID] || (state.currentPageId === GUIDE_ID ? state.blocks : []);
    const isGuideEmpty = !curGuideBlocks || curGuideBlocks.length === 0;

    // 强制同步最新的 Agent 规则，彻底清除 localStorage 中旧的祝贺语
    const currentRules = state.agentRules || [];
    const todoRule = currentRules.find((r) => r.id === 'todo-complete');
    if (!todoRule || !JSON.stringify(todoRule).includes('迭代发布报告')) {
      useBlockStore.setState({
        agentRules: [
          {
            id: 'todo-complete',
            name: '需求验收与交付自动化',
            enabled: true,
            triggerType: 'blockUpdate',
            triggerCondition: "block.type === 'todo' && !prevBlock.meta?.checked && block.meta?.checked",
            actions: [
              {
                type: 'createBlock',
                config: {
                  type: 'text',
                  contentTemplate: '### 📋 迭代发布报告（Agent 自动化归档）\n- **验收状态**：✅ 质量检查通过 · 准予发布上线\n- **执行动作**：Agent 规则引擎自驱动触发\n- **归档时间**：{timestamp}\n- **关联需求**：[P0需求交付] 完成用户中心与鉴权架构验证\n- **协作流转**：状态机已自动流转为「已交付」，变更审计日志已同步广播至团队协同看板。',
                  position: 'after',
                },
              },
              {
                type: 'callAI',
                config: {
                  prompt: '作为产研交付 Agent，根据已验收交付的功能"[P0需求交付] 完成用户中心与鉴权架构验证"，生成一份专业的【下一步上线保障与测试 Checklist】（包含 3 个具体可执行的待办项，涵盖灰度放量、核心指标监控与应急预案，使用 Markdown 清单格式，语言严谨专业，符合飞书/钉钉企业级协同规范）',
                },
              },
            ],
          },
        ],
      });
    }

    if (!hasUpgraded || isGuideEmpty) {
      const LEGACY_PRESET_IDS = new Set(['doc-prd', 'doc-tech', 'doc-ui', 'doc-data', 'doc-test']);
      const isLegacySample = (p: { id: string; title: string }) =>
        LEGACY_PRESET_IDS.has(p.id) ||
        ['产品需求文档', '技术方案设计', 'UI 设计规范', 'UI设计规范', '数据流与架构图', '测试计划与用例'].some((t) => p.title.includes(t));

      const existingGuide = state.pages.find(
        (p) => p.id === GUIDE_ID || p.title.includes('新手') || p.title.includes('入门')
      );

      useBlockStore.setState((prev) => {
        // 过滤掉旧的 5 个预置样板文档，仅保留用户自定义页面与新手指南文档（其余通过样板库按需引入）
        const userCustomPages = prev.pages.filter((p) => p.id !== (existingGuide?.id || GUIDE_ID) && !isLegacySample(p));
        const cleanPageBlocks = { ...prev.pageBlocks };
        LEGACY_PRESET_IDS.forEach((id) => delete cleanPageBlocks[id]);

        const guidePage = {
          id: GUIDE_ID,
          title: GUIDE_TITLE,
          icon: '👋',
          createdAt: existingGuide?.createdAt || Date.now(),
          updatedAt: Date.now(),
        };

        return {
          pages: [guidePage, ...userCustomPages],
          pageBlocks: {
            ...cleanPageBlocks,
            [GUIDE_ID]: freshGuideBlocks,
          },
          currentPageId: GUIDE_ID,
          blocks: freshGuideBlocks,
        };
      });

      localStorage.setItem(GUIDE_VERSION_KEY, 'true');
      setShowOnboarding(true);
      setTimeout(() => {
        useBlockStore.getState().syncToServer();
      }, 300);
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
      // 防御校验：服务端加载完成后，若当前页面为新手指南但卡片依然为 0，强制恢复官方预置并同步上云
      const postSt = useBlockStore.getState();
      if ((postSt.currentPageId === GUIDE_ID || postSt.currentPageId.includes('guide')) && postSt.blocks.length === 0) {
        useBlockStore.setState((prev) => ({
          blocks: freshGuideBlocks,
          pageBlocks: {
            ...prev.pageBlocks,
            [GUIDE_ID]: freshGuideBlocks,
          },
        }));
        setShowOnboarding(true);
        postSt.syncToServer();
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
            const targetGuideId = guidePage?.id || 'doc-guide';
            if (state.currentPageId !== targetGuideId) {
              state.setCurrentPage(targetGuideId);
            }
            const freshBlocks = getPresetDocumentBlocks('doc-guide');
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
