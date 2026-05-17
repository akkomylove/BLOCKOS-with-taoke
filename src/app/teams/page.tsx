'use client';

import { TeamList } from '@/components/collaboration';

export default function TeamsPage() {
  return (
    <div className="h-screen bg-gray-50 dark:bg-zinc-900">
      <TeamList />
    </div>
  );
}
