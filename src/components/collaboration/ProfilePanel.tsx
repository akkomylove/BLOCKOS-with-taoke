'use client';

import { useEffect, useState } from 'react';
import { X, User, Briefcase, Tag, Plus, Check } from 'lucide-react';
import { useCollaborationStore } from '@/store/collaborationStore';
import { UserTaskOverview } from './UserTaskOverview';

interface ProfilePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const FUNCTION_OPTIONS = [
  '前端开发', '后端开发', '全栈开发', 'UI/UX设计', '产品经理',
  '项目经理', '测试工程师', 'DevOps', '数据分析', '架构师',
];

export function ProfilePanel({ isOpen, onClose }: ProfilePanelProps) {
  const profile = useCollaborationStore((state) => state.userProfile);
  const tasks = useCollaborationStore((state) => state.userTasks);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(profile?.title || '');
  const [showAddFunction, setShowAddFunction] = useState(false);
  const [userName, setUserName] = useState<string>('用户');
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;
    useCollaborationStore.getState().fetchUserProfile();
    useCollaborationStore.getState().fetchUserTasks();

    fetch('/api/auth/user')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          setUserName(data.name || '用户');
          setUserEmail(data.email || '');
        }
      })
      .catch(() => {});
  }, [isOpen]);

  useEffect(() => {
    if (!editingTitle) {
      setTitleValue(profile?.title || '');
    }
  }, [profile?.title, editingTitle]);

  const handleSaveTitle = async () => {
    await useCollaborationStore.getState().updateUserProfile({ title: titleValue });
    setEditingTitle(false);
  };

  const handleAddFunction = async (fn: string) => {
    const current = profile?.functions || [];
    if (current.includes(fn)) return;
    const newFunctions = [...current, fn];
    await useCollaborationStore.getState().updateUserProfile({ functions: newFunctions });
    setShowAddFunction(false);
  };

  const handleRemoveFunction = async (fn: string) => {
    const newFunctions = (profile?.functions || []).filter(f => f !== fn);
    await useCollaborationStore.getState().updateUserProfile({ functions: newFunctions });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[85vh] bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-zinc-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/15 to-purple-500/15 border border-blue-500/20 flex items-center justify-center">
              <User className="w-4 h-4 text-blue-500 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">个人中心</h2>
              <p className="text-[11px] text-gray-500 dark:text-zinc-500">管理个人信息与任务</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors text-gray-500 dark:text-zinc-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-zinc-800 rounded-xl">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-lg font-semibold flex-shrink-0">
              <User className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-zinc-100">{userName}</p>
              <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">{userEmail || 'user@blockos.dev'}</p>
            </div>
          </div>

          <div>
            <h3 className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
              <Briefcase className="w-3.5 h-3.5" />
              职务
            </h3>
            {editingTitle ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={titleValue}
                  onChange={e => setTitleValue(e.target.value)}
                  placeholder="输入职务名称"
                  className="flex-1 px-3 py-1.5 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm text-gray-900 dark:text-zinc-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  autoFocus
                />
                <button onClick={handleSaveTitle} className="p-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors">
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setTitleValue(profile?.title || ''); setEditingTitle(true); }}
                className="w-full text-left px-3 py-2 bg-gray-50 dark:bg-zinc-800 rounded-lg text-sm text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-750 transition-colors"
              >
                {profile?.title || '点击设置职务...'}
              </button>
            )}
          </div>

          <div>
            <h3 className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
              <Tag className="w-3.5 h-3.5" />
              职能标签
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {(profile?.functions || []).map(fn => (
                <span
                  key={fn}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg text-xs font-medium group"
                >
                  {fn}
                  <button
                    onClick={() => handleRemoveFunction(fn)}
                    className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <button
                onClick={() => setShowAddFunction(!showAddFunction)}
                className="inline-flex items-center gap-1 px-2 py-1 border border-dashed border-gray-300 dark:border-zinc-600 rounded-lg text-xs text-gray-400 hover:text-blue-500 hover:border-blue-400 transition-colors"
              >
                <Plus className="w-3 h-3" />
                添加
              </button>
            </div>
            {showAddFunction && (
              <div className="mt-2 flex flex-wrap gap-1">
                {FUNCTION_OPTIONS.filter(f => !(profile?.functions || []).includes(f)).map(fn => (
                  <button
                    key={fn}
                    onClick={() => handleAddFunction(fn)}
                    className="px-2 py-0.5 bg-gray-100 dark:bg-zinc-700 hover:bg-purple-50 dark:hover:bg-purple-900/20 text-xs text-gray-600 dark:text-zinc-400 hover:text-purple-600 dark:hover:text-purple-400 rounded transition-colors"
                  >
                    {fn}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
              我的任务
            </h3>
            <UserTaskOverview summaries={tasks} />
          </div>
        </div>
      </div>
    </div>
  );
}
