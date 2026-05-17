'use client';

import ProjectList from '@/components/ProjectList';
import { useParams } from 'next/navigation';

export default function TeamDetailPage() {
  const params = useParams();
  const teamId = params.teamId as string;

  return <ProjectList teamId={teamId} />;
}
