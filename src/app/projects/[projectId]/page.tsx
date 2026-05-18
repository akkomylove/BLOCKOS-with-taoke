'use client';

import ProjectBoard from '@/components/ProjectBoard';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useCollaborationStore } from '@/store/collaborationStore';
import { GanttChart } from '@/components/collaboration/GanttChart';
import MilestoneTimeline from '@/components/collaboration/MilestoneTimeline';
import { LayoutGrid, BarChart3, Flag } from 'lucide-react';

export default function ProjectBoardPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const setCurrentProject = useCollaborationStore((state) => state.setCurrentProject);
  const tasks = useCollaborationStore((state) => state.tasks);
  const [activeView, setActiveView] = useState<'board' | 'gantt' | 'milestones'>('board');

  useEffect(() => {
    setCurrentProject(projectId);
    return () => setCurrentProject(null);
  }, [projectId, setCurrentProject]);

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-zinc-900">
      <div className="flex items-center gap-1 px-4 py-2 bg-white dark:bg-zinc-800 border-b border-gray-200 dark:border-zinc-700">
        <button
          onClick={() => setActiveView('board')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeView === 'board'
              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
              : 'text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-300'
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          看板
        </button>
        <button
          onClick={() => setActiveView('gantt')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeView === 'gantt'
              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
              : 'text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-300'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          甘特图
        </button>
        <button
          onClick={() => setActiveView('milestones')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeView === 'milestones'
              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
              : 'text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-300'
          }`}
        >
          <Flag className="w-4 h-4" />
          里程碑
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {activeView === 'board' && <ProjectBoard projectId={projectId} />}
        {activeView === 'gantt' && (
          <div className="p-4">
            <GanttChart tasks={tasks} />
          </div>
        )}
        {activeView === 'milestones' && <MilestoneTimeline projectId={projectId} />}
      </div>
    </div>
  );
}