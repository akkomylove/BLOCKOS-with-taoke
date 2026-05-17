'use client';

import ProjectBoard from '@/components/ProjectBoard';
import { useParams } from 'next/navigation';
import { useEffect } from 'react';
import { useCollaborationStore } from '@/store/collaborationStore';

export default function ProjectBoardPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const setCurrentProject = useCollaborationStore((state) => state.setCurrentProject);

  useEffect(() => {
    setCurrentProject(projectId);
    return () => setCurrentProject(null);
  }, [projectId, setCurrentProject]);

  return <ProjectBoard projectId={projectId} />;
}
