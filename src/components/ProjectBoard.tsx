'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useCollaborationStore } from '@/store/collaborationStore';
import { useBlockStore } from '@/store/blockStore';
import { Task, TaskStatus } from '@/types/collaboration';
import { Plus, Calendar, MoreHorizontal, Trash2, ChevronDown, ArrowLeft, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ProjectImportModal } from '@/components/collaboration/ProjectImportModal';

interface ProjectBoardProps {
  projectId: string;
}

const PAGE_SIZE = 10;

const columns = [
  { id: 'todo', title: '待办', color: 'bg-[#fef3e6] text-[#e37318] dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/40' },
  { id: 'in_progress', title: '进行中', color: 'bg-[#eff4ff] text-[#3370ff] dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/40' },
  { id: 'pending_review', title: '待验收', color: 'bg-[#f7f4ff] text-[#8a73df] dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/40' },
  { id: 'done', title: '已完成', color: 'bg-[#e8f8f0] text-[#2ba471] dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/40' },
];

const priorityColors: Record<string, string> = {
  low: 'bg-[#f2f3f5] dark:bg-zinc-800 text-[#646a73] dark:text-zinc-400',
  medium: 'bg-[#eff4ff] dark:bg-blue-950/40 text-[#3370ff] dark:text-blue-300',
  high: 'bg-[#fef3e6] dark:bg-amber-950/40 text-[#e37318] dark:text-amber-300',
  urgent: 'bg-[#fff5f4] dark:bg-red-950/40 text-[#d64b42] dark:text-red-300',
};

