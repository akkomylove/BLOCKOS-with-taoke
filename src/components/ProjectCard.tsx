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
    <div className="bg-white dark:bg-[#1a1c20] border border-line dark:border-zinc-800 rounded-xl p-5 hover:border-brand/40 hover:shadow-card transition-all cursor-pointer group flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3.5">
            <div className={`w-11 h-11 rounded-xl ${bgColor} flex items-center justify-center text-white text-lg font-semibold shadow-xs`}>
              {project.icon || <Folder className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-content dark:text-zinc-100">{project.name}</h3>
              {project.description && (
                <p className="text-xs text-content-secondary dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                  {project.description}
                </p>
              )}
            </div>
          </div>
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(!menuOpen);
              }}
              className="p-1.5 hover:bg-surface-hover dark:hover:bg-zinc-800 rounded-lg text-content-tertiary hover:text-content-secondary dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 top-full mt-1.5 w-36 bg-white dark:bg-zinc-800 border border-line dark:border-zinc-700 rounded-xl shadow-popover z-50 py-1"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit?.();
                    setMenuOpen(false);
                  }}
                  className="w-full px-3 py-1.5 text-left text-xs text-content-secondary dark:text-zinc-200 hover:bg-surface-hover dark:hover:bg-zinc-700 flex items-center gap-2 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  编辑
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowConfirm(true);
                    setMenuOpen(false);
                  }}
                  className="w-full px-3 py-1.5 text-left text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  删除
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="mt-4 flex items-center gap-4 text-xs text-content-tertiary dark:text-zinc-400">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-content-tertiary" />
            <span>{new Date(project.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-[200]">
          <div className="bg-white dark:bg-[#1a1c20] rounded-2xl p-6 w-84 shadow-modal border border-line dark:border-zinc-800 animate-scale-in">
            <h3 className="text-base font-semibold text-content dark:text-zinc-100 mb-2">确认删除项目</h3>
            <p className="text-xs text-content-secondary dark:text-zinc-400 mb-6 leading-relaxed">
              确定要删除项目「{project.name}」吗？此操作将同步清除看板中的关联任务，无法撤销。
            </p>
            <div className="flex gap-2.5 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-3.5 py-1.5 text-xs text-content-secondary dark:text-zinc-400 hover:bg-surface-hover dark:hover:bg-zinc-800 rounded-lg transition-colors font-medium"
              >
                取消
              </button>
              <button
                onClick={() => {
                  onDelete?.();
                  setShowConfirm(false);
                }}
                className="px-3.5 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium shadow-xs"
              >
                删除项目
              </button>
            </div>
          </div>
        </div>
      )}
      <Link
        href={`/projects/${project.id}`}
        onClick={() => setCurrentProject(project.id)}
        className="mt-4 block w-full text-center py-2 text-xs font-medium text-brand hover:bg-brand-light dark:hover:bg-blue-950/30 rounded-lg transition-colors border border-transparent hover:border-brand/20"
      >
        进入看板与协作 →
      </Link>
    </div>
  );
}
