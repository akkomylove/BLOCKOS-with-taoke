'use client';

import { useEffect, useState } from 'react';
import { GitBranch, CheckCircle2, Circle, Clock, AlertTriangle, ArrowRight } from 'lucide-react';

interface WorkflowTask {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigneeId: string | null;
  workflowRole: string | null;
  stepNumber: number | null;
}

interface WorkflowViewProps {
  projectId: string;
}

export default function WorkflowView({ projectId }: WorkflowViewProps) {
  const [data, setData] = useState<{
    workflowRoles: string[];
    roleFlowStages: { role: string; stageGoal: string; watchPoints: string[] }[];
    tasksByRole: Record<string, WorkflowTask[]>;
    unassigned: WorkflowTask[];
    hasAnalysis: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/workflow-view`)
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [projectId]);

  if (loading) {
    return <div className="p-8 text-center text-sm text-gray-500">加载中...</div>;
  }

  if (!data || !data.hasAnalysis) {
    return (
      <div className="p-8 text-center">
        <GitBranch className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500">该项目暂无工作流分析</p>
        <p className="text-xs text-gray-400 mt-1">请先在工作流分析面板中分析并保存到该项目</p>
      </div>
    );
  }

  const { workflowRoles, roleFlowStages, tasksByRole, unassigned } = data;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'in_progress': return <Clock className="w-4 h-4 text-blue-500" />;
      default: return <Circle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    const map: Record<string, string> = {
      urgent: 'bg-red-100 text-red-700',
      high: 'bg-orange-100 text-orange-700',
      medium: 'bg-yellow-100 text-yellow-700',
      low: 'bg-green-100 text-green-700',
    };
    return map[priority] || 'bg-gray-100 text-gray-700';
  };

  const allDone = (tasks: WorkflowTask[]) => tasks.length > 0 && tasks.every((t) => t.status === 'done');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <GitBranch className="w-4 h-4" />
        <span>工作流视图 — 按角色分组</span>
      </div>

      <div className="space-y-4">
        {workflowRoles.map((role, index) => {
          const stage = roleFlowStages.find((s) => s.role === role);
          const tasks = tasksByRole[role] || [];
          const done = allDone(tasks);

          return (
            <div key={role} className="relative">
              {index > 0 && (
                <div className="flex justify-center -mt-2 mb-2">
                  <ArrowRight className="w-4 h-4 text-gray-300 rotate-90" />
                </div>
              )}
              <div className={`border rounded-xl p-4 ${done ? 'border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-900/10' : 'border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {done ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <Circle className="w-5 h-5 text-gray-400" />}
                  <span className="text-sm font-semibold text-gray-900 dark:text-zinc-100">{role}</span>
                  {stage && <span className="text-xs text-gray-500 dark:text-zinc-500">{stage.stageGoal}</span>}
                </div>

                {tasks.length === 0 ? (
                  <p className="text-xs text-gray-400 pl-7">暂无任务</p>
                ) : (
                  <div className="space-y-2 pl-7">
                    {tasks.map((task) => (
                      <div key={task.id} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-zinc-800/50 rounded-lg">
                        {getStatusIcon(task.status)}
                        <span className="text-sm text-gray-700 dark:text-zinc-300 flex-1">{task.title}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${getPriorityBadge(task.priority)}`}>{task.priority}</span>
                      </div>
                    ))}
                  </div>
                )}

                {stage && stage.watchPoints.length > 0 && (
                  <div className="mt-2 pl-7 flex flex-wrap gap-1">
                    {stage.watchPoints.map((wp, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded">{wp}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {unassigned.length > 0 && (
        <div className="border border-gray-200 dark:border-zinc-700 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-zinc-300">未分配任务</span>
          </div>
          <div className="space-y-2">
            {unassigned.map((task) => (
              <div key={task.id} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-zinc-800/50 rounded-lg">
                {getStatusIcon(task.status)}
                <span className="text-sm text-gray-700 dark:text-zinc-300 flex-1">{task.title}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${getPriorityBadge(task.priority)}`}>{task.priority}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
