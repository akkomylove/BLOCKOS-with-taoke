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
    <div className="h-screen flex flex-col bg-page dark:bg-[#141517]">
      <div className="flex items-center gap-1.5 px-6 py-2.5 bg-white dark:bg-[#1a1c20] border-b border-line dark:border-zinc-800">
        <button
          onClick={() => setActiveView('board')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeView === 'board'
              ? 'bg-brand-light dark:bg-blue-950/40 text-brand dark:text-blue-300 shadow-xs'
              : 'text-content-secondary dark:text-zinc-400 hover:text-content hover:bg-surface-hover dark:hover:bg-zinc-800'
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          任务看板
        </button>
        <button
          onClick={() => setActiveView('gantt')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeView === 'gantt'
              ? 'bg-brand-light dark:bg-blue-950/40 text-brand dark:text-blue-300 shadow-xs'
              : 'text-content-secondary dark:text-zinc-400 hover:text-content hover:bg-surface-hover dark:hover:bg-zinc-800'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          甘特图
        </button>
        <button
          onClick={() => setActiveView('milestones')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeView === 'milestones'
              ? 'bg-brand-light dark:bg-blue-950/40 text-brand dark:text-blue-300 shadow-xs'
              : 'text-content-secondary dark:text-zinc-400 hover:text-content hover:bg-surface-hover dark:hover:bg-zinc-800'
          }`}
        >
          <Flag className="w-3.5 h-3.5" />
          里程碑追踪
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