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

  const statusIcons: Record<string, React.ReactNode> = {
    todo: <Circle className="w-4 h-4" />,
    in_progress: <Clock className="w-4 h-4" />,
    pending_review: <Clock className="w-4 h-4 text-amber-500" />,
    done: <CheckCircle2 className="w-4 h-4" />,
    rejected: <Circle className="w-4 h-4 text-red-500" />,
  };

  const statusColors: Record<string, string> = {
    todo: 'text-gray-400',
    in_progress: 'text-blue-400',
    pending_review: 'text-amber-500',
    done: 'text-green-400',
    rejected: 'text-red-500',
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
      className="bg-white dark:bg-[#1a1c20] border border-line dark:border-zinc-800 rounded-xl p-4 hover:border-brand/40 hover:shadow-card transition-all cursor-pointer group"
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
              <h3 className={`text-sm font-medium text-content dark:text-zinc-100 leading-snug ${task.status === 'done' ? 'line-through text-content-tertiary dark:text-zinc-500' : ''}`}>
                {task.title}
              </h3>
              {task.description && (
                <p className="text-xs text-content-secondary dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
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
                className="p-1.5 hover:bg-surface-hover dark:hover:bg-zinc-800 rounded-lg text-content-tertiary hover:text-content-secondary dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors opacity-0 group-hover:opacity-100"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-36 bg-white dark:bg-zinc-800 border border-line dark:border-zinc-700 rounded-xl shadow-popover z-50 py-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit?.(task);
                      setMenuOpen(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-xs text-content-secondary dark:text-zinc-200 hover:bg-surface-hover dark:hover:bg-zinc-700 transition-colors"
                  >
                    编辑
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete?.(task);
                      setMenuOpen(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  >
                    删除
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <div className={`w-2 h-2 rounded-full ${priorityColors[task.priority]}`} />
            <span className="text-xs text-content-secondary dark:text-zinc-400">
              {priorityLabels[task.priority]}
            </span>
            {task.dueDate && (
              <div className="flex items-center gap-1 text-xs text-content-tertiary ml-2">
                <Clock className="w-3 h-3" />
                <span>{new Date(task.dueDate).toLocaleDateString()}</span>
              </div>
            )}
            <div className="flex items-center gap-1 text-xs text-content-tertiary ml-auto">
              <MessageSquare className="w-3 h-3" />
              <span>0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
