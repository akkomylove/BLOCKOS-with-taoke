'use client';

import { useState } from 'react';
import { useBlockStore } from '@/store/blockStore';
import TemplatePicker from './TemplatePicker';
import { FileText, Plus, Trash2, MoreHorizontal, FolderPlus, Folder, ChevronDown, ChevronRight, FolderOpen } from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({ collapsed, onToggleCollapse }: SidebarProps) {
  const pages = useBlockStore((state) => state.pages);
  const folders = useBlockStore((state) => state.folders);
  const currentPageId = useBlockStore((state) => state.currentPageId);
  const deletePage = useBlockStore((state) => state.deletePage);
  const setCurrentPage = useBlockStore((state) => state.setCurrentPage);
  const updatePageTitle = useBlockStore((state) => state.updatePageTitle);
  const addFolder = useBlockStore((state) => state.addFolder);
  const deleteFolder = useBlockStore((state) => state.deleteFolder);
  const renameFolder = useBlockStore((state) => state.renameFolder);
  const toggleFolderCollapse = useBlockStore((state) => state.toggleFolderCollapse);
  const movePageToFolder = useBlockStore((state) => state.movePageToFolder);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editFolderName, setEditFolderName] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [showAddFolder, setShowAddFolder] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [pendingFolderId, setPendingFolderId] = useState<string | undefined>(undefined);

  const unassignedPages = pages.filter((p) => !p.folderId);

  const addPageFromTemplate = useBlockStore((state) => state.addPageFromTemplate);

  const handleAddPage = (folderId?: string) => {
    setPendingFolderId(folderId);
    setShowTemplatePicker(true);
  };

  const handleSelectTemplate = (templateId: string) => {
    addPageFromTemplate(templateId, pendingFolderId);
    setPendingFolderId(undefined);
  };

  const handleStartEdit = (page: { id: string; title: string }) => {
    setEditingId(page.id);
    setEditTitle(page.title);
    setMenuOpenId(null);
  };

  const handleSaveEdit = () => {
    if (editingId && editTitle.trim()) {
      updatePageTitle(editingId, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSaveEdit();
    if (e.key === 'Escape') setEditingId(null);
  };

  const handleAddFolder = () => {
    if (newFolderName.trim()) {
      addFolder(newFolderName.trim());
      setNewFolderName('');
      setShowAddFolder(false);
    }
  };

  const handleStartEditFolder = (folder: { id: string; name: string }) => {
    setEditingFolderId(folder.id);
    setEditFolderName(folder.name);
  };

  const handleSaveFolderEdit = () => {
    if (editingFolderId && editFolderName.trim()) {
      renameFolder(editingFolderId, editFolderName.trim());
    }
    setEditingFolderId(null);
  };

  if (collapsed) {
    return (
      <div className="w-12 h-full bg-white dark:bg-zinc-900 border-r border-gray-200 dark:border-zinc-700 flex flex-col items-center py-3 gap-3">
        <button
          onClick={onToggleCollapse}
          className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 transition-colors"
          title="展开侧边栏"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center text-[10px] text-white font-bold">
          B
        </div>
        <button
          onClick={() => handleAddPage()}
          className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 transition-colors"
          title="新建页面"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-64 h-full bg-white dark:bg-zinc-900 border-r border-gray-200 dark:border-zinc-700 flex flex-col">
      <div className="p-3 border-b border-gray-200 dark:border-zinc-700 flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-900 dark:text-zinc-100 font-semibold">
          <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center text-xs text-white">B</div>
          <span>BlockOS</span>
        </div>
        <button
          onClick={onToggleCollapse}
          className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 transition-colors"
          title="折叠侧边栏"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wider flex items-center justify-between">
          <span>页面</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowAddFolder(!showAddFolder)}
              className="p-0.5 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 transition-colors"
              title="新建文件夹"
            >
              <FolderPlus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleAddPage()}
              className="p-0.5 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 transition-colors"
              title="新建页面"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {showAddFolder && (
          <div className="mx-3 mb-2 flex items-center gap-1">
            <input
              autoFocus
              className="flex-1 bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded px-2 py-1 text-xs text-gray-800 dark:text-zinc-200 outline-none focus:border-blue-500/40"
              placeholder="文件夹名称"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddFolder();
                if (e.key === 'Escape') { setShowAddFolder(false); setNewFolderName(''); }
              }}
            />
            <button onClick={handleAddFolder} className="p-1 text-blue-400 hover:text-blue-300">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {folders.map((folder) => {
          const folderPages = pages.filter((p) => p.folderId === folder.id);
          return (
            <div key={folder.id} className="mb-1">
              <div className="group mx-2 rounded-md flex items-center gap-1.5 px-2 py-1 text-sm text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-200 transition-colors">
                <button
                  onClick={() => toggleFolderCollapse(folder.id)}
                  className="p-0.5 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded"
                >
                  {folder.collapsed ? (
                    <ChevronRight className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </button>
                {folder.collapsed ? (
                  <Folder className="w-3.5 h-3.5" />
                ) : (
                  <FolderOpen className="w-3.5 h-3.5" />
                )}
                {editingFolderId === folder.id ? (
                  <input
                    autoFocus
                    className="flex-1 bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded px-1 py-0.5 text-xs text-gray-800 dark:text-zinc-200 outline-none"
                    value={editFolderName}
                    onChange={(e) => setEditFolderName(e.target.value)}
                    onBlur={handleSaveFolderEdit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveFolderEdit();
                      if (e.key === 'Escape') setEditingFolderId(null);
                    }}
                  />
                ) : (
                  <span
                    className="flex-1 truncate text-xs font-medium cursor-pointer"
                    onDoubleClick={() => handleStartEditFolder(folder)}
                  >
                    {folder.name}
                  </span>
                )}
                <span className="text-[10px] text-gray-400 dark:text-zinc-600">{folderPages.length}</span>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleAddPage(folder.id)}
                    className="p-0.5 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300"
                    title="在此文件夹新建页面"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => deleteFolder(folder.id)}
                    className="p-0.5 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded text-gray-400 dark:text-zinc-500 hover:text-red-400"
                    title="删除文件夹"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {!folder.collapsed && folderPages.map((page) => (
                <PageItem
                  key={page.id}
                  page={page}
                  isActive={page.id === currentPageId}
                  editingId={editingId}
                  editTitle={editTitle}
                  menuOpenId={menuOpenId}
                  onSelect={() => setCurrentPage(page.id)}
                  onStartEdit={() => handleStartEdit(page)}
                  onSaveEdit={handleSaveEdit}
                  onKeyDown={handleKeyDown}
                  onEditChange={setEditTitle}
                  onMenuToggle={() => setMenuOpenId(menuOpenId === page.id ? null : page.id)}
                  onDelete={() => { deletePage(page.id); setMenuOpenId(null); }}
                  onMoveToFolder={(folderId) => movePageToFolder(page.id, folderId)}
                  folders={folders}
                  hasMultiplePages={pages.length > 1}
                />
              ))}
              {folderPages.length === 0 && !folder.collapsed && (
                <div className="ml-8 mr-2 px-2 py-1 text-[10px] text-gray-400 dark:text-zinc-600 italic">将页面移动到文件夹</div>
              )}
            </div>
          );
        })}

        {unassignedPages.map((page) => (
          <PageItem
            key={page.id}
            page={page}
            isActive={page.id === currentPageId}
            editingId={editingId}
            editTitle={editTitle}
            menuOpenId={menuOpenId}
            onSelect={() => setCurrentPage(page.id)}
            onStartEdit={() => handleStartEdit(page)}
            onSaveEdit={handleSaveEdit}
            onKeyDown={handleKeyDown}
            onEditChange={setEditTitle}
            onMenuToggle={() => setMenuOpenId(menuOpenId === page.id ? null : page.id)}
            onDelete={() => { deletePage(page.id); setMenuOpenId(null); }}
            onMoveToFolder={(folderId) => movePageToFolder(page.id, folderId)}
            folders={folders}
            hasMultiplePages={pages.length > 1}
          />
        ))}
      </div>

      <TemplatePicker
        isOpen={showTemplatePicker}
        onClose={() => { setShowTemplatePicker(false); setPendingFolderId(undefined); }}
        onSelect={handleSelectTemplate}
      />
    </div>
  );
}

