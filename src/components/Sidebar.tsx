'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
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
      <div className="w-12 h-full bg-[#f7f8fa] dark:bg-[#1a1c20] border-r border-[#dee0e3] dark:border-[#33363e] flex flex-col items-center py-3 gap-3 select-none">
        <button
          onClick={onToggleCollapse}
          className="p-1.5 hover:bg-[#eff0f2] dark:hover:bg-[#282a30] rounded-lg text-[#8f959e] dark:text-[#6b7280] hover:text-[#1f2329] dark:hover:text-[#f2f3f5] transition-colors"
          title="展开侧边栏"
         aria-label="展开侧边栏">
          <ChevronRight className="w-4 h-4" />
        </button>
        <div className="w-6 h-6 bg-[#3370ff] rounded-md flex items-center justify-center text-[11px] text-white font-bold shadow-xs">
          B
        </div>
        <button
          onClick={() => handleAddPage()}
          className="p-1.5 hover:bg-[#eff0f2] dark:hover:bg-[#282a30] rounded-lg text-[#8f959e] dark:text-[#6b7280] hover:text-[#3370ff] dark:hover:text-[#4b85ff] transition-colors"
          title="新建页面"
         aria-label="新建页面">
          <Plus className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-64 h-full bg-[#f7f8fa] dark:bg-[#1a1c20] border-r border-[#dee0e3] dark:border-[#33363e] flex flex-col select-none">
      <div className="h-11 px-3.5 border-b border-[#dee0e3] dark:border-[#33363e] flex items-center justify-between">
        <div className="flex items-center gap-2 text-[#1f2329] dark:text-[#f2f3f5] font-semibold text-sm">
          <div className="w-6 h-6 bg-[#3370ff] rounded-md flex items-center justify-center text-xs text-white shadow-xs font-bold">B</div>
          <span className="tracking-tight">BlockOS</span>
        </div>
        <button
          onClick={onToggleCollapse}
          className="p-1 hover:bg-[#eff0f2] dark:hover:bg-[#282a30] rounded-md text-[#8f959e] dark:text-[#6b7280] hover:text-[#1f2329] dark:hover:text-[#f2f3f5] transition-colors"
          title="折叠侧边栏"
         aria-label="折叠侧边栏">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        <div className="px-3.5 py-1.5 text-[11px] font-medium text-[#8f959e] dark:text-[#6b7280] tracking-wider flex items-center justify-between">
          <span>页面</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowAddFolder(!showAddFolder)}
              className="p-1 hover:bg-[#eff0f2] dark:hover:bg-[#282a30] rounded text-[#8f959e] dark:text-[#6b7280] hover:text-[#1f2329] dark:hover:text-[#f2f3f5] transition-colors"
              title="新建文件夹"
             aria-label="新建文件夹">
              <FolderPlus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleAddPage()}
              className="p-1 hover:bg-[#eff0f2] dark:hover:bg-[#282a30] rounded text-[#8f959e] dark:text-[#6b7280] hover:text-[#3370ff] dark:hover:text-[#4b85ff] transition-colors"
              title="新建页面"
             aria-label="新建页面">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {showAddFolder && (
          <div className="mx-3 mb-2 flex items-center gap-1.5">
            <input
              autoFocus
              className="flex-1 bg-white dark:bg-[#1f2125] border border-[#dee0e3] dark:border-[#33363e] rounded-md px-2 py-1 text-xs text-[#1f2329] dark:text-[#f2f3f5] outline-none focus:border-[#3370ff] transition-colors"
              placeholder="文件夹名称"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddFolder();
                if (e.key === 'Escape') { setShowAddFolder(false); setNewFolderName(''); }
              }}
            />
            <button onClick={handleAddFolder} className="p-1 text-[#3370ff] hover:text-[#215fe9]">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {folders.map((folder) => {
          const folderPages = pages.filter((p) => p.folderId === folder.id);
          return (
            <div key={folder.id} className="mb-1">
              <div className="group mx-2 rounded-md flex items-center gap-1.5 px-2 py-1.5 text-xs text-[#646a73] dark:text-[#9ca3af] hover:text-[#1f2329] dark:hover:text-[#f2f3f5] hover:bg-[#eff0f2]/70 dark:hover:bg-[#282a30]/70 transition-colors">
                <button
                  onClick={() => toggleFolderCollapse(folder.id)}
                  className="p-0.5 hover:bg-[#eff0f2] dark:hover:bg-[#282a30] rounded"
                >
                  {folder.collapsed ? (
                    <ChevronRight className="w-3 h-3 text-[#8f959e]" />
                  ) : (
                    <ChevronDown className="w-3 h-3 text-[#8f959e]" />
                  )}
                </button>
                {folder.collapsed ? (
                  <Folder className="w-3.5 h-3.5 text-[#8f959e]" />
                ) : (
                  <FolderOpen className="w-3.5 h-3.5 text-[#3370ff]" />
                )}
                {editingFolderId === folder.id ? (
                  <input
                    autoFocus
                    className="flex-1 bg-white dark:bg-[#1f2125] border border-[#3370ff] rounded px-1.5 py-0.5 text-xs text-[#1f2329] dark:text-[#f2f3f5] outline-none"
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
                <span className="text-[10px] text-[#8f959e] dark:text-[#6b7280]">{folderPages.length}</span>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleAddPage(folder.id)}
                    className="p-0.5 hover:bg-[#eff0f2] dark:hover:bg-[#282a30] rounded text-[#8f959e] dark:text-[#6b7280] hover:text-[#3370ff] dark:hover:text-[#4b85ff]"
                    title="在此文件夹新建页面"
                   aria-label="在此文件夹新建页面">
                    <Plus className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => deleteFolder(folder.id)}
                    className="p-0.5 hover:bg-[#eff0f2] dark:hover:bg-[#282a30] rounded text-[#8f959e] dark:text-[#6b7280] hover:text-[#d64b42]"
                    title="删除文件夹"
                   aria-label="删除文件夹">
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
                <div className="ml-8 mr-2 px-2 py-1 text-[11px] text-[#8f959e] dark:text-[#6b7280] italic">将页面移动到文件夹</div>
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
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);

  return (
    <div
      data-page-id={page.id}
      className={`group relative mx-2 ml-5 rounded-md flex items-center gap-2 px-2.5 py-1.5 text-xs cursor-pointer transition-colors ${
        isActive
          ? 'bg-[#eff4ff] dark:bg-blue-500/15 text-[#3370ff] dark:text-[#4b85ff] font-medium'
          : 'text-[#1f2329] dark:text-[#f2f3f5] hover:bg-[#eff0f2]/70 dark:hover:bg-[#282a30]/70'
      }`}
      onClick={onSelect}
    >
      <span className="text-sm">{page.icon || '📄'}</span>
      {editingId === page.id ? (
        <input
          autoFocus
          className="flex-1 bg-white dark:bg-[#1f2125] border border-[#3370ff] rounded px-1.5 py-0.5 outline-none text-[#1f2329] dark:text-[#f2f3f5] min-w-0 text-xs"
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
          className="p-1 rounded hover:bg-[#eff0f2] dark:hover:bg-[#282a30] text-[#8f959e] dark:text-[#6b7280] hover:text-[#1f2329] dark:hover:text-[#f2f3f5]"
          onClick={(e) => {
            e.stopPropagation();
            if (typeof window !== 'undefined') {
              const rect = e.currentTarget.getBoundingClientRect();
              setMenuPos({
                top: Math.min(rect.bottom + 4, window.innerHeight - 180),
                left: Math.max(12, rect.right - 144),
              });
            }
            setShowFolderPicker(false);
            onMenuToggle();
          }}
          aria-label={`页面「${page.title}」的更多操作`}
        >
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>
      </div>

      {menuOpenId === page.id && typeof document !== 'undefined' && createPortal(
        <>
          <div className="fixed inset-0 z-[180]" onClick={() => { setShowFolderPicker(false); onMenuToggle(); }} />
          <div
            className="fixed z-[190] bg-white dark:bg-[#1f2125] border border-[#dee0e3] dark:border-[#33363e] rounded-xl shadow-card-hover py-1 w-36 animate-in fade-in zoom-in-95 duration-100"
            style={{
              top: menuPos?.top ?? 100,
              left: menuPos?.left ?? 20,
            }}
          >
            <button
              className="w-full px-3 py-1.5 text-left text-xs text-[#1f2329] dark:text-[#f2f3f5] hover:bg-[#eff4ff] dark:hover:bg-blue-500/10 hover:text-[#3370ff] dark:hover:text-[#4b85ff] flex items-center gap-2 transition-colors"
              onClick={(e) => { e.stopPropagation(); onStartEdit(); onMenuToggle(); }}
            >
              <FileText className="w-3.5 h-3.5 text-[#8f959e]" />
              重命名
            </button>
            <div className="relative">
              <button
                className="w-full px-3 py-1.5 text-left text-xs text-[#1f2329] dark:text-[#f2f3f5] hover:bg-[#eff4ff] dark:hover:bg-blue-500/10 hover:text-[#3370ff] dark:hover:text-[#4b85ff] flex items-center gap-2 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowFolderPicker(!showFolderPicker);
                }}
              >
                <Folder className="w-3.5 h-3.5 text-[#8f959e]" />
                移动到...
              </button>
              {showFolderPicker && typeof document !== 'undefined' && createPortal(
                <>
                  <div className="fixed inset-0 z-[200]" onClick={() => setShowFolderPicker(false)} />
                  <div
                    className="fixed z-[210] bg-white dark:bg-[#1f2125] border border-[#dee0e3] dark:border-[#33363e] rounded-xl shadow-card-hover py-1 w-36 animate-in fade-in zoom-in-95 duration-100"
                    style={{
                      top: menuPos?.top ?? 100,
                      left: Math.min((menuPos?.left ?? 20) + 148, (typeof window !== 'undefined' ? window.innerWidth : 800) - 160),
                    }}
                  >
                    <button
                      className="w-full px-3 py-1.5 text-left text-xs text-[#1f2329] dark:text-[#f2f3f5] hover:bg-[#eff4ff] dark:hover:bg-blue-500/10 hover:text-[#3370ff] dark:hover:text-[#4b85ff] transition-colors"
                      onClick={(e) => { e.stopPropagation(); onMoveToFolder(undefined); setShowFolderPicker(false); onMenuToggle(); }}
                    >
                      无文件夹
                    </button>
                    {folders.map((f) => (
                      <button
                        key={f.id}
                        className="w-full px-3 py-1.5 text-left text-xs text-[#1f2329] dark:text-[#f2f3f5] hover:bg-[#eff4ff] dark:hover:bg-blue-500/10 hover:text-[#3370ff] dark:hover:text-[#4b85ff] transition-colors"
                        onClick={(e) => { e.stopPropagation(); onMoveToFolder(f.id); setShowFolderPicker(false); onMenuToggle(); }}
                      >
                        {f.name}
                      </button>
                    ))}
                  </div>
                </>,
                document.body
              )}
            </div>
            {hasMultiplePages && (
              <button
                className="w-full px-3 py-1.5 text-left text-xs text-[#d64b42] dark:text-rose-400 hover:bg-[#fff5f4] dark:hover:bg-rose-950/20 flex items-center gap-2 transition-colors"
                onClick={(e) => { e.stopPropagation(); onDelete(); onMenuToggle(); }}
              >
                <Trash2 className="w-3.5 h-3.5" />
                删除
              </button>
            )}
          </div>
        </>,
        document.body
      )}
    </div>
  );
}