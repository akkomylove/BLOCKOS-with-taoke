'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCollaborationStore } from '@/store/collaborationStore';
import { Milestone } from '@/types/collaboration';
import { CheckCircle2, Circle, Clock, Flag, ArrowLeft, Plus, X, Calendar } from 'lucide-react';

interface MilestoneTimelineProps {
  projectId: string;
}

function StatusIcon({ status }: { status: Milestone['status'] }) {
  if (status === 'completed') return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
  if (status === 'in_progress') return <Clock className="w-5 h-5 text-brand" />;
  return <Circle className="w-5 h-5 text-content-tertiary" />;
}

function StatusLabel({ status }: { status: Milestone['status'] }) {
  const map = {
    pending: '待开始',
    in_progress: '进行中',
    completed: '已完成',
  };
  const color = {
    pending: 'text-content-secondary bg-[#f2f3f5] dark:bg-zinc-800',
    in_progress: 'text-brand bg-brand-light dark:bg-blue-950/40',
    completed: 'text-emerald-600 bg-[#e8f8f0] dark:bg-emerald-950/30 dark:text-emerald-400',
  };
  return (
    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${color[status]}`}>
      {map[status]}
    </span>
  );
}

export default function MilestoneTimeline({ projectId }: MilestoneTimelineProps) {
  const router = useRouter();
  const milestones = useCollaborationStore((state) => state.milestones);
  const fetchMilestones = useCollaborationStore((state) => state.fetchMilestones);
  const createMilestone = useCollaborationStore((state) => state.createMilestone);
  const updateMilestone = useCollaborationStore((state) => state.updateMilestone);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [dueDateStr, setDueDateStr] = useState('');
  const [status, setStatus] = useState<'pending' | 'in_progress' | 'completed'>('pending');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (projectId) {
      fetchMilestones(projectId).catch(() => {});
    }
  }, [projectId, fetchMilestones]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('请输入里程碑名称');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const dueTimestamp = dueDateStr ? new Date(dueDateStr).getTime() : undefined;
      await createMilestone(projectId, name.trim(), description.trim() || undefined, dueTimestamp, status);
      setName('');
      setDescription('');
      setDueDateStr('');
      setStatus('pending');
      setShowCreateModal(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '创建里程碑失败');
    } finally {
      setSubmitting(false);
    }
  };

  const projectMilestones = milestones
    .filter((m) => m.projectId === projectId)
    .sort((a, b) => (a.dueDate ?? 0) - (b.dueDate ?? 0));

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* 顶部导航与操作栏 */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-line dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/teams')}
            className="flex items-center gap-1.5 text-xs text-content-secondary dark:text-zinc-400 hover:text-content dark:hover:text-zinc-100 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-surface-hover dark:hover:bg-zinc-800"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            返回团队
          </button>
          <div className="h-4 w-px bg-line dark:bg-zinc-700" />
          <h2 className="text-base font-semibold text-content dark:text-zinc-100 flex items-center gap-2">
            <Flag className="w-4 h-4 text-brand" />
            项目里程碑
          </h2>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-brand hover:bg-brand-hover active:bg-brand-active text-white rounded-lg text-xs font-medium transition-colors shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          新建里程碑
        </button>
      </div>

      {/* 创建里程碑弹窗 */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => !submitting && setShowCreateModal(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 border border-line dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between px-5 py-4 border-b border-line dark:border-zinc-800 bg-[#f7f8fa]/60 dark:bg-zinc-900/40">
              <h3 className="text-sm font-semibold text-content dark:text-zinc-100 flex items-center gap-2">
                <Flag className="w-4 h-4 text-brand" />
                新建项目里程碑
              </h3>
              <button
                disabled={submitting}
                onClick={() => setShowCreateModal(false)}
                className="p-1 hover:bg-surface-hover dark:hover:bg-zinc-800 rounded-lg text-content-tertiary hover:text-content-secondary dark:hover:text-zinc-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-content-secondary dark:text-zinc-300 mb-1">
                  里程碑名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例如：V1.0 核心能力闭环"
                  className="w-full px-3 py-2 bg-page dark:bg-zinc-800 border border-line dark:border-zinc-700 rounded-lg text-xs text-content dark:text-zinc-100 placeholder-content-tertiary focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-content-secondary dark:text-zinc-300 mb-1">
                  详细说明
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="输入此里程碑的核心交付标准与验收要求..."
                  className="w-full px-3 py-2 bg-page dark:bg-zinc-800 border border-line dark:border-zinc-700 rounded-lg text-xs text-content dark:text-zinc-100 placeholder-content-tertiary focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-content-secondary dark:text-zinc-300 mb-1">
                    目标截止日期
                  </label>
                  <input
                    type="date"
                    value={dueDateStr}
                    onChange={(e) => setDueDateStr(e.target.value)}
                    className="w-full px-3 py-1.5 bg-page dark:bg-zinc-800 border border-line dark:border-zinc-700 rounded-lg text-xs text-content dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-content-secondary dark:text-zinc-300 mb-1">
                    当前状态
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'pending' | 'in_progress' | 'completed')}
                    className="w-full px-3 py-1.5 bg-page dark:bg-zinc-800 border border-line dark:border-zinc-700 rounded-lg text-xs text-content dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                  >
                    <option value="pending">待开始</option>
                    <option value="in_progress">进行中</option>
                    <option value="completed">已完成</option>
                  </select>
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-500 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 p-2 rounded-lg">
                  {error}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-line dark:border-zinc-800">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-line dark:border-zinc-700 text-xs text-content-secondary dark:text-zinc-300 hover:bg-surface-hover dark:hover:bg-zinc-800 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={submitting || !name.trim()}
                  className="px-4 py-1.5 bg-brand hover:bg-brand-hover text-white rounded-lg text-xs font-medium disabled:opacity-50 transition-colors shadow-xs"
                >
                  {submitting ? '创建中...' : '确认创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 里程碑列表与时间轴 */}
      {projectMilestones.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#1a1c20] rounded-2xl border border-line dark:border-zinc-800 text-content-tertiary">
          <div className="w-12 h-12 rounded-2xl bg-brand-light dark:bg-blue-950/40 flex items-center justify-center mb-3">
            <Flag className="w-6 h-6 text-brand" />
          </div>
          <h3 className="text-sm font-medium text-content dark:text-zinc-200 mb-1">暂无项目里程碑</h3>
          <p className="text-xs text-content-tertiary mb-4">通过里程碑规划项目的关键交付节点与阶段目标</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-brand hover:bg-brand-hover text-white rounded-lg text-xs font-medium transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            新建第一个里程碑
          </button>
        </div>
      ) : (
        <div className="relative pl-6">
          <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-line dark:bg-zinc-800" />
          <div className="space-y-6">
            {projectMilestones.map((m) => (
              <div key={m.id} className="relative flex items-start gap-4">
                <div className="relative z-10 flex-shrink-0 w-12 h-12 rounded-xl bg-white dark:bg-[#1a1c20] border border-line dark:border-zinc-800 shadow-xs flex items-center justify-center">
                  <StatusIcon status={m.status} />
                </div>
                <div className="flex-1 bg-white dark:bg-[#1a1c20] rounded-xl border border-line dark:border-zinc-800 p-4 shadow-card hover:border-brand/40 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-content dark:text-zinc-100">{m.name}</h3>
                    <div className="flex items-center gap-2">
                      <select
                        value={m.status}
                        onChange={(e) => updateMilestone(m.id, { status: e.target.value as Milestone['status'] })}
                        className="text-xs border border-line dark:border-zinc-700 bg-page dark:bg-zinc-800 rounded-md px-2 py-0.5 text-content dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-brand"
                      >
                        <option value="pending">待开始</option>
                        <option value="in_progress">进行中</option>
                        <option value="completed">已完成</option>
                      </select>
                      <StatusLabel status={m.status} />
                    </div>
                  </div>
                  {m.description && (
                    <p className="text-xs text-content-secondary dark:text-zinc-400 mb-3 leading-relaxed">
                      {m.description}
                    </p>
                  )}
                  {m.dueDate && (
                    <div className="flex items-center gap-1.5 text-[11px] text-content-tertiary">
                      <Calendar className="w-3 h-3" />
                      <span>截止日期：{new Date(m.dueDate).toLocaleDateString('zh-CN')}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
