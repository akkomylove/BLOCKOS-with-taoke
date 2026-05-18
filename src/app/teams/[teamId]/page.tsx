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
    <div>
      <div className="flex items-center gap-3 px-6 pt-4">
        <h1 className="text-xl font-bold text-gray-900 dark:text-zinc-100">项目列表</h1>
        <button
          onClick={() => setShowDetail(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm text-gray-600 dark:text-zinc-400 hover:border-blue-300 dark:hover:border-blue-600 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          <Users className="w-4 h-4" />
          查看成员
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