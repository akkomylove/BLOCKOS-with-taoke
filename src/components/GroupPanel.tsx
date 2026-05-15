'use client';

import { useState } from 'react';
import { useBlockStore } from '@/store/blockStore';
import { X, ChevronRight, ChevronDown, Pencil, Eye, Layers, Box, Ungroup, Tag } from 'lucide-react';
import { getTagStyle } from './TagWheelPicker';

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
  const [collapsedTags, setCollapsedTags] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'group' | 'tag'>('group');

  const toggleCollapsed = (id: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleTagCollapsed = (tag: string) => {
    setCollapsedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
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

  const tagMap = new Map<string, typeof blocks>();
  const untaggedBlocks: typeof blocks = [];
  for (const b of blocks) {
    if (b.meta.tags && b.meta.tags.length > 0) {
      b.meta.tags.forEach((tag) => {
        const list = tagMap.get(tag) || [];
        list.push(b);
        tagMap.set(tag, list);
      });
    } else {
      untaggedBlocks.push(b);
    }
  }
  const allTags = Array.from(tagMap.keys()).sort();

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

  const handleSelectBlock = (blockId: string) => {
    setSelection([blockId]);
    onClose();
    setTimeout(() => {
      const el = document.querySelector(`[data-block-id="${blockId}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-14 bottom-0 w-80 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border-l border-gray-200 dark:border-zinc-800/50 z-40 overflow-hidden flex flex-col animate-slide-up shadow-2xl shadow-black/30">
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-200 dark:border-zinc-800/60">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">导航</h3>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex border-b border-gray-200 dark:border-zinc-800/60">
        <button
          onClick={() => setActiveTab('group')}
          className={`flex-1 py-2 text-xs font-medium transition-colors ${
            activeTab === 'group'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500'
              : 'text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-300'
          }`}
        >
          分组
        </button>
        <button
          onClick={() => setActiveTab('tag')}
          className={`flex-1 py-2 text-xs font-medium transition-colors ${
            activeTab === 'tag'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500'
              : 'text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-300'
          }`}
        >
          标签
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {activeTab === 'group' && (
          <>
            {groups.map((group) => {
              const members = groupMembersMap.get(group.id) || [];
              const isCollapsed = collapsedGroups.has(group.id);

              return (
                <div key={group.id} className="rounded-xl border border-gray-200/50 dark:border-zinc-800/50 overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2.5 bg-gray-100/40 dark:bg-zinc-800/40 border-b border-gray-200/40 dark:border-zinc-800/40">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleCollapsed(group.id)}
                        className="p-0.5 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded"
                      >
                        {isCollapsed ? (
                          <ChevronRight className="w-3 h-3 text-gray-500 dark:text-zinc-500" />
                        ) : (
                          <ChevronDown className="w-3 h-3 text-gray-500 dark:text-zinc-500" />
                        )}
                      </button>
                      <Layers className="w-3.5 h-3.5 text-blue-400" />

                      {editingGroupId === group.id ? (
                        <input
                          autoFocus
                          className="flex-1 bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded px-1 py-0.5 text-xs text-gray-800 dark:text-zinc-200 outline-none"
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
                          className="text-xs text-gray-700 dark:text-zinc-300 font-medium cursor-pointer"
                          onDoubleClick={() => handleStartEdit(group.id, group.name)}
                          onClick={() => {
                            if (members.length > 0) setSelection(members.map((m) => m.id));
                          }}
                        >
                          {group.name}
                        </span>
                      )}

                      <span className="text-[10px] text-gray-400 dark:text-zinc-600">{members.length}</span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => handleStartEdit(group.id, group.name)}
                        className="p-0.5 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300"
                        title="重命名"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => ungroupBlocks(group.id)}
                        className="p-0.5 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded text-gray-500 dark:text-zinc-500 hover:text-red-400"
                        title="取消组合"
                      >
                        <Ungroup className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {!isCollapsed && (
                    <div className="px-3 py-2 space-y-1">
                      {members.map((block) => (
                        <div
                          key={block.id}
                          onClick={() => handleSelectBlock(block.id)}
                          className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer transition-colors ${
                            selectedIds.includes(block.id)
                              ? 'bg-blue-500/10 text-blue-400'
                              : 'bg-gray-100/20 dark:bg-zinc-800/20 hover:bg-gray-200/30 dark:hover:bg-zinc-700/30'
                          }`}
                        >
                          <Box className="w-3 h-3 flex-shrink-0 text-gray-400 dark:text-zinc-500" />
                          <span className="text-xs text-gray-500 dark:text-zinc-400 truncate">{block.title || '未命名'}</span>
                          <span className="text-[10px] text-gray-400 dark:text-zinc-500 ml-auto">[{block.type}]</span>
                        </div>
                      ))}
                      {members.length === 0 && (
                        <div className="text-xs text-gray-400 dark:text-zinc-600 py-2 text-center">空组合</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {groups.length > 0 && ungroupedBlocks.length > 0 && (
              <div className="border-t border-gray-200 dark:border-zinc-800" />
            )}

            {ungroupedBlocks.length > 0 && (
              <div className="rounded-xl border border-gray-200/50 dark:border-zinc-800/50 overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-100/40 dark:bg-zinc-800/40 border-b border-gray-200/40 dark:border-zinc-800/40">
                  <Eye className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500" />
                  <span className="text-xs text-gray-700 dark:text-zinc-300 font-medium">未分组</span>
                  <span className="text-[10px] text-gray-400 dark:text-zinc-600">{ungroupedBlocks.length}</span>
                </div>
                <div className="px-3 py-2 space-y-1">
                  {ungroupedBlocks.map((block) => (
                    <div
                      key={block.id}
                      onClick={() => handleSelectBlock(block.id)}
                      className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer transition-colors ${
                        selectedIds.includes(block.id)
                          ? 'bg-blue-500/10 text-blue-400'
                          : 'bg-gray-100/20 dark:bg-zinc-800/20 hover:bg-gray-200/30 dark:hover:bg-zinc-700/30'
                      }`}
                    >
                      <Eye className="w-3 h-3 flex-shrink-0 text-gray-400 dark:text-zinc-500" />
                      <span className="text-xs text-gray-500 dark:text-zinc-400 truncate">{block.title || '未命名'}</span>
                      <span className="text-[10px] text-gray-400 dark:text-zinc-500 ml-auto">[{block.type}]</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'tag' && (
          <>
            {allTags.map((tag) => {
              const members = tagMap.get(tag) || [];
              const isCollapsed = collapsedTags.has(tag);

              return (
                <div key={tag} className="rounded-xl border border-gray-200/50 dark:border-zinc-800/50 overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2.5 bg-gray-100/40 dark:bg-zinc-800/40 border-b border-gray-200/40 dark:border-zinc-800/40">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleTagCollapsed(tag)}
                        className="p-0.5 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded"
                      >
                        {isCollapsed ? (
                          <ChevronRight className="w-3 h-3 text-gray-500 dark:text-zinc-500" />
                        ) : (
                          <ChevronDown className="w-3 h-3 text-gray-500 dark:text-zinc-500" />
                        )}
                      </button>
                      <Tag className="w-3 h-3 text-gray-400 dark:text-zinc-500" />
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${getTagStyle(tag)}`}>{tag}</span>
                      <span className="text-[10px] text-gray-400 dark:text-zinc-600">{members.length}</span>
                    </div>
                  </div>

                  {!isCollapsed && (
                    <div className="px-3 py-2 space-y-1">
                      {members.map((block) => (
                        <div
                          key={block.id}
                          onClick={() => handleSelectBlock(block.id)}
                          className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer transition-colors ${
                            selectedIds.includes(block.id)
                              ? 'bg-blue-500/10 text-blue-400'
                              : 'bg-gray-100/20 dark:bg-zinc-800/20 hover:bg-gray-200/30 dark:hover:bg-zinc-700/30'
                          }`}
                        >
                          <Box className="w-3 h-3 flex-shrink-0 text-gray-400 dark:text-zinc-500" />
                          <span className="text-xs text-gray-500 dark:text-zinc-400 truncate">{block.title || '未命名'}</span>
                          <span className="text-[10px] text-gray-400 dark:text-zinc-500 ml-auto">[{block.type}]</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {untaggedBlocks.length > 0 && (
              <>
                {allTags.length > 0 && <div className="border-t border-gray-200 dark:border-zinc-800" />}
                <div className="rounded-xl border border-gray-200/50 dark:border-zinc-800/50 overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-100/40 dark:bg-zinc-800/40 border-b border-gray-200/40 dark:border-zinc-800/40">
                    <Eye className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500" />
                    <span className="text-xs text-gray-700 dark:text-zinc-300 font-medium">无标签</span>
                    <span className="text-[10px] text-gray-400 dark:text-zinc-600">{untaggedBlocks.length}</span>
                  </div>
                  <div className="px-3 py-2 space-y-1">
                    {untaggedBlocks.map((block) => (
                      <div
                        key={block.id}
                        onClick={() => handleSelectBlock(block.id)}
                        className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer transition-colors ${
                          selectedIds.includes(block.id)
                            ? 'bg-blue-500/10 text-blue-400'
                            : 'bg-gray-100/20 dark:bg-zinc-800/20 hover:bg-gray-200/30 dark:hover:bg-zinc-700/30'
                        }`}
                      >
                        <Box className="w-3 h-3 flex-shrink-0 text-gray-400 dark:text-zinc-500" />
                        <span className="text-xs text-gray-500 dark:text-zinc-400 truncate">{block.title || '未命名'}</span>
                        <span className="text-[10px] text-gray-400 dark:text-zinc-500 ml-auto">[{block.type}]</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {allTags.length === 0 && untaggedBlocks.length === 0 && (
              <div className="text-center py-8 text-gray-400 dark:text-zinc-600">
                <Tag className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-zinc-700" />
                <p className="text-sm">暂无 Block</p>
              </div>
            )}
          </>
        )}

        {blocks.length === 0 && (
          <div className="text-center py-8 text-gray-400 dark:text-zinc-600">
            <Layers className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-zinc-700" />
            <p className="text-sm">暂无 Block</p>
          </div>
        )}
      </div>
    </div>
  );
}
