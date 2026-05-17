'use client';

import { Project } from '@/types/collaboration';
import { useCollaborationStore } from '@/store/collaborationStore';
import { Folder, MoreHorizontal, Trash2, Edit2, Calendar } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';

interface ProjectCardProps {
  project: Project;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function ProjectCard({ project, onEdit, onDelete }: ProjectCardProps) {
  const setCurrentProject = useCollaborationStore((state) => state.setCurrentProject);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    green: 'bg-green-500',
    orange: 'bg-orange-500',
    red: 'bg-red-500',
    pink: 'bg-pink-500',
    yellow: 'bg-yellow-500',
  };

  const bgColor = project.color ? colorMap[project.color] || 'bg-zinc-500' : 'bg-zinc-500';

  return (
    <div className="bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl p-4 hover:shadow-lg transition-all cursor-pointer group">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${bgColor} flex items-center justify-center text-white text-xl`}>
            {project.icon || <Folder className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-zinc-100">{project.name}</h3>
            {project.description && (
              <p className="text-sm text-gray-500 dark:text-zinc-400 mt-0.5">{project.description}</p>
            )}
          </div>
        </div>
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-lg text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 transition-colors"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-zinc-700 border border-gray-200 dark:border-zinc-600 rounded-md shadow-lg z-50 py-1"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.();
                  setMenuOpen(false);
                }}
                className="w-full px-3 py-1.5 text-left text-xs text-gray-800 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-600 flex items-center gap-2"
              >
                <Edit2 className="w-3 h-3" />
                编辑
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowConfirm(true);
                  setMenuOpen(false);
                }}
                className="w-full px-3 py-1.5 text-left text-xs text-red-500 hover:bg-gray-100 dark:hover:bg-zinc-600 flex items-center gap-2"
              >
                <Trash2 className="w-3 h-3" />
                删除
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="mt-4 flex items-center gap-4 text-xs text-gray-500 dark:text-zinc-400">
        <div className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          <span>{new Date(project.createdAt).toLocaleDateString()}</span>
        </div>
      </div>
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200]">
          <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 w-80 shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-zinc-100 mb-2">确认删除</h3>
            <p className="text-sm text-gray-500 dark:text-zinc-400 mb-6">
              确定要删除项目「{project.name}」吗？此操作无法撤销。
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => {
                  onDelete?.();
                  setShowConfirm(false);
                }}
                className="px-4 py-2 text-sm bg-red-500 text-white hover:bg-red-600 rounded-lg transition-colors"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
      <Link
        href={`/projects/${project.id}`}
        onClick={() => setCurrentProject(project.id)}
        className="mt-4 block w-full text-center py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
      >
        查看项目
      </Link>
    </div>
  );
}
