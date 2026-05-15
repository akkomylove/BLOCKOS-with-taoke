'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useBlockStore } from '@/store/blockStore';
import SortableBlock from './SortableBlock';
import CommandMenu from './CommandMenu';
import AIResultCard from './AIResultCard';
import AIActionMenu from './AIActionMenu';
import CommandPalette from './CommandPalette';
import RelationDrawer from './RelationDrawer';
import { Link2, Move, ChevronDown, ChevronRight, Plus, ArrowDownToLine, X, CopyPlus, Wand2, Ungroup, Group, Tag, X as XIcon } from 'lucide-react';
import type { BlockType, Block } from '@/types/block';
import TagWheelPicker, { getTagStyle } from './TagWheelPicker';

interface BlockEditorProps {
  commandPaletteOpen: boolean;
  relationDrawerOpen: boolean;
  onCloseCommandPalette: () => void;
  onCloseRelationDrawer: () => void;
}

export default function BlockEditor({
  commandPaletteOpen,
  relationDrawerOpen,
  onCloseCommandPalette,
  onCloseRelationDrawer,
}: BlockEditorProps) {
  const blocks = useBlockStore((state) => state.blocks);
  const selectedIds = useBlockStore((state) => state.selectedIds);
  const setSelection = useBlockStore((state) => state.setSelection);
  const toggleSelection = useBlockStore((state) => state.toggleSelection);
  const clearSelection = useBlockStore((state) => state.clearSelection);
  const addBlock = useBlockStore((state) => state.addBlock);
  const createLink = useBlockStore((state) => state.createLink);
  const moveBlockTo = useBlockStore((state) => state.moveBlockTo);
  const resizeBlock = useBlockStore((state) => state.resizeBlock);
  const updateBlock = useBlockStore((state) => state.updateBlock);
  const duplicateBlock = useBlockStore((state) => state.duplicateBlock);
  const groupBlocks = useBlockStore((state) => state.groupBlocks);
  const ungroupBlocks = useBlockStore((state) => state.ungroupBlocks);

  const [commandMenuOpen, setCommandMenuOpen] = useState(false);
  const [aiResults, setAiResults] = useState<{ id: string; blockId: string; result: string; loading?: boolean }[]>([]);
  const [linkMode, setLinkMode] = useState(false);
  const [linkSource, setLinkSource] = useState<string | null>(null);

  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [panOrigin, setPanOrigin] = useState({ x: 0, y: 0 });

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const dragGroupMembers = useRef<Array<{ id: string; ox: number; oy: number }>>([]);
  const [resizingId, setResizingId] = useState<string | null>(null);

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [contextTargetId, setContextTargetId] = useState<string | null>(null);

  const [selectionBox, setSelectionBox] = useState<{
    startX: number; startY: number;
    currentX: number; currentY: number;
  } | null>(null);

  const [showParentPicker, setShowParentPicker] = useState(false);
  const [tagWheelBlockId, setTagWheelBlockId] = useState<string | null>(null);
  const [tagWheelRect, setTagWheelRect] = useState<DOMRect | undefined>(undefined);

  const [aiMenu, setAiMenu] = useState<{
    blockId: string;
    blockType: BlockType;
    position: { top: number; left: number };
  } | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);

  const sortedBlocks = useMemo(
    () => [...blocks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [blocks]
  );

  const visibleBlocks = useMemo(() => {
    const collapsedParents = new Set<string>();
    const addCollapsedDescendants = (parentId: string) => {
      for (const b of sortedBlocks) {
        if (b.parentId === parentId) {
          collapsedParents.add(b.id);
          addCollapsedDescendants(b.id);
        }
      }
    };
    for (const b of sortedBlocks) {
      if (b.collapsed && sortedBlocks.some((c) => c.parentId === b.id)) {
        addCollapsedDescendants(b.id);
      }
    }
    return sortedBlocks.filter((b) => !collapsedParents.has(b.id));
  }, [sortedBlocks]);

  const childCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const b of sortedBlocks) {
      if (b.parentId) {
        map[b.parentId] = (map[b.parentId] || 0) + 1;
      }
    }
    return map;
  }, [sortedBlocks]);

  const selectableParents = useMemo(() => {
    return sortedBlocks.filter((b) => !selectedIds.includes(b.id));
  }, [sortedBlocks, selectedIds]);

  const groupBounds = useMemo(() => {
    const groups = new Map<string, Block[]>();
    for (const b of sortedBlocks) {
      if (b.groupId) {
        const list = groups.get(b.groupId) || [];
        list.push(b);
        groups.set(b.groupId, list);
      }
    }
    const bounds: Array<{ groupId: string; x: number; y: number; w: number; h: number }> = [];
    for (const [groupId, members] of groups) {
      const minX = Math.min(...members.map((m) => m.x));
      const minY = Math.min(...members.map((m) => m.y));
      const maxX = Math.max(...members.map((m) => m.x + m.width));
      const maxY = Math.max(...members.map((m) => m.y + 80));
      bounds.push({ groupId, x: minX - 8, y: minY - 8, w: maxX - minX + 16, h: maxY - minY + 16 });
    }
    return bounds;
  }, [sortedBlocks]);

  const handleSelect = useCallback(
    (id: string, multi: boolean) => {
      if (linkMode && linkSource) {
        createLink(linkSource, id);
        setLinkMode(false);
        setLinkSource(null);
        return;
      }
      const clickedBlock = blocks.find((b) => b.id === id);
      if (clickedBlock?.groupId && !multi) {
        const groupIds = blocks.filter((b) => b.groupId === clickedBlock.groupId).map((b) => b.id);
        setSelection(groupIds);
        return;
      }
      if (multi) {
        toggleSelection(id);
      } else {
        setSelection([id]);
      }
    },
    [toggleSelection, setSelection, linkMode, linkSource, createLink, blocks]
  );

  const handleAIAction = useCallback(async (blockId: string, action: string) => {
    const block = blocks.find((b) => b.id === blockId);
    if (!block) return;
    const resultId = `${blockId}-${action}-${Date.now()}`;
    setAiResults((prev) => [...prev, { id: resultId, blockId, result: '', loading: true }]);

    try {
      const res = await fetch('/api/ai/block-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockType: block.type, content: block.content, action }),
      });
      if (!res.ok) throw new Error('Failed');

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No reader');

      const decoder = new TextDecoder();
      let accumulated = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
      }

      setAiResults((prev) =>
        prev.map((r) => (r.id === resultId ? { ...r, result: accumulated.trim() || '处理完成', loading: false } : r))
      );
    } catch {
      setAiResults((prev) =>
        prev.map((r) => (r.id === resultId ? { ...r, result: 'AI 处理失败', loading: false } : r))
      );
    }
  }, [blocks]);

  const handleCloseResult = useCallback((id: string) => {
    setAiResults((prev) => prev.filter((r) => r.id !== id));
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        clearSelection();
        setCommandMenuOpen(false);
        setLinkMode(false);
        setLinkSource(null);
        setContextMenu(null);
        setContextTargetId(null);
        setShowParentPicker(false);
      }
    };

    const handleDocContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isOnUI = !!target.closest('[data-ui-control]');
      if (isOnUI) return;
      e.preventDefault();
      const blockEl = target.closest('[data-block-id]');
      setContextTargetId(blockEl?.getAttribute('data-block-id') || null);
      setContextMenu({ x: e.clientX, y: e.clientY });
    };

    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('contextmenu', handleDocContextMenu);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('contextmenu', handleDocContextMenu);
    };
  }, [clearSelection]);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      setPanOrigin({ x: pan.x, y: pan.y });
      e.preventDefault();
      return;
    }
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    const isOnBlock = !!target.closest('[data-block-id]');
    const isOnUI = !!target.closest('[data-ui-control]');
    if (!isOnBlock && !isOnUI) {
      clearSelection();
      setContextMenu(null);
      setContextTargetId(null);
      setShowParentPicker(false);
      setSelectionBox({
        startX: e.clientX,
        startY: e.clientY,
        currentX: e.clientX,
        currentY: e.clientY,
      });
    }
  }, [pan, clearSelection]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      setPan({ x: panOrigin.x + dx, y: panOrigin.y + dy });
    }
    if (selectionBox) {
      setSelectionBox((prev) => prev ? { ...prev, currentX: e.clientX, currentY: e.clientY } : null);
    }
    if (draggingId) {
      const block = blocks.find((b) => b.id === draggingId);
      if (block) {
        let newX = (e.clientX - dragOffset.x - pan.x - canvasRef.current!.getBoundingClientRect().left) / zoom;
        let newY = (e.clientY - dragOffset.y - pan.y - canvasRef.current!.getBoundingClientRect().top) / zoom;

        const SNAP = 10;
        const otherBlocks = blocks.filter((b) => b.id !== draggingId);
        for (const other of otherBlocks) {
          if (Math.abs(newX - other.x) < SNAP) newX = other.x;
          if (Math.abs(newX + block.width - (other.x + other.width)) < SNAP) newX = other.x + other.width - block.width;
          if (Math.abs(newY - other.y) < SNAP) newY = other.y;
          if (Math.abs(newY + 80 - (other.y + 80)) < SNAP) newY = other.y;
          if (Math.abs(newY - (other.y + 80)) < SNAP) newY = other.y + 80;
          if (Math.abs(newY + 80 - other.y) < SNAP) newY = other.y - 80;
        }

        const dx = Math.round(newX) - block.x;
        const dy = Math.round(newY) - block.y;

        if (dragGroupMembers.current.length > 0) {
          dragGroupMembers.current.forEach((m) => {
            moveBlockTo(m.id, m.ox + dx, m.oy + dy);
          });
        } else {
          moveBlockTo(draggingId, Math.round(newX), Math.round(newY));
        }
      }
    }
    if (resizingId) {
      const blockEl = document.querySelector(`[data-block-id="${resizingId}"]`);
      if (blockEl) {
        const rect = blockEl.getBoundingClientRect();
        resizeBlock(resizingId, Math.max(160, Math.round(e.clientX - rect.left)));
      }
    }
  }, [isPanning, panStart, panOrigin, selectionBox, draggingId, dragOffset, resizingId, blocks, pan, zoom, moveBlockTo, resizeBlock]);

  const handleCanvasMouseUp = useCallback(() => {
    setIsPanning(false);

    if (selectionBox) {
      const canvasRect = canvasRef.current!.getBoundingClientRect();
      const startCanvasX = (selectionBox.startX - canvasRect.left - pan.x) / zoom;
      const startCanvasY = (selectionBox.startY - canvasRect.top - pan.y) / zoom;
      const endCanvasX = (selectionBox.currentX - canvasRect.left - pan.x) / zoom;
      const endCanvasY = (selectionBox.currentY - canvasRect.top - pan.y) / zoom;

      const rect = {
        left: Math.min(startCanvasX, endCanvasX),
        right: Math.max(startCanvasX, endCanvasX),
        top: Math.min(startCanvasY, endCanvasY),
        bottom: Math.max(startCanvasY, endCanvasY),
      };

      const ids = blocks
        .filter((b) =>
          b.x + b.width > rect.left && b.x < rect.right &&
          b.y + 80 > rect.top && b.y < rect.bottom
        )
        .map((b) => b.id);

      if (ids.length > 0) {
        setSelection(ids);
      }
      setSelectionBox(null);
    }

    if (draggingId) {
      setDraggingId(null);
      useBlockStore.getState().saveHistory();
    }
    if (resizingId) {
      setResizingId(null);
      useBlockStore.getState().saveHistory();
    }
  }, [selectionBox, draggingId, resizingId, blocks, pan, zoom, setSelection]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom((z) => Math.min(2, Math.max(0.3, z + delta)));
    } else {
      setPan((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
    }
  }, []);

  const startDragBlock = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const block = blocks.find((b) => b.id === id);
    if (!block) return;
    const canvasRect = canvasRef.current!.getBoundingClientRect();
    const blockScreenX = block.x * zoom + pan.x + canvasRect.left;
    const blockScreenY = block.y * zoom + pan.y + canvasRect.top;
    setDraggingId(id);
    setDragOffset({ x: e.clientX - blockScreenX, y: e.clientY - blockScreenY });

    if (block.groupId) {
      const groupMembers = blocks.filter((b) => b.groupId === block.groupId);
      dragGroupMembers.current = groupMembers.map((b) => ({ id: b.id, ox: b.x, oy: b.y }));
      setSelection(groupMembers.map((b) => b.id));
    } else {
      dragGroupMembers.current = [];
      setSelection([id]);
    }
  }, [blocks, zoom, pan, setSelection]);

  const startResizeBlock = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setResizingId(id);
  }, []);

  const handleCommandSelect = useCallback(
    (type: BlockType) => {
      const canvasRect = canvasRef.current!.getBoundingClientRect();
      const x = (canvasRect.width / 2 - pan.x) / zoom;
      const y = (canvasRect.height / 2 - pan.y) / zoom;
      addBlock(type, undefined, { x: Math.round(x), y: Math.round(y) });
      setCommandMenuOpen(false);
    },
    [addBlock, pan, zoom]
  );

  const handleStartLink = useCallback(() => {
    if (selectedIds.length === 1) {
      setLinkMode(true);
      setLinkSource(selectedIds[0]);
    }
  }, [selectedIds]);

  const addBlockAtCenter = useCallback((type: BlockType) => {
    const canvasRect = canvasRef.current!.getBoundingClientRect();
    const x = (canvasRect.width / 2 - pan.x) / zoom;
    const y = (canvasRect.height / 2 - pan.y) / zoom;
    addBlock(type, undefined, { x: Math.round(x), y: Math.round(y) });
    setContextMenu(null);
  }, [addBlock, pan, zoom]);

  const addBlockAtPosition = useCallback((type: BlockType, screenX: number, screenY: number) => {
    if (!canvasRef.current) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const x = (screenX - canvasRect.left - pan.x) / zoom;
    const y = (screenY - canvasRect.top - pan.y) / zoom;
    addBlock(type, undefined, { x: Math.round(x), y: Math.round(y) });
    setContextMenu(null);
    setContextTargetId(null);
  }, [addBlock, pan, zoom]);

  const handleSetAsChild = useCallback((parentId: string) => {
    if (selectedIds.length > 0) {
      selectedIds.forEach((id) => {
        if (id !== parentId) {
          updateBlock(id, { parentId });
        }
      });
      useBlockStore.getState().saveHistory();
    }
    setContextMenu(null);
    setContextTargetId(null);
    setShowParentPicker(false);
  }, [selectedIds, updateBlock]);

  const handleOpenAIMenu = useCallback((blockId: string, blockType: BlockType, position: { top: number; left: number }) => {
    setAiMenu({ blockId, blockType, position });
  }, []);

  const handleAddTag = useCallback((blockId: string, tag: string) => {
    const block = blocks.find((b) => b.id === blockId);
    if (!block || !tag.trim()) return;
    const tags = block.meta.tags || [];
    if (tags.includes(tag.trim())) return;
    updateBlock(blockId, { meta: { ...block.meta, tags: [...tags, tag.trim()] } });
    setTagWheelBlockId(null);
  }, [blocks, updateBlock]);

  const handleRemoveTag = useCallback((blockId: string, tag: string) => {
    const block = blocks.find((b) => b.id === blockId);
    if (!block) return;
    const tags = (block.meta.tags || []).filter((t) => t !== tag);
    updateBlock(blockId, { meta: { ...block.meta, tags } });
  }, [blocks, updateBlock]);

  const renderBlockTree = useCallback((block: (typeof sortedBlocks)[0], depth: number = 0): React.ReactNode => {
    const isChild = !!block.parentId;
    const children = sortedBlocks.filter((b) => b.parentId === block.id);

    return (
      <div
        key={block.id}
        className={`${depth === 0 ? 'absolute group/block' : 'relative group/block'}`}
        style={depth === 0 ? { left: block.x, top: block.y, width: block.width } : { width: block.width }}
        data-block-id={block.id}
      >
        <div className={depth > 0 ? 'ml-4 mt-1' : ''}>
          <div
            className={`rounded-lg border transition-all ${
              selectedIds.includes(block.id)
                ? 'border-blue-400/60 shadow-lg shadow-blue-500/10'
                : isChild
                  ? 'border-blue-800/40 hover:border-blue-700/40'
                  : 'border-gray-300/60 dark:border-zinc-700/60 hover:border-gray-400/60 dark:hover:border-zinc-600/60'
            } bg-white dark:bg-zinc-900 backdrop-blur-sm`}
          >
            <div
              className={`flex items-center gap-1 h-7 px-2 cursor-grab active:cursor-grabbing border-b ${
                isChild ? 'border-blue-300/40 bg-blue-50/30 dark:border-blue-800/30 dark:bg-blue-950/25' : 'border-gray-200/40 dark:border-zinc-700/40'
              }`}
              onMouseDown={(e) => startDragBlock(block.id, e)}
            >
              <Move className="w-3 h-3 text-gray-500 dark:text-zinc-400" />
              <input
                value={block.title}
                onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                placeholder="Block 标题"
                className={`flex-1 bg-transparent text-[10px] outline-none placeholder:text-gray-400 dark:placeholder:text-zinc-600 ${
                  isChild ? 'text-blue-500 dark:text-blue-300/80' : 'text-gray-700 dark:text-zinc-300'
                }`}
                onMouseDown={(e) => e.stopPropagation()}
              />
              {childCountMap[block.id] && childCountMap[block.id] > 0 && (
                <span className="text-[9px] text-blue-600 dark:text-blue-300/70 font-mono bg-blue-500/15 px-1.5 py-0.5 rounded-full">
                  {childCountMap[block.id]}
                </span>
              )}
              {(childCountMap[block.id] || 0) > 0 && (
                <button
                  onClick={() => updateBlock(block.id, { collapsed: !block.collapsed })}
                  className="p-0.5 hover:bg-gray-300 dark:hover:bg-zinc-600 rounded text-gray-500 dark:text-zinc-400"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  {block.collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              )}
              <div className="flex items-center gap-1 relative">
                {(block.meta.tags || []).map((tag) => (
                  <span
                    key={tag}
                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] ${getTagStyle(tag)}`}
                  >
                    {tag}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemoveTag(block.id, tag); }}
                      className="hover:opacity-70"
                    >
                      <XIcon className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (tagWheelBlockId === block.id) {
                        setTagWheelBlockId(null);
                      } else {
                        setTagWheelBlockId(block.id);
                        setTagWheelRect(e.currentTarget.getBoundingClientRect());
                      }
                    }}
                    className="p-0.5 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded text-gray-400 dark:text-zinc-500 transition-colors"
                    title="添加标签"
                  >
                    <Tag className="w-3 h-3" />
                  </button>
                  {tagWheelBlockId === block.id && (
                    <TagWheelPicker
                      isOpen={true}
                      onClose={() => setTagWheelBlockId(null)}
                      onSelect={(tag) => handleAddTag(block.id, tag)}
                      existingTags={block.meta.tags || []}
                      triggerRect={tagWheelRect}
                    />
                  )}
                </div>
              </div>
            </div>

            {!block.collapsed && (
              <div className="px-3 py-2">
                <SortableBlock
                      block={block}
                      isSelected={selectedIds.includes(block.id)}
                      onSelect={handleSelect}
                      onOpenAIMenu={handleOpenAIMenu}
                      isLinkTarget={linkMode && linkSource !== block.id}
                      isLinkSource={linkMode && linkSource === block.id}
                    />
              </div>
            )}

            {!block.collapsed && children.length > 0 && (
              <div className="pb-2">
                {children.map((child) => renderBlockTree(child, depth + 1))}
              </div>
            )}
          </div>
        </div>

        {!block.collapsed && (
          <div
            className="absolute right-0 top-0 bottom-0 w-2.5 cursor-ew-resize opacity-0 group-hover/block:opacity-100 transition-opacity hover:bg-blue-400/30 rounded-r-lg z-10"
            onMouseDown={(e) => startResizeBlock(block.id, e)}
          />
        )}
      </div>
    );
  }, [sortedBlocks, selectedIds, childCountMap, updateBlock, startDragBlock, handleSelect, handleOpenAIMenu, linkMode, linkSource, startResizeBlock, tagWheelBlockId, tagWheelRect, handleAddTag, handleRemoveTag]);

  return (
    <div
      ref={canvasRef}
      className="flex-1 overflow-hidden relative cursor-crosshair bg-gray-50 dark:bg-zinc-950"
      style={{
        backgroundImage: 'radial-gradient(circle, rgba(161,161,170,0.2) 1px, transparent 1px)',
        backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
        backgroundPosition: `${pan.x}px ${pan.y}px`,
      }}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleCanvasMouseMove}
      onMouseUp={handleCanvasMouseUp}
      onMouseLeave={handleCanvasMouseUp}
      onWheel={handleWheel}
    >
      {selectionBox && (
        <div
          className="fixed pointer-events-none z-50 border border-blue-400/50 bg-blue-400/10"
          style={{
            left: Math.min(selectionBox.startX, selectionBox.currentX),
            top: Math.min(selectionBox.startY, selectionBox.currentY),
            width: Math.abs(selectionBox.currentX - selectionBox.startX),
            height: Math.abs(selectionBox.currentY - selectionBox.startY),
          }}
        />
      )}

      <div
        className="absolute origin-top-left"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          width: '10000px',
          height: '10000px',
        }}
      >
        <svg
          className="absolute origin-top-left pointer-events-none"
          style={{
            width: '10000px',
            height: '10000px',
          }}
        >
          <defs>
            <marker
              id="linkArrow"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(96,165,250,0.6)" />
            </marker>
          </defs>
          {sortedBlocks.flatMap((block) => {
            const links = block.meta.links || [];
            return links.map((targetId) => {
              const target = blocks.find((b) => b.id === targetId);
              if (!target) return null;
              const x1 = block.x + block.width / 2;
              const y1 = block.y + 30;
              const x2 = target.x + target.width / 2;
              const y2 = target.y + 30;
              const midY = (y1 + y2) / 2;
              return (
                <path
                  key={`${block.id}-${targetId}`}
                  d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                  fill="none"
                  stroke="rgba(96,165,250,0.5)"
                  strokeWidth="2"
                  strokeDasharray="6 3"
                  markerEnd="url(#linkArrow)"
                />
              );
            });
          })}
          {groupBounds.map((g) => (
            <rect
              key={g.groupId}
              x={g.x}
              y={g.y}
              width={g.w}
              height={g.h}
              fill="none"
              stroke="rgba(168,85,247,0.3)"
              strokeWidth="1.5"
              strokeDasharray="8 4"
              rx="10"
            />
          ))}
        </svg>

        {visibleBlocks.filter((b) => !b.parentId).map((b) => renderBlockTree(b))}
      </div>

      <div data-ui-control className="absolute bottom-4 right-4 flex items-center gap-2 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-xl border border-gray-300 dark:border-zinc-600 rounded-lg px-3 py-1.5 z-20">
        <button
          onClick={() => setZoom((z) => Math.max(0.3, z - 0.1))}
          className="text-xs text-gray-700 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-zinc-100 px-1"
        >
          −
        </button>
        <span className="text-xs text-gray-500 dark:text-zinc-400 font-mono w-10 text-center">{Math.round(zoom * 100)}%</span>
        <button
          onClick={() => setZoom((z) => Math.min(2, z + 0.1))}
          className="text-xs text-gray-700 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-zinc-100 px-1"
        >
          +
        </button>
        <div className="w-px h-4 bg-gray-300 dark:bg-zinc-600" />
        <button
          onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
          className="text-xs text-gray-700 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-zinc-100"
        >
          Reset
        </button>
      </div>

      <div data-ui-control className="absolute bottom-4 left-4 text-xs text-gray-400 dark:text-zinc-500 z-20">
        右键空白处添加 Block · 滚轮缩放
      </div>

      <div data-ui-control className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-xl border border-gray-300 dark:border-zinc-600 rounded-lg px-2 py-1 z-20">
        {(['text', 'todo', 'code', 'table', 'media'] as BlockType[]).map((type) => (
          <button
            key={type}
            onClick={() => addBlockAtCenter(type)}
            className="flex items-center gap-1 px-2 py-1 text-[11px] text-gray-700 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded transition-colors"
            title={`添加 ${type}`}
          >
            <Plus className="w-3 h-3" />
            {type === 'text' ? '文本' : type === 'todo' ? '待办' : type === 'code' ? '代码' : type === 'table' ? '表格' : '媒体'}
          </button>
        ))}
      </div>

      {contextMenu && createPortal(
        <div
          data-ui-control
          className="fixed z-[100] bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-600 rounded-lg shadow-xl py-1 min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1.5 text-[11px] text-gray-500 dark:text-zinc-400 border-b border-gray-200 dark:border-zinc-700 mb-1">添加 Block</div>
          {(['text', 'todo', 'code', 'table', 'media'] as BlockType[]).map((type) => (
            <button
              key={type}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                addBlockAtPosition(type, contextMenu.x, contextMenu.y);
              }}
              className="w-full text-left px-3 py-1.5 text-xs text-gray-800 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-3 h-3 text-gray-500 dark:text-zinc-400" />
              {type === 'text' ? '文本' : type === 'todo' ? '待办' : type === 'code' ? '代码' : type === 'table' ? '表格' : '媒体'}
            </button>
          ))}
          <div className="border-t border-gray-200 dark:border-zinc-700 my-1" />
          <div className="px-3 py-1.5 text-[11px] text-gray-500 dark:text-zinc-400 border-b border-gray-200 dark:border-zinc-700 mb-1">AI 操作</div>
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 text-xs text-gray-800 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors flex items-center gap-2"
          >
            <Wand2 className="w-3 h-3 text-purple-400" />
            AI 生成内容
          </button>
          {contextTargetId && selectedIds.length > 0 && selectedIds.some((id) => id !== contextTargetId) && (
            <>
              <div className="border-t border-gray-200 dark:border-zinc-700 my-1" />
              <div className="px-3 py-1.5 text-[11px] text-gray-500 dark:text-zinc-400 border-b border-gray-200 dark:border-zinc-700 mb-1">Block 操作</div>
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSetAsChild(contextTargetId);
                }}
                className="w-full text-left px-3 py-1.5 text-xs text-gray-800 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors flex items-center gap-2"
              >
                <ArrowDownToLine className="w-3 h-3 text-blue-400" />
                设为子 Block
              </button>
            </>
          )}
        </div>,
        document.body
      )}

      <CommandMenu
        isOpen={commandMenuOpen}
        onClose={() => setCommandMenuOpen(false)}
        onSelect={handleCommandSelect}
        position={{ top: 100, left: 100 }}
      />

      {aiResults.length > 0 && createPortal(
        <div data-ui-control className="fixed bottom-20 right-4 z-50 space-y-2 max-w-sm">
          {aiResults.map((result) => (
            <AIResultCard
              key={result.id}
              result={result.result}
              blockId={result.blockId}
              onClose={() => handleCloseResult(result.id)}
            />
          ))}
        </div>,
        document.body
      )}

      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={onCloseCommandPalette}
      />

      <RelationDrawer
        isOpen={relationDrawerOpen}
        onClose={onCloseRelationDrawer}
      />

      {selectedIds.length > 0 && !linkMode && (
        <div data-ui-control className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 px-5 py-2.5 bg-white/95 dark:bg-zinc-800/95 backdrop-blur-xl border border-gray-300/60 dark:border-zinc-600/60 rounded-full shadow-2xl shadow-black/50 z-40 animate-slide-up">
          <span className="text-xs text-gray-700 dark:text-zinc-300 font-mono">{selectedIds.length} selected</span>
          <div className="w-px h-4 bg-gray-300 dark:bg-zinc-600" />
          <button
            onClick={() => {
              selectedIds.forEach((id) => duplicateBlock(id));
              clearSelection();
            }}
            className="flex items-center gap-1.5 px-3 py-1 text-xs bg-gray-200 dark:bg-zinc-700 text-gray-800 dark:text-zinc-200 hover:bg-gray-300 dark:hover:bg-zinc-600 rounded-full transition-colors"
          >
            <CopyPlus className="w-3 h-3" />
            复制
          </button>
          <div className="w-px h-4 bg-gray-300 dark:bg-zinc-600" />
          {selectedIds.length >= 2 && (
            <>
              <button
                onClick={() => {
                  groupBlocks(selectedIds);
                  clearSelection();
                }}
                className="flex items-center gap-1.5 px-3 py-1 text-xs bg-purple-500/15 text-purple-400 hover:bg-purple-500/25 rounded-full transition-colors"
              >
                <Group className="w-3 h-3" />
                组合
              </button>
              <div className="w-px h-4 bg-zinc-600" />
            </>
          )}
          {selectedIds.length === 1 && (() => {
            const selectedBlock = blocks.find((b) => b.id === selectedIds[0]);
            if (selectedBlock?.groupId) {
              const groupMembers = blocks.filter((b) => b.groupId === selectedBlock.groupId);
              return (
                <>
                  <button
                onClick={() => {
                  ungroupBlocks(selectedBlock.groupId!);
                  clearSelection();
                }}
                className="flex items-center gap-1.5 px-3 py-1 text-xs bg-purple-500/15 text-purple-400 hover:bg-purple-500/25 rounded-full transition-colors"
              >
                <Ungroup className="w-3 h-3" />
                取消组合 ({groupMembers.length})
              </button>
                  <div className="w-px h-4 bg-gray-300 dark:bg-zinc-600" />
                </>
              );
            }
            return null;
          })()}
          <button
              onClick={handleStartLink}
              className="flex items-center gap-1.5 px-3 py-1 text-xs bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 rounded-full transition-colors"
            >
              <Link2 className="w-3 h-3" />
              创建链接
            </button>
            <div className="w-px h-4 bg-gray-300 dark:bg-zinc-600" />
            <div className="relative">
              <button
                onClick={() => setShowParentPicker(!showParentPicker)}
                className="flex items-center gap-1.5 px-3 py-1 text-xs bg-gray-200 dark:bg-zinc-700 text-gray-800 dark:text-zinc-200 hover:bg-gray-300 dark:hover:bg-zinc-600 rounded-full transition-colors"
              >
                <ArrowDownToLine className="w-3 h-3" />
                设为子 Block
              </button>
              {showParentPicker && (
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-56 max-h-48 overflow-y-auto bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-600 rounded-lg shadow-xl py-1">
                  <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-200 dark:border-zinc-700">
                    <span className="text-[11px] text-gray-500 dark:text-zinc-400">选择父 Block</span>
                    <button onClick={() => setShowParentPicker(false)} className="text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  {selectableParents.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-gray-400 dark:text-zinc-500">没有可选的 Block</div>
                  ) : (
                    selectableParents.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => handleSetAsChild(b.id)}
                        className="w-full text-left px-3 py-1.5 text-xs text-gray-800 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors truncate"
                      >
                        {b.title || '未命名 Block'}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
      )}

      {linkMode && (
        <div data-ui-control className="fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-2.5 bg-blue-600/90 backdrop-blur-xl text-white text-sm rounded-full shadow-2xl shadow-black/50 z-40 animate-slide-up">
          点击目标 Block 创建链接
        </div>
      )}

      {aiMenu && createPortal(
        <AIActionMenu
          isOpen={true}
          onClose={() => setAiMenu(null)}
          onSelect={(action) => {
            handleAIAction(aiMenu.blockId, action);
            setAiMenu(null);
          }}
          blockType={aiMenu.blockType}
          position={aiMenu.position}
        />,
        document.body
      )}
    </div>
  );
}