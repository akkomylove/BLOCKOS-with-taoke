'use client';

import { useState } from 'react';
import { X, Layers, Loader2, ChevronDown, ChevronUp, Sparkles, EyeOff, Eye } from 'lucide-react';
import { useFoldPlan } from '@/hooks/useTaokeAI';
import { useBlockStore } from '@/store/blockStore';

interface FoldPlanPanelProps { isOpen: boolean; onClose: () => void; }

export default function FoldPlanPanel({ isOpen, onClose }: FoldPlanPanelProps) {
  const { data, loading, error, execute } = useFoldPlan();
  const [currentRole, setCurrentRole] = useState('产品经理');
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());
  const blocks = useBlockStore((state) => state.blocks);

  const handlePlan = async () => {
    const sections = blocks.map((b, i) => ({
      index: i,
      heading: `[${b.type}]`,
      content: typeof b.content === 'string' ? b.content : JSON.stringify(b.content),
    }));
    await execute({
      documentName: '当前文档',
      workflow: ['产品经理', 'UI/UX设计师', '前端开发', '后端开发', '测试工程师'],
      currentRole,
      roleTask: `${currentRole}相关任务`,
      roleSummary: `${currentRole}职责概述`,
      focusPoints: [`${currentRole}关注点`],
      priorityTopics: [`${currentRole}重点`],
      foldableTopics: ['其他角色内容'],
      reviewKeywords: [`${currentRole}关键词`],
      watchPoints: [`${currentRole}注意事项`],
      stageGoal: `${currentRole}阶段目标`,
      sections,
    });
  };

  const toggleExpand = (index: number) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col border border-gray-200 dark:border-zinc-700">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-zinc-700">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-teal-500" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-zinc-100">文档折叠规划</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"><X className="w-4 h-4 text-gray-500" /></button>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-4">
          <div className="flex gap-2">
            <select
              value={currentRole}
              onChange={(e) => setCurrentRole(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-gray-900 dark:text-zinc-100 outline-none"
            >
              {['产品经理', 'UI/UX设计师', '前端开发', '后端开发', '测试工程师'].map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <button
              onClick={handlePlan}
              disabled={loading}
              className="px-4 py-2 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {loading ? '规划中...' : '生成规划'}
            </button>
          </div>

          {error && <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">{error}</div>}

          {data && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 dark:text-zinc-500">{data.note}</p>
              {data.sections.map((section) => (
                <div
                  key={section.index}
                  className={`border rounded-lg overflow-hidden ${
                    section.highlight ? 'border-amber-200 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-900/10' : 'border-gray-200 dark:border-zinc-700'
                  }`}
                >
                  <button
                    onClick={() => toggleExpand(section.index)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left"
                  >
                    {section.shouldFold ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-teal-500" />}
                    <span className="text-sm font-medium text-gray-800 dark:text-zinc-200 flex-1">{section.heading}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      section.relevance === 'high' ? 'bg-red-100 text-red-700' : section.relevance === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                    }`}>{section.relevance}</span>
                    {expandedSections.has(section.index) ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </button>
                  {expandedSections.has(section.index) && (
                    <div className="px-3 pb-3 space-y-2">
                      <p className="text-xs text-gray-500 dark:text-zinc-500">{section.reason}</p>
                      <p className="text-sm text-gray-700 dark:text-zinc-300 line-clamp-3">{section.previewQuote}</p>
                      {section.matchedTopics.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {section.matchedTopics.map((t, i) => (
                            <span key={i} className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
