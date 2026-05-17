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
      className={`group relative p-4 rounded-lg border transition-all cursor-pointer ${
        isActive
          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
          : 'bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg font-semibold ${
            isActive ? 'bg-blue-500' : 'bg-gradient-to-br from-blue-500 to-purple-500'
          }`}>
            {renderAvatar()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`font-semibold truncate ${
              isActive ? 'text-blue-900 dark:text-blue-100' : 'text-gray-900 dark:text-zinc-100'
            }`}>
              {team.name}
            </h3>
            {team.description && (
              <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400 line-clamp-2">
                {team.description}
              </p>
            )}
          </div>
        </div>
        <div className="relative" ref={menuRef}>
          <button
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-md text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 transition-opacity"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {showMenu && (
            <div
              className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-zinc-700 border border-gray-200 dark:border-zinc-600 rounded-md shadow-lg z-50 py-1"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={(e) => { e.stopPropagation(); setShowMenu(false); setShowEditModal(true); }}
                className="w-full px-3 py-1.5 text-left text-xs text-gray-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-600 flex items-center gap-2"
              >
                <Settings className="w-3.5 h-3.5" />
                设置
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="w-full px-3 py-1.5 text-left text-xs text-red-500 hover:bg-gray-100 dark:hover:bg-zinc-600 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? (
                  <div className="w-3.5 h-3.5 border border-red-400/50 border-t-red-400 rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                删除
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-gray-500 dark:text-zinc-400">
        <Users className="w-3.5 h-3.5" />
        <span>团队成员</span>
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
