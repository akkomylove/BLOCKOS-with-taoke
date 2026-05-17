'use client';

import { useState } from 'react';
import { Task } from '@/types/collaboration';
import { useCollaborationStore } from '@/store/collaborationStore';
import { X, CheckCircle2, Flag, MessageSquare, Send, Calendar, AlignLeft, CheckSquare } from 'lucide-react';

interface TaskDetailProps {
  task: Task;
  onClose: () => void;
}

interface Comment {
  id: string;
  author: string;
  content: string;
  createdAt: number;
}

export default function TaskDetail({ task, onClose }: TaskDetailProps) {
  const updateTask = useCollaborationStore((state) => state.updateTask);
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [priority, setPriority] = useState(task.priority);
  const [status, setStatus] = useState(task.status);
  const [dueDate, setDueDate] = useState(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '');
  const [dod, setDod] = useState(task.dod || '');
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

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

  const statusLabels = {
    todo: '待办',
    in_progress: '进行中',
    done: '已完成',
  };

  const handleSave = async () => {
    setIsUpdating(true);
    try {
      await updateTask(task.id, {
        title,
        description: description || undefined,
        priority,
        status,
        dueDate: dueDate ? new Date(dueDate).getTime() : undefined,
        dod: dod || undefined,
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update task:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    const newComment: Comment = {
      id: Date.now().toString(),
      author: '当前用户',
      content: commentText.trim(),
      createdAt: Date.now(),
    };
    setComments([newComment, ...comments]);
    setCommentText('');
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative ml-auto w-full max-w-lg bg-white dark:bg-zinc-800 shadow-2xl h-full overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-zinc-800 border-b border-gray-200 dark:border-zinc-700 p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-zinc-100">任务详情</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1.5">
                  任务标题
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-700 border border-gray-200 dark:border-zinc-600 rounded-lg text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
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
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-700 border border-gray-200 dark:border-zinc-600 rounded-lg text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1.5 flex items-center gap-2">
                  <Flag className="w-3.5 h-3.5" />
                  优先级
                </label>
                <div className="flex gap-2">
                  {Object.entries(priorityLabels).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setPriority(key as 'low' | 'medium' | 'high' | 'urgent')}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        priority === key
                          ? `${priorityColors[key as keyof typeof priorityColors]} text-white`
                          : 'bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-600'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1.5">
                  状态
                </label>
                <div className="flex gap-2">
                  {Object.entries(statusLabels).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setStatus(key as 'todo' | 'in_progress' | 'done')}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        status === key
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-600'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
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
                <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1.5 flex items-center gap-2">
                  <CheckSquare className="w-3.5 h-3.5" />
                  完成标准 (DoD)
                </label>
                <textarea
                  value={dod}
                  onChange={(e) => setDod(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-700 border border-gray-200 dark:border-zinc-600 rounded-lg text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setTitle(task.title);
                    setDescription(task.description || '');
                    setPriority(task.priority);
                    setStatus(task.status);
                    setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '');
                    setDod(task.dod || '');
                  }}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-zinc-300 bg-gray-100 dark:bg-zinc-700 hover:bg-gray-200 dark:hover:bg-zinc-600 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isUpdating}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {isUpdating ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  保存
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className={`text-xl font-semibold text-gray-900 dark:text-zinc-100 ${task.status === 'done' ? 'line-through text-gray-400 dark:text-zinc-500' : ''}`}>
                  {task.title}
                </h3>
                <div className="flex items-center gap-3 mt-3">
                  <div className={`w-2 h-2 rounded-full ${priorityColors[task.priority]}`} />
                  <span className="text-sm text-gray-500 dark:text-zinc-400">
                    {priorityLabels[task.priority]}优先级
                  </span>
                  <span className="text-sm text-gray-500 dark:text-zinc-400">·</span>
                  <span className="text-sm text-gray-500 dark:text-zinc-400">
                    {statusLabels[task.status]}
                  </span>
                </div>
              </div>

              {task.description && (
                <div>
                  <div className="text-xs font-medium text-gray-500 dark:text-zinc-400 mb-2">描述</div>
                  <p className="text-sm text-gray-700 dark:text-zinc-300 whitespace-pre-wrap">
                    {task.description}
                  </p>
                </div>
              )}

              {(task.dueDate || task.dod) && (
                <div className="space-y-3">
                  {task.dueDate && (
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="text-xs font-medium text-gray-500 dark:text-zinc-400">截止日期</div>
                        <div className="text-sm text-gray-700 dark:text-zinc-300">
                          {new Date(task.dueDate).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  )}
                  {task.dod && (
                    <div>
                      <div className="text-xs font-medium text-gray-500 dark:text-zinc-400 mb-2">完成标准</div>
                      <p className="text-sm text-gray-700 dark:text-zinc-300 whitespace-pre-wrap">
                        {task.dod}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={() => setIsEditing(true)}
                className="w-full px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
              >
                编辑任务
              </button>

              <div className="border-t border-gray-200 dark:border-zinc-700 pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare className="w-4 h-4 text-gray-400" />
                  <div className="text-sm font-medium text-gray-900 dark:text-zinc-100">
                    评论 ({comments.length})
                  </div>
                </div>

                <div className="flex gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                    我
                  </div>
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="添加评论..."
                      className="flex-1 px-3 py-2 bg-gray-50 dark:bg-zinc-700 border border-gray-200 dark:border-zinc-600 rounded-lg text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-sm"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                    />
                    <button
                      onClick={handleAddComment}
                      disabled={!commentText.trim()}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                        {comment.author[0]}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-zinc-100">
                            {comment.author}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(comment.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-zinc-300 mt-1">
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  ))}
                  {comments.length === 0 && (
                    <div className="text-center py-8 text-sm text-gray-500 dark:text-zinc-400">
                      暂无评论，开始第一条评论吧
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
