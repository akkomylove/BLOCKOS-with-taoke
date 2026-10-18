'use client';
import { useEffect } from 'react';
import { useCollaborationStore } from '@/store/collaborationStore';
import { UserTaskOverview } from './UserTaskOverview';
export default function EnterpriseAccountTasks() {
  const tasks = useCollaborationStore(state => state.userTasks);
  const fetchTasks = useCollaborationStore(state => state.fetchUserTasks);
  useEffect(() => { void fetchTasks(); }, [fetchTasks]);
  return <section><h3 className="mb-3 font-medium">我的协作任务</h3><UserTaskOverview summaries={tasks} /></section>;
}
