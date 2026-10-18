'use client';

import ProjectList from '@/components/ProjectList';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { Users } from 'lucide-react';
import { TeamDetailPanel } from '@/components/collaboration/TeamDetailPanel';

export default function TeamDetailPage() {
  const params = useParams();
  const teamId = params.teamId as string;
  const [showDetail, setShowDetail] = useState(false);

  return (
    <div className="min-h-screen bg-page dark:bg-[#141517]">
      <div className="flex items-center justify-between px-6 py-3.5 bg-white dark:bg-[#1a1c20] border-b border-line dark:border-zinc-800">
        <h1 className="text-sm font-semibold text-content dark:text-zinc-100">团队项目空间</h1>
        <button
          onClick={() => setShowDetail(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-800 border border-line dark:border-zinc-700 rounded-lg text-xs font-medium text-content-secondary dark:text-zinc-300 hover:border-brand/40 hover:text-brand transition-colors shadow-xs"
        >
          <Users className="w-3.5 h-3.5 text-brand" />
          团队成员与权限
        </button>
      </div>
      <ProjectList teamId={teamId} />
      {showDetail && (
        <TeamDetailPanel
          teamId={teamId}
          teamName="团队详情"
          onClose={() => setShowDetail(false)}
        />
      )}
    </div>
  );
}