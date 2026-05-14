'use client';

import { Bot, Activity, Trash2, Sparkles, GitBranch, Undo2, Redo2, HelpCircle, Search, Download, Upload, CopyPlus, Wand2, Layers } from 'lucide-react';
import Logo from '@/components/Logo';
import { useBlockStore } from '@/store/blockStore';
import { useState } from 'react';

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
}

export default function Toolbar({ onToggleLogs, showLogs, onToggleAIAssistant, onToggleRelationDrawer, onToggleHelp, onToggleSearch, onToggleImport, onToggleExport, onToggleGroupPanel, showGroupPanel }: ToolbarProps) {
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

  const currentPage = pages.find((p) => p.id === currentPageId);
  const [formatting, setFormatting] = useState(false);

  const handleDeleteSelected = () => {
    selectedIds.forEach((id) => deleteBlock(id));
    clearSelection();
  };

  const handleDuplicateSelected = () => {
    selectedIds.forEach((id) => {
      duplicateBlock(id);
    });
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

  return (
    <div className="h-12 bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-700 flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Logo size={18} />
          <h1 className="text-sm font-semibold text-zinc-100 tracking-tight">BlockOS</h1>
        </div>
        <div className="h-3 w-px bg-zinc-700" />
        {currentPage && (
          <input
            className="bg-transparent text-sm text-zinc-300 outline-none hover:text-zinc-100 focus:text-zinc-100 transition-colors w-48"
            value={currentPage.title}
            onChange={(e) => updatePageTitle(currentPage.id, e.target.value)}
          />
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={undo}
          disabled={!canUndo()}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700 hover:text-zinc-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          title="撤销"
        >
          <Undo2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo()}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700 hover:text-zinc-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          title="重做"
        >
          <Redo2 className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-4 bg-zinc-700 mx-1" />

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 mr-3 px-3 py-1 bg-blue-500/15 border border-blue-500/30 rounded-lg flex-shrink-0">
            <span className="text-[11px] text-blue-300 font-mono">{selectedIds.length}</span>
            <button
              onClick={handleDuplicateSelected}
              className="p-0.5 hover:bg-blue-500/20 rounded transition-colors"
              title="复制 Block"
            >
              <CopyPlus className="w-3 h-3 text-blue-300" />
            </button>
            <button
              onClick={handleDeleteSelected}
              className="p-0.5 hover:bg-red-500/20 rounded transition-colors"
              title="删除"
            >
              <Trash2 className="w-3 h-3 text-red-400" />
            </button>
          </div>
        )}

        <button
          onClick={onToggleAIAssistant}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] bg-purple-500/15 text-purple-300 border border-purple-500/30 hover:bg-purple-500/25 transition-all"
          title="AI 助手"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">AI 助手</span>
        </button>

        <button
          onClick={onToggleRelationDrawer}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700 hover:text-zinc-200 transition-all"
        >
          <GitBranch className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">关系</span>
        </button>

        <button
          onClick={onToggleGroupPanel}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] transition-all ${
            showGroupPanel
              ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
              : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700 hover:text-zinc-200'
          }`}
          title="导航"
        >
          <Layers className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">导航</span>
        </button>

        <button
          onClick={toggleAgent}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] transition-all ${
            agentEnabled
              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
              : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700'
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Agent</span>
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
        </button>

        <button
          onClick={onToggleLogs}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] transition-all ${
            showLogs
              ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
              : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700 hover:text-zinc-200'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">日志</span>
        </button>

        <button
          onClick={onToggleSearch}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700 hover:text-zinc-200 transition-all"
          title="搜索"
        >
          <Search className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onToggleExport}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700 hover:text-zinc-200 transition-all"
          title="导出"
        >
          <Download className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onToggleImport}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700 hover:text-zinc-200 transition-all"
          title="导入"
        >
          <Upload className="w-3.5 h-3.5" />
        </button>

        {selectedIds.length === 1 && blocks.find((b) => b.id === selectedIds[0])?.type === 'text' && (
          <button
            onClick={handleFormatDocument}
            disabled={formatting}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] bg-purple-500/15 text-purple-300 border border-purple-500/30 hover:bg-purple-500/25 transition-all disabled:opacity-50"
            title="AI 格式化文档"
          >
            <Wand2 className={`w-3.5 h-3.5 ${formatting ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{formatting ? '格式化中...' : 'AI 格式化'}</span>
          </button>
        )}

        <button
          onClick={onToggleHelp}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700 hover:text-zinc-200 transition-all"
          title="帮助"
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}