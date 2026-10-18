'use client';

import { useState } from 'react';
import { X, Users, AlertCircle } from 'lucide-react';
import { useCollaborationStore } from '@/store/collaborationStore';

interface CreateTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateTeamModal({ isOpen, onClose }: CreateTeamModalProps) {
  const createTeam = useCollaborationStore((state) => state.createTeam);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [avatar, setAvatar] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setLoading(true);
    setError(null);
    try {
      await createTeam(name.trim(), description.trim() || undefined, avatar || undefined);
      onClose();
      setName('');
      setDescription('');
      setAvatar('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建团队失败');
    } finally {
      setLoading(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleOverlayClick}
    >
      <div className="bg-white dark:bg-[#1a1c20] rounded-2xl shadow-modal w-full max-w-md mx-4 border border-line dark:border-zinc-800 animate-scale-in overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-line-subtle dark:border-zinc-800 bg-[#f7f8fa]/60 dark:bg-zinc-900/40">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-brand-light dark:bg-blue-950/40 text-brand flex items-center justify-center shadow-xs">
              <Users className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-content dark:text-zinc-100">创建新团队</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-surface-hover dark:hover:bg-zinc-800 rounded-lg text-content-tertiary hover:text-content-secondary dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <form role="form" onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-content-secondary dark:text-zinc-300 mb-1.5">
              团队名称
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入团队名称"
              className="w-full px-3 py-2 bg-page dark:bg-zinc-800 border border-line dark:border-zinc-700 rounded-lg text-content dark:text-zinc-100 placeholder-content-tertiary dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all text-sm"
              autoFocus
              required
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-content-secondary dark:text-zinc-300 mb-1.5">
              团队描述（可选）
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="描述一下这个团队"
              rows={3}
              className="w-full px-3 py-2 bg-page dark:bg-zinc-800 border border-line dark:border-zinc-700 rounded-lg text-content dark:text-zinc-100 placeholder-content-tertiary dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all text-sm resize-none"
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-content-secondary dark:text-zinc-300 mb-1.5">
              团队头像（可选）
            </label>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-brand-light dark:bg-blue-950/40 text-brand border border-line dark:border-zinc-700 rounded-xl flex items-center justify-center text-lg font-semibold shadow-xs">
                {avatar ? (
                  <img src={avatar} alt="预览" className="w-11 h-11 rounded-xl object-cover" />
                ) : (
                  name.charAt(0)?.toUpperCase() || '?'
                )}
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  value={avatar}
                  onChange={(e) => setAvatar(e.target.value)}
                  placeholder="输入图片URL"
                  className="w-full px-3 py-2 bg-page dark:bg-zinc-800 border border-line dark:border-zinc-700 rounded-lg text-content dark:text-zinc-100 placeholder-content-tertiary dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all text-sm"
                />
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-line-subtle dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-content-secondary dark:text-zinc-300 hover:bg-surface-hover dark:hover:bg-zinc-800 rounded-lg text-sm font-medium transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-4 py-2 bg-brand hover:bg-brand-hover active:bg-brand-active disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors shadow-xs flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  创建中...
                </>
              ) : (
                '创建团队'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
