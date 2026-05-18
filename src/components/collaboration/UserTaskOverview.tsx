'use client';

import { useState } from 'react';
import type { UserTaskSummary } from '@/types/collaboration';
import { ChevronDown, ChevronRight, Circle, CheckCircle2, Clock } from 'lucide-react';

interface Props {
  summaries: UserTaskSummary[];
}

export function UserTaskOverview({ summaries }: Props) {
  return (
    <div className="space-y-2">
      {summaries.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-zinc-500 text-center py-4">暂无任务</p>
      ) : (
        summaries.map(summary => (
          <ProjectTaskGroup key={summary.projectId} summary={summary} />
        ))
      )}
    </div>
  );
}

function ProjectTaskGroup({ summary }: { summary: UserTaskSummary }) {
  const [expanded, setExpanded] = useState(false);
  const progress = summary.totalTasks > 0
    ? Math.round((summary.completedTasks / summary.totalTasks) * 100)
    : 0;

  return (
    <div className="border border-gray-200 dark:border-zinc-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
          )}
          <span className="text-sm font-medium text-gray-900 dark:text-zinc-100">{summary.projectName}</span>
        </div>
        <span className="text-xs text-gray-500 dark:text-zinc-400 flex-shrink-0">
          {summary.completedTasks}/{summary.totalTasks}
        </span>
      </button>

      <div className="h-0.5 bg-gray-100 dark:bg-zinc-700">
        <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      {expanded && (
        <div className="p-2 space-y-0.5 max-h-48 overflow-y-auto">
          {summary.tasks.map(task => (
            <div key={task.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-zinc-800">
              {task.status === 'done' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
              ) : task.status === 'in_progress' ? (
                <Clock className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
              ) : (
                <Circle className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              )}
              <span className={`text-xs flex-1 truncate ${
                task.status === 'done'
                  ? 'text-gray-400 dark:text-zinc-500 line-through'
                  : 'text-gray-700 dark:text-zinc-300'
              }`}>
                {task.title}
              </span>
              <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${
                task.priority === 'high' || task.priority === 'urgent'
                  ? 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                  : task.priority === 'medium'
                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                    : 'bg-gray-100 text-gray-500 dark:bg-zinc-700 dark:text-zinc-400'
              }`}>
                {task.priority === 'urgent' ? '紧急' : task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}