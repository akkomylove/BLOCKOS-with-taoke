'use client';

import { useEffect, useState } from 'react';
import { Plus, Users, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCollaborationStore } from '@/store/collaborationStore';
import { TeamCard } from './TeamCard';
import { CreateTeamModal } from './CreateTeamModal';

export function TeamList() {
  const router = useRouter();
  const teams = useCollaborationStore((state) => state.teams);
  const currentTeamId = useCollaborationStore((state) => state.currentTeamId);
  const loading = useCollaborationStore((state) => state.loading);
  const fetchTeams = useCollaborationStore((state) => state.fetchTeams);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  return (
    <div className="h-full flex flex-col bg-page dark:bg-[#141517]">
      <div className="px-6 py-4 border-b border-line dark:border-zinc-800 bg-white dark:bg-[#1a1c20]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="p-1.5 hover:bg-surface-hover dark:hover:bg-zinc-800 rounded-lg text-content-secondary dark:text-zinc-400 transition-colors"
              title="返回首页"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-brand-light dark:bg-blue-950/40 text-brand flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <h2 className="text-base font-semibold text-content dark:text-zinc-100">团队</h2>
            </div>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-brand hover:bg-brand-hover active:bg-brand-active text-white rounded-lg text-sm font-medium transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            新建团队
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 bg-white dark:bg-zinc-800 border border-line dark:border-zinc-700/80 rounded-xl animate-pulse">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-page dark:bg-zinc-700 rounded-xl" />
                  <div className="flex-1">
                    <div className="h-4 bg-page dark:bg-zinc-700 rounded w-24 mb-2" />
                    <div className="h-3 bg-page dark:bg-zinc-600 rounded w-32" />
                  </div>
                </div>
                <div className="mt-3 h-3 bg-page dark:bg-zinc-600 rounded w-16" />
              </div>
            ))}
          </div>
        ) : teams.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-16">
            <div className="w-14 h-14 bg-brand-light dark:bg-blue-950/40 rounded-2xl flex items-center justify-center mb-4 text-brand shadow-xs">
              <Users className="w-7 h-7" />
            </div>
            <h3 className="text-base font-semibold text-content dark:text-zinc-200 mb-1">还没有团队</h3>
            <p className="text-sm text-content-tertiary dark:text-zinc-400 mb-5">创建一个团队开始协作吧</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-brand hover:bg-brand-hover active:bg-brand-active text-white rounded-lg text-sm font-medium transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              创建团队
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {teams.map((team) => (
              <TeamCard key={team.id} team={team} currentTeamId={currentTeamId} />
            ))}
          </div>
        )}
      </div>

      <CreateTeamModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
