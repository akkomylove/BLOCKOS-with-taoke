'use client';

import { useState } from 'react';
import { Task } from '@/types/collaboration';
import { useCollaborationStore } from '@/store/collaborationStore';
import { useBlockStore } from '@/store/blockStore';
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

  const statusLabels: Record<string, string> = {
    todo: '待办',
    in_progress: '进行中',
    pending_review: '待验收',
    done: '已完成',
    rejected: '已退回',
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

      // 跨视图联动：若画布上有对应的 Block，同步更新其状态与属性
      const blocks = useBlockStore.getState().blocks;
      const targetBlock = blocks.find((b) => b.meta?.taskId === task.id || (b.type === 'todo' && b.content.includes(task.title)));
      if (targetBlock) {
        useBlockStore.getState().updateBlock(targetBlock.id, {
          title,
          meta: {
            ...targetBlock.meta,
            checked: status === 'done',
            status,
            priority,
            dod,
          },
        });
      }

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
        className="absolute inset-0 bg-black/30 dark:bg-black/60 backdrop-blur-xs"
        onClick={onClose}
      />
      <div className="relative ml-auto w-full max-w-lg bg-white dark:bg-[#1a1c20] shadow-modal h-full overflow-y-auto border-l border-line dark:border-zinc-800">
        <div className="sticky top-0 bg-white dark:bg-[#1a1c20] border-b border-line-subtle dark:border-zinc-800 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-base font-semibold text-content dark:text-zinc-100">任务详情</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-surface-hover dark:hover:bg-zinc-800 rounded-lg text-content-tertiary hover:text-content-secondary dark:hover:text-zinc-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-content-secondary dark:text-zinc-400 mb-1.5">
                  任务标题
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2 bg-page dark:bg-zinc-800 border border-line dark:border-zinc-700 rounded-lg text-content dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand text-sm transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-content-secondary dark:text-zinc-400 mb-1.5 flex items-center gap-2">
                  <AlignLeft className="w-3.5 h-3.5 text-brand" />
                  任务描述
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3.5 py-2 bg-page dark:bg-zinc-800 border border-line dark:border-zinc-700 rounded-lg text-content dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand text-sm transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-content-secondary dark:text-zinc-400 mb-1.5 flex items-center gap-2">
                  <Flag className="w-3.5 h-3.5 text-brand" />
                  优先级
                </label>
                <div className="flex gap-2">
                  {Object.entries(priorityLabels).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setPriority(key as 'low' | 'medium' | 'high' | 'urgent')}
                      className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        priority === key
                          ? `${priorityColors[key as keyof typeof priorityColors]} text-white shadow-xs`
                          : 'bg-surface-hover dark:bg-zinc-800 text-content-secondary dark:text-zinc-400 hover:bg-line-subtle dark:hover:bg-zinc-700'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-content-secondary dark:text-zinc-400 mb-1.5">
                  状态
                </label>
                <div className="flex gap-2">
                  {Object.entries(statusLabels).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setStatus(key as 'todo' | 'in_progress' | 'done')}
                      className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        status === key
                          ? 'bg-brand text-white shadow-xs'
                          : 'bg-surface-hover dark:bg-zinc-800 text-content-secondary dark:text-zinc-400 hover:bg-line-subtle dark:hover:bg-zinc-700'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-content-secondary dark:text-zinc-400 mb-1.5 flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-brand" />
                  截止日期
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3.5 py-2 bg-page dark:bg-zinc-800 border border-line dark:border-zinc-700 rounded-lg text-content dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand text-sm transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-content-secondary dark:text-zinc-400 mb-1.5 flex items-center gap-2">
                  <CheckSquare className="w-3.5 h-3.5 text-brand" />
                  完成标准 (DoD)
                </label>
                <textarea
                  value={dod}
                  onChange={(e) => setDod(e.target.value)}
                  rows={2}
                  className="w-full px-3.5 py-2 bg-page dark:bg-zinc-800 border border-line dark:border-zinc-700 rounded-lg text-content dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand text-sm transition-all resize-none"
                />
              </div>

              <div className="flex gap-2.5 pt-3 border-t border-line-subtle dark:border-zinc-800">
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
                  className="flex-1 px-4 py-2 text-sm font-medium text-content-secondary dark:text-zinc-300 bg-surface-hover dark:bg-zinc-800 hover:bg-line-subtle dark:hover:bg-zinc-700 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isUpdating}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-brand hover:bg-brand-hover active:bg-brand-active disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs"
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
                <h3 className={`text-xl font-semibold text-content dark:text-zinc-100 leading-snug ${task.status === 'done' ? 'line-through text-content-tertiary dark:text-zinc-500' : ''}`}>
                  {task.title}
                </h3>
                <div className="flex items-center gap-3 mt-3">
                  <div className={`w-2 h-2 rounded-full ${priorityColors[task.priority]}`} />
                  <span className="text-xs text-content-secondary dark:text-zinc-400">
                    {priorityLabels[task.priority]}优先级
                  </span>
                  <span className="text-xs text-content-tertiary">·</span>
                  <span className="text-xs text-content-secondary dark:text-zinc-400">
                    {statusLabels[task.status]}
                  </span>
                </div>
              </div>

              {task.description && (
                <div>
                  <div className="text-xs font-semibold text-content-tertiary dark:text-zinc-400 mb-2">描述</div>
                  <p className="text-sm text-content dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
                    {task.description}
                  </p>
                </div>
              )}

              {(task.dueDate || task.dod) && (
                <div className="space-y-3 p-3.5 bg-page dark:bg-zinc-900/50 rounded-xl border border-line-subtle dark:border-zinc-800">
                  {task.dueDate && (
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-brand" />
                      <div>
                        <div className="text-[11px] font-medium text-content-tertiary dark:text-zinc-400">截止日期</div>
                        <div className="text-xs font-medium text-content dark:text-zinc-200 mt-0.5">
                          {new Date(task.dueDate).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  )}
                  {task.dod && (
                    <div>
                      <div className="text-[11px] font-medium text-content-tertiary dark:text-zinc-400 mb-1">完成标准 (DoD)</div>
                      <p className="text-xs text-content dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
                        {task.dod}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={() => setIsEditing(true)}
                className="w-full px-4 py-2 text-sm font-medium text-brand dark:text-blue-300 bg-brand-light dark:bg-blue-950/40 hover:bg-brand-light/80 rounded-lg transition-colors border border-brand/20"
              >
                编辑任务
              </button>

              <div className="border-t border-line-subtle dark:border-zinc-800 pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare className="w-4 h-4 text-brand" />
                  <div className="text-sm font-medium text-content dark:text-zinc-100">
                    任务讨论 ({comments.length})
                  </div>
                </div>

                <div className="flex gap-2.5 mb-4">
                  <div className="w-7 h-7 rounded-full bg-brand flex items-center justify-center text-white text-xs font-medium flex-shrink-0 shadow-xs">
                    我
                  </div>
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="添加讨论与备注..."
                      className="flex-1 px-3.5 py-1.5 bg-page dark:bg-zinc-800 border border-line dark:border-zinc-700 rounded-lg text-content dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand text-xs transition-all"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                    />
                    <button
                      onClick={handleAddComment}
                      disabled={!commentText.trim()}
                      className="px-3 py-1.5 bg-brand text-white rounded-lg hover:bg-brand-hover disabled:opacity-40 transition-colors shadow-xs"
                      title="发送评论"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-2.5 p-2.5 rounded-lg bg-page/60 dark:bg-zinc-900/40 border border-line-subtle dark:border-zinc-800/60">
                      <div className="w-6 h-6 rounded-full bg-brand-light dark:bg-blue-950/40 text-brand flex items-center justify-center text-xs font-medium flex-shrink-0">
                        {comment.author[0]}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-content dark:text-zinc-100">
                            {comment.author}
                          </span>
                          <span className="text-[10px] text-content-tertiary">
                            {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-content-secondary dark:text-zinc-300 mt-1 leading-relaxed">
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  ))}
                  {comments.length === 0 && (
                    <div className="text-center py-6 text-xs text-content-tertiary dark:text-zinc-500">
                      暂无讨论记录
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
