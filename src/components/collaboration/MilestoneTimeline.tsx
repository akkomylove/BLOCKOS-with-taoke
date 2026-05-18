'use client';

import { useCollaborationStore } from '@/store/collaborationStore';
import { Milestone } from '@/types/collaboration';
import { CheckCircle2, Circle, Clock, Flag } from 'lucide-react';

interface MilestoneTimelineProps {
  projectId: string;
}

function StatusIcon({ status }: { status: Milestone['status'] }) {
  if (status === 'completed') return <CheckCircle2 className="w-5 h-5 text-green-500" />;
  if (status === 'in_progress') return <Clock className="w-5 h-5 text-blue-500" />;
  return <Circle className="w-5 h-5 text-gray-400" />;
}

function StatusLabel({ status }: { status: Milestone['status'] }) {
  const map = {
    pending: '待开始',
    in_progress: '进行中',
    completed: '已完成',
  };
  const color = {
    pending: 'text-gray-500 bg-gray-100',
    in_progress: 'text-blue-600 bg-blue-50',
    completed: 'text-green-600 bg-green-50',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${color[status]}`}>
      {map[status]}
    </span>
  );
}

export default function MilestoneTimeline({ projectId }: MilestoneTimelineProps) {
  const milestones = useCollaborationStore((state) => state.milestones);
  const projectMilestones = milestones
    .filter((m) => m.projectId === projectId)
    .sort((a, b) => (a.dueDate ?? 0) - (b.dueDate ?? 0));

  if (projectMilestones.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <Flag className="w-10 h-10 mb-3 opacity-50" />
        <p className="text-sm">暂无里程碑</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-zinc-100 mb-6 flex items-center gap-2">
        <Flag className="w-5 h-5 text-blue-500" />
        项目里程碑
      </h2>
      <div className="relative">
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-zinc-700" />
        <div className="space-y-6">
          {projectMilestones.map((m, i) => (
            <div key={m.id} className="relative flex items-start gap-4">
              <div className="relative z-10 flex-shrink-0 w-12 h-12 rounded-full bg-white dark:bg-zinc-800 border-2 border-gray-200 dark:border-zinc-700 flex items-center justify-center">
                <StatusIcon status={m.status} />
              </div>
              <div className="flex-1 bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700 p-4">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-medium text-gray-900 dark:text-zinc-100">{m.name}</h3>
                  <StatusLabel status={m.status} />
                </div>
                {m.description && (
                  <p className="text-sm text-gray-500 dark:text-zinc-400 mb-2">{m.description}</p>
                )}
                {m.dueDate && (
                  <p className="text-xs text-gray-400">
                    截止日期：{new Date(m.dueDate).toLocaleDateString('zh-CN')}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
