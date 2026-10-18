'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Users, MoreVertical, Trash2, Settings } from 'lucide-react';
import type { Team } from '@/types/collaboration';
import { useCollaborationStore } from '@/store/collaborationStore';
import { EditTeamModal } from './EditTeamModal';

interface TeamCardProps {
  team: Team;
  currentTeamId: string | null;
}

function TeamCardComponent({ team, currentTeamId }: TeamCardProps) {
  const router = useRouter();
  const fetchProjects = useCollaborationStore((state) => state.fetchProjects);
  const deleteTeam = useCollaborationStore((state) => state.deleteTeam);
  const [showMenu, setShowMenu] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const showMenuRef = useRef(showMenu);
  const isActive = currentTeamId === team.id;

  useEffect(() => {
    showMenuRef.current = showMenu;
  }, [showMenu]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        if (showMenuRef.current) {
          setShowMenu(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleClick = async () => {
    await fetchProjects(team.id);
    router.push(`/teams/${team.id}`);
  };

  const handleDelete = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (confirm('确定要删除这个团队吗？')) {
      setDeleting(true);
      await deleteTeam(team.id);
      setDeleting(false);
    }
  };

  const renderAvatar = () => {
    if (team.avatar && !avatarError) {
      return (
        <img
          src={team.avatar}
          alt={team.name}
          className="w-10 h-10 rounded-lg object-cover"
          onError={() => setAvatarError(true)}
        />
      );
    }
    return team.name.charAt(0).toUpperCase();
  };

  return (
    <div
      onClick={handleClick}
      className={`group relative p-5 rounded-xl border transition-all cursor-pointer ${
        isActive
          ? 'bg-brand-light dark:bg-blue-950/30 border-brand/50 dark:border-blue-800 shadow-xs'
          : 'bg-white dark:bg-[#1a1c20] border-line dark:border-zinc-800 hover:border-brand/40 hover:shadow-card'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3.5">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-base font-semibold shadow-xs ${
            isActive
              ? 'bg-brand text-white'
              : 'bg-[#eff4ff] dark:bg-blue-950/40 text-brand border border-blue-100 dark:border-blue-900/40'
          }`}>
            {renderAvatar()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`text-sm font-semibold truncate ${
              isActive ? 'text-brand dark:text-blue-300' : 'text-content dark:text-zinc-100'
            }`}>
              {team.name}
            </h3>
            {team.description && (
              <p className="mt-1 text-xs text-content-secondary dark:text-zinc-400 line-clamp-2 leading-relaxed">
                {team.description}
              </p>
            )}
          </div>
        </div>
        <div className="relative" ref={menuRef}>
          <button
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            className="p-1.5 hover:bg-surface-hover dark:hover:bg-zinc-800 rounded-lg text-content-tertiary hover:text-content-secondary dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
            title="更多操作"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {showMenu && (
            <div
              className="absolute right-0 top-full mt-1.5 w-36 bg-white dark:bg-zinc-800 border border-line dark:border-zinc-700 rounded-xl shadow-popover z-50 py-1"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={(e) => { e.stopPropagation(); setShowMenu(false); setShowEditModal(true); }}
                className="w-full px-3 py-1.5 text-left text-xs text-content-secondary dark:text-zinc-200 hover:bg-surface-hover dark:hover:bg-zinc-700 flex items-center gap-2 transition-colors"
              >
                <Settings className="w-3.5 h-3.5" />
                设置
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="w-full px-3 py-1.5 text-left text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {deleting ? (
                  <div className="w-3.5 h-3.5 border border-red-500/50 border-t-red-500 rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                删除
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-line-subtle dark:border-zinc-800/60 flex items-center gap-2 text-xs text-content-tertiary dark:text-zinc-400">
        <Users className="w-3.5 h-3.5 text-brand" />
        <span>团队协同成员空间</span>
      </div>
      <EditTeamModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        team={team}
      />
    </div>
  );
}

export const TeamCard = React.memo(TeamCardComponent);
