'use client';

import { Task } from '@/types/collaboration';
import { useCollaborationStore } from '@/store/collaborationStore';
import { CheckCircle2, Circle, Clock, MessageSquare, MoreHorizontal } from 'lucide-react';
import { useState } from 'react';

interface TaskCardProps {
  task: Task;
  onSelect?: (task: Task) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
}

export default function TaskCard({ task, onSelect, onEdit, onDelete }: TaskCardProps) {
  const updateTask = useCollaborationStore((state) => state.updateTask);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const statusIcons = {
    todo: <Circle className="w-4 h-4" />,
    in_progress: <Clock className="w-4 h-4" />,
    done: <CheckCircle2 className="w-4 h-4" />,
  };

  const statusColors = {
    todo: 'text-gray-400',
    in_progress: 'text-blue-400',
    done: 'text-green-400',
  };

  const priorityColors = {
    low: 'bg-gray-500',
    medium: 'bg-yellow-500',
    high: 'bg-orange-500',
    urgent: 'bg-red-500',
  };

  const priorityLabels = {
    low: '低',
    medium: '中',
    high: '高',
    urgent: '紧急',
  };

  const handleStatusToggle = async () => {
    setIsUpdating(true);
    try {
      const newStatus = task.status === 'done' ? 'todo' : task.status === 'todo' ? 'in_progress' : 'done';
      await updateTask(task.id, { status: newStatus });
    } catch (error) {
      console.error('Failed to update task status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div 
      className="bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl p-4 hover:shadow-lg transition-all cursor-pointer group"
      onClick={() => onSelect?.(task)}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleStatusToggle();
          }}
          disabled={isUpdating}
          className={`mt-0.5 transition-all hover:scale-110 ${statusColors[task.status]} ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {statusIcons[task.status]}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className={`font-medium text-gray-900 dark:text-zinc-100 ${task.status === 'done' ? 'line-through text-gray-400 dark:text-zinc-500' : ''}`}>
                {task.title}
              </h3>
              {task.description && (
                <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1 line-clamp-2">
                  {task.description}
                </p>
              )}
            </div>
            <div className="relative ml-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(!menuOpen);
                }}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-lg text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 transition-colors opacity-0 group-hover:opacity-100"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-zinc-700 border border-gray-200 dark:border-zinc-600 rounded-md shadow-lg z-50 py-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit?.(task);
                      setMenuOpen(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-xs text-gray-800 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-600 flex items-center gap-2"
                  >
                    编辑
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete?.(task);
                      setMenuOpen(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-xs text-red-500 hover:bg-gray-100 dark:hover:bg-zinc-600 flex items-center gap-2"
                  >
                    删除
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <div className={`w-2 h-2 rounded-full ${priorityColors[task.priority]}`} />
            <span className="text-xs text-gray-500 dark:text-zinc-400">
              {priorityLabels[task.priority]}
            </span>
            {task.dueDate && (
              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-zinc-400 ml-2">
                <Clock className="w-3 h-3" />
                <span>{new Date(task.dueDate).toLocaleDateString()}</span>
              </div>
            )}
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-zinc-400 ml-auto">
              <MessageSquare className="w-3 h-3" />
              <span>0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
