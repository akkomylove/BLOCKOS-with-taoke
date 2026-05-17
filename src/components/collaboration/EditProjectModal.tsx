'use client';

import { useState, useEffect } from 'react';
import { X, Folder, Check, Palette } from 'lucide-react';
import { useCollaborationStore } from '@/store/collaborationStore';
import type { Project } from '@/types/collaboration';

interface EditProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
}

const colors = [
  { name: 'blue', value: 'bg-blue-500' },
  { name: 'purple', value: 'bg-purple-500' },
  { name: 'green', value: 'bg-green-500' },
  { name: 'orange', value: 'bg-orange-500' },
  { name: 'red', value: 'bg-red-500' },
  { name: 'pink', value: 'bg-pink-500' },
  { name: 'yellow', value: 'bg-yellow-500' },
  { name: 'teal', value: 'bg-teal-500' },
];

const icons = ['📁', '📋', '🚀', '💼', '📊', '🎨', '📝', '🛠️', '📦', '⚡', '🎯', '🔧'];

export function EditProjectModal({ isOpen, onClose, project }: EditProjectModalProps) {
  const updateProject = useCollaborationStore((state) => state.updateProject);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState('blue');
  const [selectedIcon, setSelectedIcon] = useState('📁');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description || '');
      setSelectedColor(project.color || 'blue');
      setSelectedIcon(project.icon || '📁');
    }
  }, [project]);

  if (!isOpen || !project) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      await updateProject(project.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        icon: selectedIcon,
        color: selectedColor,
      });
      onClose();
    } catch (error) {
      console.error('Failed to update project:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-zinc-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-zinc-100">编辑项目</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className={`w-16 h-16 rounded-xl ${colors.find(c => c.name === selectedColor)?.value} flex items-center justify-center text-3xl`}>
                {selectedIcon}
              </div>
            </div>
            <div className="flex-1">
              <div className="mb-2 text-xs font-medium text-gray-500 dark:text-zinc-400">图标</div>
              <div className="flex gap-2 flex-wrap">
                {icons.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setSelectedIcon(icon)}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all ${
                      selectedIcon === icon
                        ? 'bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-500'
                        : 'bg-gray-100 dark:bg-zinc-700 hover:bg-gray-200 dark:hover:bg-zinc-600'
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs font-medium text-gray-500 dark:text-zinc-400 flex items-center gap-2">
              <Palette className="w-3.5 h-3.5" />
              颜色
            </div>
            <div className="flex gap-2">
              {colors.map((color) => (
                <button
                  key={color.name}
                  type="button"
                  onClick={() => setSelectedColor(color.name)}
                  className={`w-8 h-8 rounded-full ${color.value} flex items-center justify-center transition-all ${
                    selectedColor === color.name ? 'ring-2 ring-offset-2 ring-gray-900 dark:ring-white scale-110' : ''
                  }`}
                >
                  {selectedColor === color.name && <Check className="w-4 h-4 text-white" />}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1.5">
              项目名称
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入项目名称..."
              className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-700 border border-gray-200 dark:border-zinc-600 rounded-lg text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1.5">
              项目描述
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="输入项目描述..."
              rows={3}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-700 border border-gray-200 dark:border-zinc-600 rounded-lg text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-zinc-300 bg-gray-100 dark:bg-zinc-700 hover:bg-gray-200 dark:hover:bg-zinc-600 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Folder className="w-4 h-4" />
              )}
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
