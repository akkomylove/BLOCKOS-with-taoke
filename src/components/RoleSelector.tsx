'use client';

import { useState, useCallback } from 'react';
import { X, GripVertical, Plus, Star } from 'lucide-react';

export interface PresetRole {
  id: string;
  name: string;
  description: string;
}

export const PRESET_ROLES: PresetRole[] = [
  { id: 'pm', name: '产品经理', description: '需求定义、用户调研' },
  { id: 'designer', name: 'UI/UX设计师', description: '界面设计、交互原型' },
  { id: 'frontend', name: '前端开发', description: '页面实现、组件开发' },
  { id: 'backend', name: '后端开发', description: 'API开发、数据库设计' },
  { id: 'qa', name: '测试工程师', description: '测试用例、质量保障' },
  { id: 'devops', name: '运维工程师', description: '部署、监控、CI/CD' },
  { id: 'data', name: '数据分析师', description: '数据分析、报表' },
  { id: 'pmo', name: '项目经理', description: '进度管理、资源协调' },
  { id: 'techlead', name: '技术负责人', description: '架构设计、技术决策' },
  { id: 'security', name: '安全工程师', description: '安全审计、漏洞修复' },
];

interface RoleSelectorProps {
  selectedRoles: string[];
  onChange: (roles: string[]) => void;
}

export default function RoleSelector({ selectedRoles, onChange }: RoleSelectorProps) {
  const [customInput, setCustomInput] = useState('');
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const toggleRole = useCallback((roleName: string) => {
    if (selectedRoles.includes(roleName)) {
      onChange(selectedRoles.filter((r) => r !== roleName));
    } else {
      onChange([...selectedRoles, roleName]);
    }
  }, [selectedRoles, onChange]);

  const addCustomRole = useCallback(() => {
    const name = customInput.trim();
    if (!name || selectedRoles.includes(name)) return;
    onChange([...selectedRoles, name]);
    setCustomInput('');
  }, [customInput, selectedRoles, onChange]);

  const removeRole = useCallback((index: number) => {
    const next = [...selectedRoles];
    next.splice(index, 1);
    onChange(next);
  }, [selectedRoles, onChange]);

  const handleDragStart = useCallback((index: number) => {
    setDragIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    const next = [...selectedRoles];
    const [removed] = next.splice(dragIndex, 1);
    next.splice(index, 0, removed);
    setDragIndex(index);
    onChange(next);
  }, [dragIndex, selectedRoles, onChange]);

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
  }, []);

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300">选择工作流角色</label>

      <div className="flex flex-wrap gap-2">
        {PRESET_ROLES.map((role) => {
          const active = selectedRoles.includes(role.name);
          return (
            <button
              key={role.id}
              onClick={() => toggleRole(role.name)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                active
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-700'
              }`}
              title={role.description}
            >
              {role.name}
            </button>
          );
        })}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomRole(); } }}
          placeholder="自定义角色名称"
          className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-gray-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-blue-500/20"
        />
        <button
          onClick={addCustomRole}
          disabled={!customInput.trim()}
          className="px-3 py-2 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 disabled:opacity-50 rounded-lg text-sm font-medium text-gray-700 dark:text-zinc-300 transition-colors flex items-center gap-1"
        >
          <Plus className="w-4 h-4" /> 添加
        </button>
      </div>

      {selectedRoles.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs text-gray-500 dark:text-zinc-500 flex items-center gap-1">
            <GripVertical className="w-3 h-3" /> 已选角色（可拖拽排序）
          </div>
          <div className="space-y-1">
            {selectedRoles.map((role, index) => (
              <div
                key={`${role}-${index}`}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 rounded-lg cursor-move"
              >
                <GripVertical className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-gray-800 dark:text-zinc-200 flex-1">{role}</span>
                <button
                  onClick={() => removeRole(index)}
                  className="p-0.5 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-blue-500" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
