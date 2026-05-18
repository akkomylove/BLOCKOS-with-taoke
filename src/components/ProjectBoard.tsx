'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useCollaborationStore } from '@/store/collaborationStore';
import { Task } from '@/types/collaboration';
import { Plus, Calendar, MoreHorizontal, Trash2, ChevronDown, ArrowLeft, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ProjectImportModal } from '@/components/collaboration/ProjectImportModal';

interface ProjectBoardProps {
  projectId: string;
}

const PAGE_SIZE = 10;

const columns = [
  { id: 'todo', title: '待办', color: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400' },
  { id: 'in_progress', title: '进行中', color: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' },
  { id: 'done', title: '已完成', color: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400' },
];

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
  medium: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  high: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
  urgent: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
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
        setIsAdmin(data.userId === 'demo-admin-001');
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

  const handleAddTask = async (status: 'todo' | 'in_progress' | 'done') => {
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

  const handleUpdateStatus = (taskId: string, newStatus: 'todo' | 'in_progress' | 'done') => {
    updateTask(taskId, { status: newStatus });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/teams')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg text-gray-500 dark:text-zinc-400 transition-colors"
              title="返回团队"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-gray-900 dark:text-zinc-100">看板</h1>
          </div>
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white rounded-lg text-xs font-medium transition-all shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI 导入
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {columns.map((column) => (
            <div key={column.id} className="flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className={`px-3 py-1 rounded-full ${column.color} text-xs font-semibold`}>
                    {column.title}
                  </div>
                  <span className="text-sm text-gray-500 dark:text-zinc-400">
                    {getTasksByStatus(column.id).length}
                  </span>
                </div>
                <button
                  onClick={() => setAddingToColumn(addingToColumn === column.id ? null : column.id)}
                  className="p-1.5 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 bg-gray-100 dark:bg-zinc-800 rounded-xl p-3 space-y-3">
                {addingToColumn === column.id && (
                  <div className="bg-white dark:bg-zinc-700 rounded-lg p-3 border border-gray-200 dark:border-zinc-600">
                    <input
                      autoFocus
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      placeholder="输入任务标题..."
                      className="w-full bg-transparent text-sm text-gray-900 dark:text-zinc-100 placeholder-gray-400 outline-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddTask(column.id as 'todo' | 'in_progress' | 'done');
                        if (e.key === 'Escape') {
                          setAddingToColumn(null);
                          setNewTaskTitle('');
                        }
                      }}
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleAddTask(column.id as 'todo' | 'in_progress' | 'done')}
                        className="px-3 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                      >
                        添加
                      </button>
                      <button
                        onClick={() => {
                          setAddingToColumn(null);
                          setNewTaskTitle('');
                        }}
                        className="px-3 py-1 text-xs font-medium text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-600 rounded-md"
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
                    className="w-full py-2 text-xs text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-300 flex items-center justify-center gap-1"
                  >
                    <ChevronDown className="w-3 h-3" />
                    加载更多
                  </button>
                )}

                {getTasksByStatus(column.id).length === 0 && !addingToColumn && (
                  <div className="text-center py-8 text-gray-400 dark:text-zinc-500 text-sm">
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
  onUpdateStatus: (taskId: string, status: 'todo' | 'in_progress' | 'done') => void;
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
    <div className="bg-white dark:bg-zinc-700 rounded-lg p-4 border border-gray-200 dark:border-zinc-600 hover:shadow-md transition-all group">
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-900 dark:text-zinc-100 flex-1">{task.title}</h3>
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-600 rounded text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 transition-all"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {showMenu && (
            <div
              className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-zinc-600 border border-gray-200 dark:border-zinc-500 rounded-md shadow-lg z-10 py-1"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-2 py-1 text-xs text-gray-500 dark:text-zinc-400">移动到</div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateStatus(task.id, 'todo');
                  setShowMenu(false);
                }}
                className="w-full px-3 py-1.5 text-left text-xs text-gray-800 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-500"
              >
                待办
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateStatus(task.id, 'in_progress');
                  setShowMenu(false);
                }}
                className="w-full px-3 py-1.5 text-left text-xs text-gray-800 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-500"
              >
                进行中
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateStatus(task.id, 'done');
                  setShowMenu(false);
                }}
                className="w-full px-3 py-1.5 text-left text-xs text-gray-800 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-500"
              >
                已完成
              </button>
              <div className="border-t border-gray-200 dark:border-zinc-500 my-1" />
              <div className="px-2 py-1 text-xs text-gray-500 dark:text-zinc-400">优先级</div>
              {(['low', 'medium', 'high', 'urgent'] as const).map((p) => (
                <button
                  key={p}
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdatePriority(task.id, p);
                    setShowMenu(false);
                  }}
                  className={`w-full px-3 py-1.5 text-left text-xs hover:bg-gray-100 dark:hover:bg-zinc-500 flex items-center gap-2 ${
                    task.priority === p ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-800 dark:text-zinc-200'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${priorityColors[p].split(' ')[0]}`} />
                  {priorityLabels[p]}
                </button>
              ))}
              <div className="border-t border-gray-200 dark:border-zinc-500 my-1" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                  setShowMenu(false);
                }}
                className="w-full px-3 py-1.5 text-left text-xs text-red-500 hover:bg-gray-100 dark:hover:bg-zinc-500 flex items-center gap-2"
              >
                <Trash2 className="w-3 h-3" />
                删除
              </button>
            </div>
          )}
        </div>
      </div>
      {task.description && (
        <p className="text-xs text-gray-500 dark:text-zinc-400 mb-3">{task.description}</p>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${priorityColors[task.priority]}`}>
            {priorityLabels[task.priority]}
          </span>
        </div>
        {task.dueDate && (
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Calendar className="w-3 h-3" />
            <span>{new Date(task.dueDate).toLocaleDateString()}</span>
          </div>
        )}
      </div>
    </div>
  );
}

const MemoizedTaskCard = React.memo(TaskCard);