export default function ProjectBoard({ projectId }: ProjectBoardProps) {
  const router = useRouter();
  const tasks = useCollaborationStore((state) => state.tasks);
  const fetchTasks = useCollaborationStore((state) => state.fetchTasks);
  const createTask = useCollaborationStore((state) => state.createTask);
  const updateTask = useCollaborationStore((state) => state.updateTask);
  const deleteTask = useCollaborationStore((state) => state.deleteTask);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [addingToColumn, setAddingToColumn] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState<Record<string, number>>({});
  const [showImport, setShowImport] = useState(false);
  const isMountedRef = useRef(true);

  const handleFetchTasks = useCallback(() => {
    fetchTasks(projectId);
  }, [projectId, fetchTasks]);

  useEffect(() => {
    isMountedRef.current = true;
    handleFetchTasks();
    return () => {
      isMountedRef.current = false;
    };
  }, [handleFetchTasks]);

  useEffect(() => {
    const initialCounts: Record<string, number> = {};
    columns.forEach((col) => {
      initialCounts[col.id] = PAGE_SIZE;
    });
    setVisibleCount(initialCounts);
  }, []);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetch('/api/user/profile')
      .then(r => r.json())
      .then(data => {
        setCurrentUserId(data.userId || null);
        setIsAdmin(Boolean(data.isAdmin || data.role === 'admin' || data.role === 'owner'));
      })
      .catch(() => {});
  }, []);

  const getTasksByStatus = (status: string) => {
    const filtered = tasks.filter(task => task.status === status);
    if (isAdmin) return filtered;
    if (!currentUserId) return filtered;
    return filtered.filter(task => !task.assigneeId || task.assigneeId === currentUserId);
  };

  const getVisibleTasks = (status: string) => {
    const allTasks = getTasksByStatus(status);
    const count = visibleCount[status] || PAGE_SIZE;
    return allTasks.slice(0, count);
  };

  const handleLoadMore = (columnId: string) => {
    setVisibleCount((prev) => ({
      ...prev,
      [columnId]: (prev[columnId] || PAGE_SIZE) + PAGE_SIZE,
    }));
  };

  const handleAddTask = async (status: TaskStatus) => {
    if (!newTaskTitle.trim()) return;
    try {
      await createTask(projectId, newTaskTitle.trim(), undefined, '', status, 'medium');
      if (!isMountedRef.current) return;
      setNewTaskTitle('');
      setAddingToColumn(null);
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const handleUpdateStatus = (taskId: string, newStatus: TaskStatus) => {
    updateTask(taskId, { status: newStatus });
    // 同步更新画布中对应的 Block 状态
    const blocks = useBlockStore.getState().blocks;
    const targetBlock = blocks.find((b) => b.meta?.taskId === taskId);
    if (targetBlock) {
      useBlockStore.getState().updateBlock(targetBlock.id, {
        meta: {
          ...targetBlock.meta,
          checked: newStatus === 'done',
          status: newStatus,
        },
      });
    }
  };

  return (
    <div className="min-h-screen bg-page dark:bg-[#141517] p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/teams')}
              className="p-2 hover:bg-surface-hover dark:hover:bg-zinc-800 rounded-lg text-content-secondary dark:text-zinc-400 transition-colors"
              title="返回团队"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-content dark:text-zinc-100">研发任务看板</h1>
          </div>
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand hover:bg-brand-hover active:bg-brand-active text-white rounded-lg text-xs font-medium transition-all shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI 计划书导入
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {columns.map((column) => (
            <div key={column.id} className="flex flex-col">
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <div className={`px-2.5 py-0.5 rounded-full ${column.color} text-xs font-semibold shadow-xs`}>
                    {column.title}
                  </div>
                  <span className="text-xs font-medium text-content-tertiary dark:text-zinc-400">
                    {getTasksByStatus(column.id).length}
                  </span>
                </div>
                <button
                  onClick={() => setAddingToColumn(addingToColumn === column.id ? null : column.id)}
                  className="p-1.5 hover:bg-surface-hover dark:hover:bg-zinc-800 rounded-lg text-content-tertiary hover:text-content-secondary dark:hover:text-zinc-300 transition-colors"
                  title="添加任务"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 bg-surface-hover/70 dark:bg-zinc-900/60 rounded-xl p-3 space-y-2.5 border border-line-subtle dark:border-zinc-800/80 min-h-[400px]">
                {addingToColumn === column.id && (
                  <div className="bg-white dark:bg-[#1a1c20] rounded-xl p-3 border border-brand/50 dark:border-blue-700 shadow-xs">
                    <input
                      autoFocus
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      placeholder="输入任务标题..."
                      className="w-full bg-transparent text-sm text-content dark:text-zinc-100 placeholder-content-tertiary outline-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddTask(column.id as 'todo' | 'in_progress' | 'done');
                        if (e.key === 'Escape') {
                          setAddingToColumn(null);
                          setNewTaskTitle('');
                        }
                      }}
                    />
                    <div className="flex gap-2 mt-2 pt-2 border-t border-line-subtle dark:border-zinc-800">
                      <button
                        onClick={() => handleAddTask(column.id as TaskStatus)}
                        className="px-3 py-1 text-xs font-medium text-white bg-brand hover:bg-brand-hover rounded-md shadow-xs transition-colors"
                      >
                        添加
                      </button>
                      <button
                        onClick={() => {
                          setAddingToColumn(null);
                          setNewTaskTitle('');
                        }}
                        className="px-3 py-1 text-xs font-medium text-content-secondary dark:text-zinc-400 hover:bg-surface-hover dark:hover:bg-zinc-700 rounded-md transition-colors"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                )}

                {getVisibleTasks(column.id).map((task) => (
                  <MemoizedTaskCard
                    key={task.id}
                    task={task}
                    onUpdateStatus={handleUpdateStatus}
                    onUpdatePriority={(taskId, priority) => updateTask(taskId, { priority })}
                    onDelete={() => deleteTask(task.id)}
                  />
                ))}

                {getTasksByStatus(column.id).length > visibleCount[column.id] && (
                  <button
                    onClick={() => handleLoadMore(column.id)}
                    className="w-full py-2 text-xs text-content-tertiary hover:text-content-secondary dark:hover:text-zinc-300 flex items-center justify-center gap-1 transition-colors"
                  >
                    <ChevronDown className="w-3 h-3" />
                    加载更多
                  </button>
                )}

                {getTasksByStatus(column.id).length === 0 && !addingToColumn && (
                  <div className="text-center py-12 text-content-tertiary dark:text-zinc-500 text-xs">
                    暂无任务
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      {showImport && (
        <ProjectImportModal
          isOpen={showImport}
          onClose={() => setShowImport(false)}
          projectId={projectId}
        />
      )}
    </div>
  );
}

interface TaskCardProps {
  task: Task;
  onUpdateStatus: (taskId: string, status: TaskStatus) => void;
  onUpdatePriority: (taskId: string, priority: 'low' | 'medium' | 'high' | 'urgent') => void;
  onDelete: () => void;
}

const priorityLabels: Record<string, string> = {
  low: '低',
  medium: '中',
  high: '高',
  urgent: '紧急',
};

function TaskCard({ task, onUpdateStatus, onUpdatePriority, onDelete }: TaskCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="bg-white dark:bg-[#1a1c20] rounded-xl p-3.5 border border-line dark:border-zinc-800 hover:border-brand/40 hover:shadow-card transition-all group">
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-sm font-medium text-content dark:text-zinc-100 flex-1 leading-snug">{task.title}</h3>
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1 hover:bg-surface-hover dark:hover:bg-zinc-800 rounded-lg text-content-tertiary hover:text-content-secondary dark:hover:text-zinc-300 transition-all"
            title="更多操作"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {showMenu && (
            <div
              className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-zinc-800 border border-line dark:border-zinc-700 rounded-xl shadow-popover z-10 py-1"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-3 py-1 text-[10px] font-medium text-content-tertiary dark:text-zinc-500 uppercase tracking-wider">移动到</div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateStatus(task.id, 'todo');
                  setShowMenu(false);
                }}
                className="w-full px-3 py-1.5 text-left text-xs text-content-secondary dark:text-zinc-200 hover:bg-surface-hover dark:hover:bg-zinc-700 transition-colors"
              >
                待办
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateStatus(task.id, 'in_progress');
                  setShowMenu(false);
                }}
                className="w-full px-3 py-1.5 text-left text-xs text-content-secondary dark:text-zinc-200 hover:bg-surface-hover dark:hover:bg-zinc-700 transition-colors"
              >
                进行中
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateStatus(task.id, 'pending_review');
                  setShowMenu(false);
                }}
                className="w-full px-3 py-1.5 text-left text-xs text-content-secondary dark:text-zinc-200 hover:bg-surface-hover dark:hover:bg-zinc-700 transition-colors"
              >
                待验收
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateStatus(task.id, 'done');
                  setShowMenu(false);
                }}
                className="w-full px-3 py-1.5 text-left text-xs text-content-secondary dark:text-zinc-200 hover:bg-surface-hover dark:hover:bg-zinc-700 transition-colors"
              >
                已完成
              </button>
              <div className="border-t border-line-subtle dark:border-zinc-700/80 my-1" />
              <div className="px-3 py-1 text-[10px] font-medium text-content-tertiary dark:text-zinc-500 uppercase tracking-wider">优先级</div>
              {(['low', 'medium', 'high', 'urgent'] as const).map((p) => (
                <button
                  key={p}
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdatePriority(task.id, p);
                    setShowMenu(false);
                  }}
                  className={`w-full px-3 py-1.5 text-left text-xs hover:bg-surface-hover dark:hover:bg-zinc-700 flex items-center gap-2 transition-colors ${
                    task.priority === p ? 'text-brand dark:text-blue-300 font-medium' : 'text-content-secondary dark:text-zinc-200'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${priorityColors[p].split(' ')[0]}`} />
                  {priorityLabels[p]}
                </button>
              ))}
              <div className="border-t border-line-subtle dark:border-zinc-700/80 my-1" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                  setShowMenu(false);
                }}
                className="w-full px-3 py-1.5 text-left text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                删除
              </button>
            </div>
          )}
        </div>
      </div>
      {task.description && (
        <p className="text-xs text-content-secondary dark:text-zinc-400 mb-2.5 line-clamp-2 leading-relaxed">{task.description}</p>
      )}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${priorityColors[task.priority]}`}>
            {priorityLabels[task.priority]}
          </span>
        </div>
        {task.dueDate && (
          <div className="flex items-center gap-1 text-[11px] text-content-tertiary">
            <Calendar className="w-3 h-3" />
            <span>{new Date(task.dueDate).toLocaleDateString()}</span>
          </div>
        )}
      </div>
    </div>
  );
}

const MemoizedTaskCard = React.memo(TaskCard);
