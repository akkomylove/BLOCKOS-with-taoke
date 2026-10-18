'use client';

import { useEffect } from 'react';
import { useCollaborationStore } from '@/store/collaborationStore';
import ProjectCard from './ProjectCard';
import { Plus, Search, Grid, List, ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import CreateProjectModal from './CreateProjectModal';
import { EditProjectModal } from './collaboration/EditProjectModal';
import type { Project } from '@/types/collaboration';

interface ProjectListProps {
  teamId?: string;
}

export default function ProjectList({ teamId }: ProjectListProps) {
  const router = useRouter();
  const projects = useCollaborationStore((state) => state.projects);
  const fetchProjects = useCollaborationStore((state) => state.fetchProjects);
  const deleteProject = useCollaborationStore((state) => state.deleteProject);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  useEffect(() => {
    if (teamId) {
      fetchProjects(teamId);
    }
  }, [teamId, fetchProjects]);

  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-page dark:bg-[#141517]">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/teams')}
              className="p-2 hover:bg-surface-hover dark:hover:bg-zinc-800 rounded-lg text-content-secondary dark:text-zinc-400 transition-colors"
              title="返回团队"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-content dark:text-zinc-100">项目协同看板</h1>
              <p className="text-xs text-content-tertiary dark:text-zinc-400 mt-1">管理和查看团队下的所有研发协作项目</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand hover:bg-brand-hover active:bg-brand-active text-white rounded-lg text-sm font-medium transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            新建项目
          </button>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-tertiary" />
            <input
              type="text"
              placeholder="搜索项目名称或描述..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-zinc-800 border border-line dark:border-zinc-700 rounded-lg text-sm text-content dark:text-zinc-100 placeholder-content-tertiary focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
            />
          </div>
          <div className="flex items-center gap-1 bg-white dark:bg-zinc-800 border border-line dark:border-zinc-700 rounded-lg p-0.5 shadow-xs">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'grid'
                  ? 'bg-brand-light dark:bg-blue-950/40 text-brand dark:text-blue-300 font-medium'
                  : 'text-content-tertiary hover:text-content-secondary dark:hover:text-zinc-300'
              }`}
              title="网格视图"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-brand-light dark:bg-blue-950/40 text-brand dark:text-blue-300 font-medium'
                  : 'text-content-tertiary hover:text-content-secondary dark:hover:text-zinc-300'
              }`}
              title="列表视图"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {filteredProjects.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 mx-auto bg-brand-light dark:bg-blue-950/40 rounded-2xl flex items-center justify-center mb-4 text-brand shadow-xs">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-content dark:text-zinc-100 mb-1">
              {searchQuery ? '未找到匹配的项目' : '暂无协作项目'}
            </h3>
            <p className="text-xs text-content-tertiary dark:text-zinc-400 mb-5">
              {searchQuery ? '尝试使用不同的关键词搜索' : '创建你的第一个项目开始使用看板和甘特图'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-brand hover:bg-brand-hover active:bg-brand-active text-white rounded-lg text-sm font-medium transition-colors shadow-xs"
              >
                新建项目
              </button>
            )}
          </div>
        ) : (
          <div className={`grid gap-4 ${
            viewMode === 'grid'
              ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
              : 'grid-cols-1'
          }`}>
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onEdit={() => setEditingProject(project)}
                onDelete={() => deleteProject(project.id)}
              />
            ))}
          </div>
        )}
      </div>

      <CreateProjectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        teamId={teamId}
      />
      <EditProjectModal
        isOpen={!!editingProject}
        onClose={() => setEditingProject(null)}
        project={editingProject}
      />
    </div>
  );
}
