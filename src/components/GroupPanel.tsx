'use client';

import { useState } from 'react';
import { useBlockStore } from '@/store/blockStore';
import { X, ChevronRight, ChevronDown, Pencil, Eye, Layers, Box, Ungroup } from 'lucide-react';

interface GroupPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GroupPanel({ isOpen, onClose }: GroupPanelProps) {
  const blocks = useBlockStore((state) => state.blocks);
  const groups = useBlockStore((state) => state.groups);
  const selectedIds = useBlockStore((state) => state.selectedIds);
  const setSelection = useBlockStore((state) => state.setSelection);
  const updateGroupName = useBlockStore((state) => state.updateGroupName);
  const ungroupBlocks = useBlockStore((state) => state.ungroupBlocks);

  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const toggleCollapsed = (id: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const groupedBlocks = blocks.filter((b) => b.groupId);
  const ungroupedBlocks = blocks.filter((b) => !b.groupId);
  const groupMembersMap = new Map<string, typeof blocks>();
  for (const b of groupedBlocks) {
    const list = groupMembersMap.get(b.groupId!) || [];
    list.push(b);
    groupMembersMap.set(b.groupId!, list);
  }

  const handleStartEdit = (groupId: string, currentName: string) => {
    setEditingGroupId(groupId);
    setEditName(currentName);
  };

  const handleSaveEdit = () => {
    if (editingGroupId && editName.trim()) {
      updateGroupName(editingGroupId, editName.trim());
    }
    setEditingGroupId(null);
  };

  if (!isOpen) return null;

  return (
    <div className="w-60 h-full bg-zinc-900 border-l border-zinc-700 flex flex-col">
      <div className="p-3 border-b border-zinc-700 flex items-center justify-between">
        <div className="flex items-center gap-2 text-zinc-100 font-semibold text-sm">
          <Layers className="w-4 h-4 text-purple-400" />
          <span>导航</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {groups.map((group) => {
          const members = groupMembersMap.get(group.id) || [];
          const isCollapsed = collapsedGroups.has(group.id);

          return (
            <div key={group.id} className="mb-1">
              <div className="group mx-2 rounded-md flex items-center gap-1.5 px-2 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors">
                <button
                  onClick={() => toggleCollapsed(group.id)}
                  className="p-0.5 hover:bg-zinc-700 rounded"
                >
                  {isCollapsed ? (
                    <ChevronRight className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </button>
                <Layers className="w-3.5 h-3.5 text-purple-400" />

                {editingGroupId === group.id ? (
                  <input
                    autoFocus
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-1 py-0.5 text-xs text-zinc-200 outline-none"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={handleSaveEdit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit();
                      if (e.key === 'Escape') setEditingGroupId(null);
                    }}
                  />
                ) : (
                  <span
                    className="flex-1 truncate text-xs font-medium cursor-pointer"
                    onDoubleClick={() => handleStartEdit(group.id, group.name)}
                    onClick={() => {
                      if (members.length > 0) setSelection(members.map((m) => m.id));
                    }}
                  >
                    {group.name}
                  </span>
                )}

                <span className="text-[10px] text-zinc-600">{members.length}</span>

                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleStartEdit(group.id, group.name)}
                    className="p-0.5 hover:bg-zinc-700 rounded text-zinc-500 hover:text-zinc-300"
                    title="重命名"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => ungroupBlocks(group.id)}
                    className="p-0.5 hover:bg-zinc-700 rounded text-zinc-500 hover:text-red-400"
                    title="取消组合"
                  >
                    <Ungroup className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {!isCollapsed && members.map((block) => (
                <div
                  key={block.id}
                  onClick={() => setSelection([block.id])}
                  className={`ml-6 mr-2 rounded-md flex items-center gap-1.5 px-2 py-1 text-xs cursor-pointer transition-colors ${
                    selectedIds.includes(block.id)
                      ? 'bg-blue-500/10 text-blue-400'
                      : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  <Box className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{block.title || '未命名'}</span>
                  <span className="text-[10px] text-zinc-600 ml-auto">{block.type}</span>
                </div>
              ))}
              {members.length === 0 && !isCollapsed && (
                <div className="ml-8 mr-2 px-2 py-1 text-[10px] text-zinc-600 italic">空组合</div>
              )}
            </div>
          );
        })}

        {groups.length > 0 && ungroupedBlocks.length > 0 && (
          <div className="mx-3 my-2 border-t border-zinc-800" />
        )}

        {ungroupedBlocks.length > 0 && (
          <div className="px-3 py-1.5 text-[10px] text-zinc-500 uppercase tracking-wider font-medium">
            未分组 ({ungroupedBlocks.length})
          </div>
        )}

        {ungroupedBlocks.map((block) => (
          <div
            key={block.id}
            onClick={() => setSelection([block.id])}
            className={`mx-2 rounded-md flex items-center gap-1.5 px-2 py-1 text-xs cursor-pointer transition-colors ${
              selectedIds.includes(block.id)
                ? 'bg-blue-500/10 text-blue-400'
                : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
            }`}
          >
            <Eye className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{block.title || '未命名'}</span>
            <span className="text-[10px] text-zinc-600 ml-auto">{block.type}</span>
          </div>
        ))}

        {blocks.length === 0 && (
          <div className="text-xs text-zinc-600 text-center py-8 px-4">
            暂无 Block
          </div>
        )}
      </div>
    </div>
  );
}