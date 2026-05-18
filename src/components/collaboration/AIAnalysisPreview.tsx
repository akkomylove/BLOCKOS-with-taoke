'use client';

import type { AIAnalysisResult } from '@/types/collaboration';
import { CheckCircle2, AlertTriangle, Lightbulb, ShieldAlert, ListTodo, GitBranch } from 'lucide-react';

interface Props {
  analysis: AIAnalysisResult;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}

const priorityLabels: Record<string, string> = {
  low: '低',
  medium: '中',
  high: '高',
  urgent: '紧急',
};

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600 dark:bg-zinc-700 dark:text-zinc-400',
  medium: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  high: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  urgent: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
};

export function AIAnalysisPreview({ analysis, onConfirm, onCancel, loading }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-zinc-100 mb-3">
          <ListTodo className="w-4 h-4 text-blue-500" />
          任务切分 ({analysis.tasks.length} 个任务)
        </h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {analysis.tasks.map((task, i) => (
            <div key={i} className="p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-lg">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-900 dark:text-zinc-100">{task.title}</span>
                  {task.description && (
                    <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">{task.description}</p>
                  )}
                </div>
                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${priorityColors[task.priority]}`}>
                  {priorityLabels[task.priority]}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-xs text-purple-500 dark:text-purple-400">@{task.suggestedAssigneeFunction}</span>
                <span className="text-xs text-gray-400">~{task.estimatedDays}天</span>
              </div>
              {task.subtasks && task.subtasks.length > 0 && (
                <div className="mt-1.5 pl-3 border-l-2 border-gray-200 dark:border-zinc-600 space-y-0.5">
                  {task.subtasks.map((sub, j) => (
                    <p key={j} className="text-xs text-gray-500 dark:text-zinc-400">└ {sub.title}</p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-zinc-100 mb-3">
          <Lightbulb className="w-4 h-4 text-yellow-500" />
          项目审查
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-green-50 dark:bg-green-900/10 rounded-lg">
            <div className="flex items-center gap-1.5 mb-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              <span className="text-xs font-medium text-green-700 dark:text-green-400">优势</span>
            </div>
            <ul className="space-y-1">
              {analysis.review.strengths.map((s, i) => (
                <li key={i} className="text-xs text-green-600 dark:text-green-500">• {s}</li>
              ))}
            </ul>
          </div>
          <div className="p-3 bg-red-50 dark:bg-red-900/10 rounded-lg">
            <div className="flex items-center gap-1.5 mb-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
              <span className="text-xs font-medium text-red-700 dark:text-red-400">不足</span>
            </div>
            <ul className="space-y-1">
              {analysis.review.weaknesses.map((s, i) => (
                <li key={i} className="text-xs text-red-600 dark:text-red-500">• {s}</li>
              ))}
            </ul>
          </div>
        </div>
        {analysis.review.suggestions.length > 0 && (
          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg">
            <span className="text-xs font-medium text-blue-700 dark:text-blue-400">改进建议</span>
            <ul className="mt-1 space-y-0.5">
              {analysis.review.suggestions.map((s, i) => (
                <li key={i} className="text-xs text-blue-600 dark:text-blue-500">• {s}</li>
              ))}
            </ul>
          </div>
        )}
        {analysis.review.riskPoints.length > 0 && (
          <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/10 rounded-lg">
            <div className="flex items-center gap-1.5 mb-1">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-xs font-medium text-amber-700 dark:text-amber-400">风险提示</span>
            </div>
            <ul className="space-y-0.5">
              {analysis.review.riskPoints.map((s, i) => (
                <li key={i} className="text-xs text-amber-600 dark:text-amber-500">• {s}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-zinc-100 mb-3">
          <GitBranch className="w-4 h-4 text-green-500" />
          工作流
        </h3>
        <div className="space-y-2">
          {analysis.workflow.map((phase, i) => (
            <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-lg">
              <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                {phase.order}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-900 dark:text-zinc-100">{phase.phase}</span>
                  <span className="text-xs text-purple-500 dark:text-purple-400">@{phase.assigneeFunction}</span>
                  <span className="text-xs text-gray-400">~{phase.estimatedDays}天</span>
                </div>
                {phase.description && (
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">{phase.description}</p>
                )}
                <div className="flex flex-wrap gap-1 mt-1">
                  {phase.tasks.map((t, j) => (
                    <span key={j} className="px-1.5 py-0.5 bg-white dark:bg-zinc-700 rounded text-xs text-gray-600 dark:text-zinc-300">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-zinc-700">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-zinc-300 bg-gray-100 dark:bg-zinc-700 hover:bg-gray-200 dark:hover:bg-zinc-600 rounded-lg transition-colors"
        >
          取消
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              导入中...
            </>
          ) : (
            '确认导入到看板'
          )}
        </button>
      </div>
    </div>
  );
}