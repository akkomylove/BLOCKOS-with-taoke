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
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-900">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/teams')}
              className="p-2 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-lg text-gray-500 dark:text-zinc-400 transition-colors"
              title="返回团队"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-zinc-100">项目</h1>
              <p className="text-gray-500 dark:text-zinc-400 mt-1">管理和查看你的所有项目</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            新建项目
          </button>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索项目..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>
          <div className="flex items-center gap-1 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'grid'
                  ? 'bg-gray-100 dark:bg-zinc-700 text-gray-900 dark:text-zinc-100'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-zinc-400'
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-gray-100 dark:bg-zinc-700 text-gray-900 dark:text-zinc-100'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-zinc-400'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {filteredProjects.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto bg-gray-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
              <Search className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-zinc-100 mb-1">
              {searchQuery ? '未找到匹配的项目' : '暂无项目'}
            </h3>
            <p className="text-gray-500 dark:text-zinc-400 mb-4">
              {searchQuery ? '尝试使用不同的搜索词' : '创建你的第一个项目开始使用'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
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
