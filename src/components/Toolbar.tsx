'use client';

import { useState } from 'react';
import {
  Bot, Activity, Trash2, Sparkles, GitBranch, Undo2, Redo2, HelpCircle,
  Search, Download, Upload, CopyPlus, Wand2, Layers, Sun, Moon, History
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
}

export default function Toolbar({
  onToggleLogs, showLogs, onToggleAIAssistant, onToggleRelationDrawer,
  onToggleHelp, onToggleSearch, onToggleImport, onToggleExport,
  onToggleGroupPanel, showGroupPanel, onToggleHistory,
}: ToolbarProps) {
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

  const btnBase = 'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors border flex-shrink-0';
  const btnDefault = `${btnBase} bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 border-gray-200 dark:border-zinc-700 hover:bg-gray-200 dark:hover:bg-zinc-700 hover:text-gray-900 dark:hover:text-zinc-200`;
  const btnActive = `${btnBase} bg-purple-500/10 dark:bg-purple-500/15 text-purple-600 dark:text-purple-300 border-purple-500/20 dark:border-purple-500/30`;

  return (
    <div className="h-12 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-zinc-700 flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <Logo size={18} />
          <h1 className="text-sm font-semibold text-gray-900 dark:text-zinc-100 tracking-tight">BlockOS</h1>
        </div>
        <div className="h-3 w-px bg-gray-300 dark:bg-zinc-700" />
        {currentPage && (
          <input
            className="bg-transparent text-sm text-gray-600 dark:text-zinc-300 outline-none hover:text-gray-900 dark:hover:text-zinc-100 focus:text-gray-900 dark:focus:text-zinc-100 transition-colors w-48"
            value={currentPage.title}
            onChange={(e) => updatePageTitle(currentPage.id, e.target.value)}
          />
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <button onClick={toggleTheme} className={btnDefault} title="切换主题">
          {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </button>
        <button onClick={undo} disabled={!canUndo()} className={`${btnDefault} disabled:opacity-30`} title="撤销">
          <Undo2 className="w-3.5 h-3.5" />
        </button>
        <button onClick={redo} disabled={!canRedo()} className={`${btnDefault} disabled:opacity-30`} title="重做">
          <Redo2 className="w-3.5 h-3.5" />
        </button>
        <button onClick={onToggleAIAssistant} className={btnActive}>
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">AI 助手</span>
        </button>

        <div className="w-px h-4 bg-gray-300 dark:bg-zinc-700 mx-1" />

        {selectedIds.length > 0 && (
          <div className={`${btnBase} bg-blue-500/10 dark:bg-blue-500/15 border-blue-500/20 dark:border-blue-500/30`}>
            <span className="text-blue-600 dark:text-blue-300 font-mono text-xs">{selectedIds.length}</span>
            <button onClick={handleDuplicateSelected} className="hover:bg-blue-500/20 rounded p-0.5" title="复制">
              <CopyPlus className="w-3 h-3 text-blue-600 dark:text-blue-300" />
            </button>
            <button onClick={handleDeleteSelected} className="hover:bg-red-500/20 rounded p-0.5" title="删除">
              <Trash2 className="w-3 h-3 text-red-500 dark:text-red-400" />
            </button>
          </div>
        )}

        <button onClick={onToggleRelationDrawer} className={btnDefault}>
          <GitBranch className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">关系</span>
        </button>
        <button onClick={onToggleGroupPanel} className={showGroupPanel ? btnActive : btnDefault}>
          <Layers className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">导航</span>
        </button>
        <button onClick={toggleAgent} className={agentEnabled ? btnActive : btnDefault}>
          <Bot className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Agent</span>
        </button>
        <button onClick={onToggleLogs} className={showLogs ? btnActive : btnDefault}>
          <Activity className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">日志</span>
        </button>

        <div className="w-px h-4 bg-gray-300 dark:bg-zinc-700 mx-1" />

        <button onClick={onToggleSearch} className={btnDefault} title="搜索">
          <Search className="w-3.5 h-3.5" />
        </button>
        <button onClick={onToggleExport} className={btnDefault} title="导出">
          <Download className="w-3.5 h-3.5" />
        </button>
        <button onClick={onToggleImport} className={btnDefault} title="导入">
          <Upload className="w-3.5 h-3.5" />
        </button>

        {isTextSelected && (
          <button onClick={handleFormatDocument} disabled={formatting} className={btnActive}>
            <Wand2 className={`w-3.5 h-3.5 ${formatting ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{formatting ? '格式化中...' : 'AI 格式化'}</span>
          </button>
        )}

        <button onClick={onToggleHistory} className={btnDefault} title="历史">
          <History className="w-3.5 h-3.5" />
        </button>
        <button onClick={onToggleHelp} className={btnDefault} title="帮助">
          <HelpCircle className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}