interface PageItemProps {
  page: { id: string; title: string; icon?: string };
  isActive: boolean;
  editingId: string | null;
  editTitle: string;
  menuOpenId: string | null;
  onSelect: () => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onEditChange: (val: string) => void;
  onMenuToggle: () => void;
  onDelete: () => void;
  onMoveToFolder: (folderId: string | undefined) => void;
  folders: { id: string; name: string }[];
  hasMultiplePages: boolean;
}

function PageItem({
  page, isActive, editingId, editTitle, menuOpenId,
  onSelect, onStartEdit, onSaveEdit, onKeyDown, onEditChange,
  onMenuToggle, onDelete, onMoveToFolder, folders, hasMultiplePages,
}: PageItemProps) {
  const [showFolderPicker, setShowFolderPicker] = useState(false);

  return (
    <div
      className={`group relative mx-2 ml-6 rounded-md flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer transition-colors ${
        isActive
          ? 'bg-gray-200 dark:bg-zinc-700 text-gray-900 dark:text-zinc-100'
          : 'text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-zinc-100'
      }`}
      onClick={onSelect}
    >
      <span className="text-sm">{page.icon || '📄'}</span>
      {editingId === page.id ? (
        <input
          autoFocus
          className="flex-1 bg-transparent outline-none text-gray-900 dark:text-zinc-100 min-w-0 text-xs"
          value={editTitle}
          onChange={(e) => onEditChange(e.target.value)}
          onBlur={onSaveEdit}
          onKeyDown={onKeyDown}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="flex-1 truncate text-xs">{page.title}</span>
      )}

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          className="p-0.5 rounded hover:bg-gray-300 dark:hover:bg-zinc-600 text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-200"
          onClick={(e) => {
            e.stopPropagation();
            onMenuToggle();
          }}
        >
          <MoreHorizontal className="w-3 h-3" />
        </button>
      </div>

      {menuOpenId === page.id && (
        <div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-zinc-700 border border-gray-300 dark:border-zinc-600 rounded-md shadow-lg z-50 py-1">
          <button
            className="w-full px-3 py-1.5 text-left text-xs text-gray-800 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-600 flex items-center gap-2"
            onClick={(e) => { e.stopPropagation(); onStartEdit(); }}
          >
            <FileText className="w-3 h-3" />
            重命名
          </button>
          <div className="relative">
            <button
              className="w-full px-3 py-1.5 text-left text-xs text-gray-800 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-600 flex items-center gap-2"
              onClick={(e) => {
                e.stopPropagation();
                setShowFolderPicker(!showFolderPicker);
              }}
            >
              <Folder className="w-3 h-3" />
              移动到...
            </button>
            {showFolderPicker && (
              <div className="absolute left-full top-0 ml-1 w-32 bg-white dark:bg-zinc-700 border border-gray-300 dark:border-zinc-600 rounded-md shadow-lg py-1">
                <button
                  className="w-full px-3 py-1.5 text-left text-xs text-gray-800 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-600"
                  onClick={(e) => { e.stopPropagation(); onMoveToFolder(undefined); setShowFolderPicker(false); }}
                >
                  无文件夹
                </button>
                {folders.map((f) => (
                  <button
                    key={f.id}
                    className="w-full px-3 py-1.5 text-left text-xs text-gray-800 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-600"
                    onClick={(e) => { e.stopPropagation(); onMoveToFolder(f.id); setShowFolderPicker(false); }}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          {hasMultiplePages && (
            <button
              className="w-full px-3 py-1.5 text-left text-xs text-red-400 hover:bg-gray-100 dark:hover:bg-zinc-600 flex items-center gap-2"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
            >
              <Trash2 className="w-3 h-3" />
              删除
            </button>
          )}
        </div>
      )}
    </div>
  );
}