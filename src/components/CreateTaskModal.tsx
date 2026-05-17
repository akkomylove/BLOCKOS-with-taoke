'use client';

import { useState } from 'react';
import { useCollaborationStore } from '@/store/collaborationStore';
import { X, Plus, Flag, Calendar, AlignLeft } from 'lucide-react';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
  parentId?: string;
}

export default function CreateTaskModal({ isOpen, onClose, projectId, parentId }: CreateTaskModalProps) {
  const createTask = useCollaborationStore((state) => state.createTask);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [status, setStatus] = useState<'todo' | 'in_progress' | 'done'>('todo');
  const [dueDate, setDueDate] = useState('');
  const [dod, setDod] = useState('');
  const [loading, setLoading] = useState(false);

  const priorityOptions = [
    { value: 'low', label: '低', color: 'bg-gray-500' },
    { value: 'medium', label: '中', color: 'bg-yellow-500' },
    { value: 'high', label: '高', color: 'bg-orange-500' },
    { value: 'urgent', label: '紧急', color: 'bg-red-500' },
  ];

  const statusOptions = [
    { value: 'todo', label: '待办' },
    { value: 'in_progress', label: '进行中' },
    { value: 'done', label: '已完成' },
  ];

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !projectId) return;

    setLoading(true);
    try {
      await createTask(
        projectId,
        title.trim(),
        parentId,
        description.trim() || undefined,
        status,
        priority,
        undefined,
        dueDate ? new Date(dueDate).getTime() : undefined,
        dod.trim() || undefined
      );
      onClose();
      setTitle('');
      setDescription('');
      setPriority('medium');
      setStatus('todo');
      setDueDate('');
      setDod('');
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-zinc-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-zinc-100">新建任务</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1.5">
              任务标题
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入任务标题..."
              className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-700 border border-gray-200 dark:border-zinc-600 rounded-lg text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1.5 flex items-center gap-2">
              <AlignLeft className="w-3.5 h-3.5" />
              任务描述
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="输入任务描述..."
              rows={3}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-700 border border-gray-200 dark:border-zinc-600 rounded-lg text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1.5 flex items-center gap-2">
                <Flag className="w-3.5 h-3.5" />
                优先级
              </label>
              <div className="flex gap-2">
                {priorityOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setPriority(option.value as 'low' | 'medium' | 'high' | 'urgent')}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      priority === option.value
                        ? `${option.color} text-white`
                        : 'bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-600'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1.5">
                状态
              </label>
              <div className="flex gap-2">
                {statusOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setStatus(option.value as 'todo' | 'in_progress' | 'done')}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      status === option.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-600'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1.5 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" />
              截止日期
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-700 border border-gray-200 dark:border-zinc-600 rounded-lg text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1.5">
              完成标准 (DoD)
            </label>
            <textarea
              value={dod}
              onChange={(e) => setDod(e.target.value)}
              placeholder="输入任务完成标准..."
              rows={2}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-700 border border-gray-200 dark:border-zinc-600 rounded-lg text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-zinc-300 bg-gray-100 dark:bg-zinc-700 hover:bg-gray-200 dark:hover:bg-zinc-600 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              创建任务
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
