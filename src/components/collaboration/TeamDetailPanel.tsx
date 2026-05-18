'use client';

import { useState, useEffect } from 'react';
import { X, UserPlus, Trash2, Shield, Crown } from 'lucide-react';

interface MemberWithProfile {
  userId: string;
  userName: string;
  userAvatar?: string;
  role: 'owner' | 'admin' | 'member';
  title?: string;
  functions: string[];
}

interface TeamDetailPanelProps {
  teamId: string;
  teamName: string;
  onClose: () => void;
}

const roleLabels: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  owner: { color: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20', icon: <Crown className="w-3 h-3" />, label: '拥有者' },
  admin: { color: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20', icon: <Shield className="w-3 h-3" />, label: '管理员' },
  member: { color: 'text-gray-600 bg-gray-100 dark:text-zinc-400 dark:bg-zinc-700', icon: null, label: '成员' },
};

export function TeamDetailPanel({ teamId, teamName, onClose }: TeamDetailPanelProps) {
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberId, setNewMemberId] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetch('/api/user/profile')
      .then(r => r.json())
      .then(data => {
        setIsAdmin(data.userId === 'demo-admin-001');
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`/api/teams/${teamId}`)
      .then(r => r.json())
      .then(data => {
        const mapped = (data.members || []).map((m: Record<string, unknown>) => ({
          userId: m.userId || m.user_id,
          userName: (m as Record<string, string>).name || 'Unknown',
          userAvatar: (m as Record<string, string>).avatar,
          role: (m.role || 'member') as 'owner' | 'admin' | 'member',
          title: typeof (m as Record<string, unknown>).title === 'string' ? (m as Record<string, string>).title : '',
          functions: Array.isArray((m as Record<string, unknown>).functions)
            ? (m as Record<string, string[]>).functions
            : [],
        }));
        setMembers(mapped);
      })
      .finally(() => setLoading(false));
  }, [teamId]);

  const handleAddMember = async () => {
    if (!newMemberId.trim()) return;
    setAddingMember(true);
    setError('');
    try {
      const res = await fetch(`/api/teams/${teamId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: newMemberId.trim() }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || '添加失败');
      }
      setNewMemberId('');
      setShowAddMember(false);
      const refresh = await fetch(`/api/teams/${teamId}`);
      const data = await refresh.json();
      const mapped = (data.members || []).map((m: Record<string, unknown>) => ({
        userId: m.userId || m.user_id,
        userName: (m as Record<string, string>).name || 'Unknown',
        userAvatar: (m as Record<string, string>).avatar,
        role: (m.role || 'member') as 'owner' | 'admin' | 'member',
        title: typeof (m as Record<string, unknown>).title === 'string' ? (m as Record<string, string>).title : '',
        functions: Array.isArray((m as Record<string, unknown>).functions) ? (m as Record<string, string[]>).functions : [],
      }));
      setMembers(mapped);
    } catch (err) {
      setError(err instanceof Error ? err.message : '添加失败');
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('确定要移除该成员吗？')) return;
    try {
      await fetch(`/api/teams/${teamId}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      setMembers(prev => prev.filter(m => m.userId !== userId));
    } catch {
      setError('移除失败');
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white dark:bg-zinc-900 border-l border-gray-200 dark:border-zinc-800 shadow-2xl z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-zinc-800">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-zinc-100">{teamName}</h2>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">团队详情</p>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 border-b border-gray-200 dark:border-zinc-800">
        <h3 className="text-sm font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-3">
          团队成员 ({members.length})
        </h3>
        {isAdmin && (
          <button
            onClick={() => setShowAddMember(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            添加成员
          </button>
        )}
        {showAddMember && (
          <div className="mt-2 p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg space-y-2">
            <input
              type="text"
              value={newMemberId}
              onChange={e => setNewMemberId(e.target.value)}
              placeholder="输入用户的 User ID"
              className="w-full px-3 py-1.5 bg-white dark:bg-zinc-700 border border-gray-200 dark:border-zinc-600 rounded text-sm text-gray-900 dark:text-zinc-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddMember}
                disabled={addingMember || !newMemberId.trim()}
                className="flex-1 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded text-xs font-medium transition-colors"
              >
                {addingMember ? '添加中...' : '确认添加'}
              </button>
              <button
                onClick={() => { setShowAddMember(false); setNewMemberId(''); setError(''); }}
                className="px-3 py-1.5 bg-gray-200 dark:bg-zinc-600 hover:bg-gray-300 dark:hover:bg-zinc-500 text-gray-700 dark:text-zinc-300 rounded text-xs font-medium transition-colors"
              >
                取消
              </button>
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse flex items-center gap-3 p-3">
                <div className="w-10 h-10 bg-gray-200 dark:bg-zinc-700 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-200 dark:bg-zinc-700 rounded w-20" />
                  <div className="h-2 bg-gray-100 dark:bg-zinc-600 rounded w-32" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {members.map(member => (
              <div key={member.userId} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 group">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 overflow-hidden">
                  {member.userAvatar ? (
                    <img src={member.userAvatar} alt="" className="w-10 h-10 object-cover" />
                  ) : (
                    member.userName.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-zinc-100">{member.userName}</span>
                    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium ${roleLabels[member.role].color}`}>
                      {roleLabels[member.role].icon}
                      {roleLabels[member.role].label}
                    </span>
                  </div>
                  {member.title && (
                    <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">{member.title}</p>
                  )}
                  {member.functions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {member.functions.map(fn => (
                        <span key={fn} className="px-1.5 py-0.5 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded text-xs">
                          {fn}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {isAdmin && member.role !== 'owner' && (
                  <button
                    onClick={() => handleRemoveMember(member.userId)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-red-400 hover:text-red-600 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}