'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useBlockStore, estimateBlockHeight } from '@/store/blockStore';
import SortableBlock from './SortableBlock';
import CommandMenu from './CommandMenu';
import AIResultCard from './AIResultCard';
import AIActionMenu from './AIActionMenu';
import CommandPalette from './CommandPalette';
import RelationDrawer from './RelationDrawer';
import { Link2, Move, ChevronDown, ChevronRight, Plus, ArrowDownToLine, ArrowUpFromLine, X, CopyPlus, Wand2, Ungroup, Group, Tag, X as XIcon, Sparkles, Trash2 } from 'lucide-react';
import type { BlockType, Block } from '@/types/block';
import TagWheelPicker, { getTagStyle } from './TagWheelPicker';
import CanvasMinimap from './CanvasMinimap';
import { BLOCK_CATEGORIES } from '@/lib/block-categories';

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
  const deleteBlock = useBlockStore((state) => state.deleteBlock);
  const addBlock = useBlockStore((state) => state.addBlock);
  const createLink = useBlockStore((state) => state.createLink);
  const removeLink = useBlockStore((state) => state.removeLink);
  const moveBlockTo = useBlockStore((state) => state.moveBlockTo);
  const resizeBlock = useBlockStore((state) => state.resizeBlock);
  const updateBlock = useBlockStore((state) => state.updateBlock);
  const duplicateBlock = useBlockStore((state) => state.duplicateBlock);
  const outdentBlock = useBlockStore((state) => state.outdentBlock);
  const groupBlocks = useBlockStore((state) => state.groupBlocks);
  const ungroupBlocks = useBlockStore((state) => state.ungroupBlocks);
  const currentPageId = useBlockStore((state) => state.currentPageId);

  const [commandMenuOpen, setCommandMenuOpen] = useState(false);
  const [commandMenuPos, setCommandMenuPos] = useState({ top: 90, left: 100 });

  const openCommandMenuCentered = useCallback(() => {
    const left = typeof window !== 'undefined' ? Math.max(16, Math.round((window.innerWidth - 320) / 2)) : 100;
    setCommandMenuPos({ top: 90, left });
    setCommandMenuOpen(true);
  }, []);

  const [aiResults, setAiResults] = useState<{ id: string; blockId: string; result: string; loading?: boolean; timestamp?: number }[]>([]);
  const [linkMode, setLinkMode] = useState(false);
  const [linkSource, setLinkSource] = useState<string | null>(null);

  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  // 页面切换时重置视口到原始比例
  useEffect(() => {
    setPan({ x: 0, y: 0 });
    setZoom(1);
  }, [currentPageId]);

  const [isNavigating, setIsNavigating] = useState(false);
  const navigatingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 监听画布变换，通知导览与外围组件实时同步
  useEffect(() => {
    window.dispatchEvent(new Event('blockos-canvas-transform'));
  }, [pan, zoom]);

  // 监听定位特定 Block 居中平移事件（用于教程定位与跳转）
  useEffect(() => {
    const handleScrollTo = (e: Event) => {
      const customEvent = e as CustomEvent<{ blockId?: string; selector?: string; tourId?: string }>;
      const { blockId, selector, tourId } = customEvent.detail || {};
      const searchKey = blockId || tourId;
      if (!searchKey && !selector) return;

      // 1. 优先在状态 blocks 中匹配目标卡片（支持精确 ID、tourId、带 userId 后缀前缀匹配）
      let targetBlock = blocks.find((b) =>
        (searchKey && b.id === searchKey) ||
        (searchKey && b.meta?.tourId === searchKey) ||
        (searchKey && b.id.startsWith(searchKey)) ||
        (tourId && b.id.includes(tourId)) ||
        (blockId && b.id.includes(blockId))
      );

      // 2. 如果状态中没直接命中，且传入了 DOM 选择器，通过 DOM 属性反查
      if (!targetBlock && selector) {
        const domEl = document.querySelector(selector);
        const domBlockId = domEl?.getAttribute('data-block-id');
        if (domBlockId) {
          targetBlock = blocks.find((b) => b.id === domBlockId);
        }
      }

      const containerW = canvasRef.current?.clientWidth || window.innerWidth;

      if (targetBlock) {
        // 如果该 Block 是子 Block，自动将父 Block 展开以确保其可见渲染
        if (targetBlock.parentId) {
          const parent = blocks.find((p) => p.id === targetBlock.parentId);
          if (parent && parent.collapsed) {
            updateBlock(parent.id, { collapsed: false });
          }
        }

        // 确保目标 Block 处于左侧偏中位置，且右侧稳定留出 380px 空间容纳导览卡片，彻底根除横向跳跃与遮挡
        const targetW = (targetBlock.width || 760) * zoom;
        const totalContentWidth = targetW + 380;
        let idealPanX = 0;
        if (containerW >= 1200) {
          idealPanX = Math.round(Math.max(40, (containerW - totalContentWidth) / 2) - targetBlock.x * zoom);
        } else {
          idealPanX = Math.round(Math.max(20, (containerW - targetW) / 2) - targetBlock.x * zoom);
        }

        // 纵向居中偏上（距顶部 70px），确保卡片与聚焦高亮框完整进入视口中央
        const idealPanY = Math.round(70 - targetBlock.y * zoom);

        if (navigatingTimerRef.current) clearTimeout(navigatingTimerRef.current);
        setIsNavigating(true);
        setPan({
          x: idealPanX,
          y: idealPanY,
        });

        navigatingTimerRef.current = setTimeout(() => {
          setIsNavigating(false);
        }, 450);
      } else if (selector && canvasRef.current) {
        // 3. 保底：直接根据 DOM 元素物理位置动态校正画布平移
        const domEl = document.querySelector(selector) as HTMLElement | null;
        if (domEl) {
          const canvasRect = canvasRef.current.getBoundingClientRect();
          const elRect = domEl.getBoundingClientRect();
          const elCanvasX = (elRect.left - canvasRect.left - pan.x) / zoom;
          const elCanvasY = (elRect.top - canvasRect.top - pan.y) / zoom;
          const targetW = elRect.width;
          const totalContentWidth = targetW + 380;
          let idealPanX = 0;
          if (containerW >= 1200) {
            idealPanX = Math.round(Math.max(40, (containerW - totalContentWidth) / 2) - elCanvasX * zoom);
          } else {
            idealPanX = Math.round(Math.max(20, (containerW - targetW) / 2) - elCanvasX * zoom);
          }
          const idealPanY = Math.round(70 - elCanvasY * zoom);

          if (navigatingTimerRef.current) clearTimeout(navigatingTimerRef.current);
          setIsNavigating(true);
          setPan({ x: idealPanX, y: idealPanY });
          navigatingTimerRef.current = setTimeout(() => {
            setIsNavigating(false);
          }, 450);
        }
      }
    };
    window.addEventListener('blockos-scroll-to-block', handleScrollTo);
    return () => {
      window.removeEventListener('blockos-scroll-to-block', handleScrollTo);
      if (navigatingTimerRef.current) clearTimeout(navigatingTimerRef.current);
    };
  }, [blocks, zoom, pan.x, pan.y, updateBlock]);

  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [panOrigin, setPanOrigin] = useState({ x: 0, y: 0 });

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const dragGroupMembers = useRef<Array<{ id: string; ox: number; oy: number }>>([]);
  const dragOriginPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragHasMoved = useRef(false);
  const wasMultiSelectedRef = useRef(false);
  const selectionBoxIsAdditive = useRef(false);
  const [resizeState, setResizeState] = useState<{
    id: string;
    direction: 'ew' | 'ns' | 'nwse';
    startW: number;
    startH: number;
    startX: number;
    startY: number;
  } | null>(null);

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

  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const dropTargetIdRef = useRef<string | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const clearSelectionRef = useRef(clearSelection);
  const selectedIdsRef = useRef(selectedIds);
  const deleteBlockRef = useRef(deleteBlock);

  useEffect(() => {
    clearSelectionRef.current = clearSelection;
  }, [clearSelection]);

  useEffect(() => {
    selectedIdsRef.current = selectedIds;
  }, [selectedIds]);

  useEffect(() => {
    deleteBlockRef.current = deleteBlock;
  }, [deleteBlock]);

  // 检查 candidateId 是否为 potentialAncestorId 的后代节点（防循环归属）
  const isDescendantOf = useCallback(
    (candidateId: string, potentialAncestorId: string) => {
      let current = blocks.find((b) => b.id === candidateId);
      while (current?.parentId) {
        if (current.parentId === potentialAncestorId) return true;
        const parentId = current.parentId;
        current = blocks.find((b) => b.id === parentId);
      }
      return false;
    },
    [blocks]
  );

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

  const connectionLinks = useMemo(() => {
    const getVisualBox = (b: Block) => {
      let x = b.x;
      let y = b.y;
      let w = b.width || 480;
      const h = b.height || estimateBlockHeight(b);

      if (b.parentId) {
        const parent = blocks.find((p) => p.id === b.parentId);
        if (parent) {
          x = parent.x + 20;
          y = parent.y + 60;
          w = Math.max(200, (parent.width || 480) - 40);
        }
      }

      return {
        left: x,
        right: x + w,
        top: y,
        bottom: y + h,
        centerX: x + w / 2,
        centerY: y + h / 2,
        width: w,
        height: h,
      };
    };

    const linksList: Array<{
      id: string;
      fromId: string;
      toId: string;
      targetTitle: string;
      path: string;
      midX: number;
      midY: number;
    }> = [];

    for (const block of sortedBlocks) {
      const links = block.meta.links || [];
      for (const targetId of links) {
        const target = blocks.find((b) => b.id === targetId);
        if (!target) continue;

        const box1 = getVisualBox(block);
        const box2 = getVisualBox(target);

        const dx = box2.centerX - box1.centerX;
        const dy = box2.centerY - box1.centerY;

        let x1: number, y1: number, x2: number, y2: number;
        let path: string;
        let midX: number, midY: number;

        // Determine if connection is primarily vertical or horizontal
        if (Math.abs(dy) >= Math.abs(dx)) {
          // Vertical dominant
          if (dy >= 0) {
            // box1 is above box2 -> connect bottom of box1 to top of box2
            x1 = box1.centerX;
            y1 = box1.bottom;
            x2 = box2.centerX;
            y2 = box2.top;
            midX = (x1 + x2) / 2;
            midY = (y1 + y2) / 2;
            const deltaY = Math.max(24, Math.abs(y2 - y1) * 0.5);
            path = `M ${x1} ${y1} C ${x1} ${y1 + deltaY}, ${x2} ${y2 - deltaY}, ${x2} ${y2}`;
          } else {
            // box1 is below box2 -> connect top of box1 to bottom of box2
            x1 = box1.centerX;
            y1 = box1.top;
            x2 = box2.centerX;
            y2 = box2.bottom;
            midX = (x1 + x2) / 2;
            midY = (y1 + y2) / 2;
            const deltaY = Math.max(24, Math.abs(y1 - y2) * 0.5);
            path = `M ${x1} ${y1} C ${x1} ${y1 - deltaY}, ${x2} ${y2 + deltaY}, ${x2} ${y2}`;
          }
        } else {
          // Horizontal dominant
          if (dx >= 0) {
            // box1 is to the left of box2 -> connect right edge to left edge
            x1 = box1.right;
            y1 = box1.centerY;
            x2 = box2.left;
            y2 = box2.centerY;
            midX = (x1 + x2) / 2;
            midY = (y1 + y2) / 2;
            const deltaX = Math.max(24, Math.abs(x2 - x1) * 0.5);
            path = `M ${x1} ${y1} C ${x1 + deltaX} ${y1}, ${x2 - deltaX} ${y2}, ${x2} ${y2}`;
          } else {
            // box1 is to the right of box2 -> connect left edge to right edge
            x1 = box1.left;
            y1 = box1.centerY;
            x2 = box2.right;
            y2 = box2.centerY;
            midX = (x1 + x2) / 2;
            midY = (y1 + y2) / 2;
            const deltaX = Math.max(24, Math.abs(x1 - x2) * 0.5);
            path = `M ${x1} ${y1} C ${x1 - deltaX} ${y1}, ${x2 + deltaX} ${y2}, ${x2} ${y2}`;
          }
        }

        linksList.push({
          id: `${block.id}-${targetId}`,
          fromId: block.id,
          toId: targetId,
          targetTitle: target.title || target.type,
          path,
          midX,
          midY,
        });
      }
    }

    return linksList;
  }, [sortedBlocks, blocks]);

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
    setAiResults((prev) => [...prev.slice(-19), { id: resultId, blockId, result: '', loading: true }]);

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
        clearSelectionRef.current();
        setCommandMenuOpen(false);
        setLinkMode(false);
        setLinkSource(null);
        setContextMenu(null);
        setContextTargetId(null);
        setShowParentPicker(false);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        const target = e.target as HTMLElement | null;
        const isEditingText = !!target?.closest(
          'input, textarea, [contenteditable="true"], .monaco-editor, [data-slate-editor]'
        );
        const isInDialog = !!target?.closest('[role="dialog"], .modal, [data-modal]');
        if (!isEditingText && !isInDialog && selectedIdsRef.current.length > 0) {
          e.preventDefault();
          const toDelete = [...selectedIdsRef.current];
          toDelete.forEach((id) => deleteBlockRef.current(id));
          clearSelectionRef.current();
          useBlockStore.getState().saveHistory();
        }
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
  }, []);

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
      const isModifier = e.shiftKey || e.metaKey || e.ctrlKey;
      selectionBoxIsAdditive.current = isModifier;
      if (!isModifier) {
        clearSelection();
      }
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
        dragHasMoved.current = true;
        let newX = (e.clientX - dragOffset.x - pan.x - canvasRef.current!.getBoundingClientRect().left) / zoom;
        let newY = (e.clientY - dragOffset.y - pan.y - canvasRef.current!.getBoundingClientRect().top) / zoom;

        // Snapping logic against stationary blocks
        const movingIds = dragGroupMembers.current.length > 0
          ? new Set(dragGroupMembers.current.map((m) => m.id))
          : new Set([draggingId]);
        const otherBlocks = blocks.filter((b) => !movingIds.has(b.id) && !b.parentId);

        const SNAP = 10;
        const blockW = block.width || 760;
        for (const other of otherBlocks) {
          const otherW = other.width || 760;
          const otherH = other.height || 200;
          if (Math.abs(newX - other.x) < SNAP) newX = other.x;
          if (Math.abs(newX + blockW - (other.x + otherW)) < SNAP) newX = other.x + otherW - blockW;
          if (Math.abs(newY - other.y) < SNAP) newY = other.y;
          if (Math.abs(newY + 80 - (other.y + otherH)) < SNAP) newY = other.y;
          if (Math.abs(newY - (other.y + otherH)) < SNAP) newY = other.y + otherH;
          if (Math.abs(newY + 80 - other.y) < SNAP) newY = other.y - 80;
        }

        if (dragGroupMembers.current.length > 0) {
          const totalDx = Math.round(newX) - dragOriginPos.current.x;
          const totalDy = Math.round(newY) - dragOriginPos.current.y;
          dragGroupMembers.current.forEach((m) => {
            moveBlockTo(m.id, Math.round(m.ox + totalDx), Math.round(m.oy + totalDy));
          });
        } else {
          moveBlockTo(draggingId, Math.round(newX), Math.round(newY));
        }

        // 探测鼠标是否滑入其他顶级卡片区域（快捷拖入成为子 Block 目标判定）
        let hoverParent: Block | null = null;
        for (let i = blocks.length - 1; i >= 0; i--) {
          const candidate = blocks[i];
          if (movingIds.has(candidate.id)) continue;
          if (candidate.parentId) continue; // 目标必须为顶级容器
          if (isDescendantOf(candidate.id, draggingId)) continue; // 杜绝循环

          const el = document.querySelector(`[data-block-id="${candidate.id}"]`);
          if (!el) continue;
          const rect = el.getBoundingClientRect();
          if (
            e.clientX >= rect.left &&
            e.clientX <= rect.right &&
            e.clientY >= rect.top &&
            e.clientY <= rect.bottom
          ) {
            hoverParent = candidate;
            break;
          }
        }

        const newTargetId = hoverParent ? hoverParent.id : null;
        if (dropTargetIdRef.current !== newTargetId) {
          dropTargetIdRef.current = newTargetId;
          setDropTargetId(newTargetId);
        }
      }
    }
    if (resizeState) {
      const dx = (e.clientX - resizeState.startX) / zoom;
      const dy = (e.clientY - resizeState.startY) / zoom;
      let newW = resizeState.startW;
      let newH = resizeState.startH;

      if (resizeState.direction === 'ew' || resizeState.direction === 'nwse') {
        newW = Math.max(280, Math.round(resizeState.startW + dx));
      }
      if (resizeState.direction === 'ns' || resizeState.direction === 'nwse') {
        newH = Math.max(80, Math.round(resizeState.startH + dy));
      }

      resizeBlock(resizeState.id, newW, newH);
    }
  }, [isPanning, panStart, panOrigin, selectionBox, draggingId, dragOffset, resizeState, blocks, pan, zoom, moveBlockTo, resizeBlock, updateBlock, isDescendantOf]);

  const handleCanvasMouseUp = useCallback(() => {
    setIsPanning(false);

    if (selectionBox) {
      const boxW = Math.abs(selectionBox.currentX - selectionBox.startX);
      const boxH = Math.abs(selectionBox.currentY - selectionBox.startY);

      if (boxW > 6 || boxH > 6) {
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
          .filter((b) => {
            if (b.parentId) return false;
            const bWidth = b.width || 760;
            const bHeight = b.height || 200;
            const overlapsX = b.x < rect.right && (b.x + bWidth) > rect.left;
            const overlapsY = b.y < rect.bottom && (b.y + bHeight) > rect.top;
            return overlapsX && overlapsY;
          })
          .map((b) => b.id);

        if (ids.length > 0) {
          if (selectionBoxIsAdditive.current) {
            setSelection(Array.from(new Set([...selectedIds, ...ids])));
          } else {
            setSelection(ids);
          }
        }
      }
      setSelectionBox(null);
    }

    if (draggingId) {
      const targetId = dropTargetIdRef.current;
      if (targetId && dragHasMoved.current) {
        // 拖入目标 Block，快捷成为子 Block！
        const movingBlockIds = dragGroupMembers.current.length > 0
          ? dragGroupMembers.current.map((m) => m.id)
          : [draggingId];

        const targetBlock = blocks.find((b) => b.id === targetId);

        movingBlockIds.forEach((id) => {
          if (id !== targetId && !isDescendantOf(targetId, id)) {
            updateBlock(id, { parentId: targetId });
          }
        });

        if (targetBlock) {
          updateBlock(targetId, { collapsed: false });
          const maxChildW = Math.max(
            targetBlock.width || 760,
            ...movingBlockIds.map((id) => blocks.find((b) => b.id === id)?.width || 760)
          );
          if (maxChildW > (targetBlock.width || 760)) {
            updateBlock(targetId, { width: maxChildW });
          }
        }

        setSelection(movingBlockIds);
        useBlockStore.getState().saveHistory();
      } else {
        if (!dragHasMoved.current && wasMultiSelectedRef.current) {
          setSelection([draggingId]);
        }
        useBlockStore.getState().saveHistory();
      }

      setDraggingId(null);
      setDropTargetId(null);
      dropTargetIdRef.current = null;
      dragGroupMembers.current = [];
    }
    if (resizeState) {
      setResizeState(null);
      document.body.style.userSelect = '';
      window.getSelection()?.removeAllRanges();
      useBlockStore.getState().saveHistory();
    }
  }, [selectionBox, draggingId, resizeState, blocks, pan, zoom, selectedIds, setSelection, updateBlock, isDescendantOf]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    const target = e.target as HTMLElement | null;
    const isInsideScrollable = !!target?.closest(
      '[data-sandbox-scroll], [data-no-canvas-wheel], textarea, pre, .overflow-y-auto, .overflow-auto'
    );
    if (isInsideScrollable) {
      return;
    }

    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom((z) => Math.min(2, Math.max(0.3, Number((z + delta).toFixed(1)))));
    } else {
      setPan((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
    }
  }, []);

  const startDragBlock = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const block = blocks.find((b) => b.id === id);
      if (!block) return;
      const canvasRect = canvasRef.current!.getBoundingClientRect();
      const blockEl = document.querySelector(`[data-block-id="${id}"]`) as HTMLElement | null;
      const rect = blockEl?.getBoundingClientRect();
      const blockScreenX = rect ? rect.left : (block.x * zoom + pan.x + canvasRect.left);
      const blockScreenY = rect ? rect.top : (block.y * zoom + pan.y + canvasRect.top);
      setDraggingId(id);
      setDragOffset({ x: e.clientX - blockScreenX, y: e.clientY - blockScreenY });
      dragOriginPos.current = {
        x: rect ? (rect.left - canvasRect.left - pan.x) / zoom : block.x,
        y: rect ? (rect.top - canvasRect.top - pan.y) / zoom : block.y,
      };
      dragHasMoved.current = false;
      setDropTargetId(null);
      dropTargetIdRef.current = null;

      const isModifierKey = e.shiftKey || e.metaKey || e.ctrlKey;
      const isAlreadyMultiSelected = selectedIds.includes(id) && selectedIds.length > 1;
      wasMultiSelectedRef.current = isAlreadyMultiSelected;

      if (isAlreadyMultiSelected) {
        // Keep existing multi-selection and drag all selected top-level blocks together
        const selectedTopBlocks = blocks.filter((b) => selectedIds.includes(b.id) && !b.parentId);
        dragGroupMembers.current = selectedTopBlocks.map((b) => ({ id: b.id, ox: b.x, oy: b.y }));
      } else if (isModifierKey) {
        const newSelected = selectedIds.includes(id) ? selectedIds : [...selectedIds, id];
        setSelection(newSelected);
        const selectedTopBlocks = blocks.filter((b) => newSelected.includes(b.id) && !b.parentId);
        dragGroupMembers.current =
          selectedTopBlocks.length > 1
            ? selectedTopBlocks.map((b) => ({ id: b.id, ox: b.x, oy: b.y }))
            : [];
      } else if (block.groupId) {
        const groupMembers = blocks.filter((b) => b.groupId === block.groupId && !b.parentId);
        dragGroupMembers.current = groupMembers.map((b) => ({ id: b.id, ox: b.x, oy: b.y }));
        setSelection(groupMembers.map((b) => b.id));
      } else {
        dragGroupMembers.current = [];
        setSelection([id]);
      }
    },
    [blocks, zoom, pan, selectedIds, setSelection]
  );

  const startResizeBlock = useCallback((id: string, direction: 'ew' | 'ns' | 'nwse', e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const block = blocks.find((b) => b.id === id);
    if (!block) return;
    const blockEl = document.querySelector(`[data-block-id="${id}"]`) as HTMLElement | null;
    const currentHeight = block.height || (blockEl ? blockEl.offsetHeight : 200);
    setResizeState({
      id,
      direction,
      startW: block.width || 760,
      startH: currentHeight,
      startX: e.clientX,
      startY: e.clientY,
    });
    document.body.style.userSelect = 'none';
    window.getSelection()?.removeAllRanges();
  }, [blocks]);

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
      const parent = blocks.find((b) => b.id === parentId);
      selectedIds.forEach((id) => {
        if (id !== parentId) {
          updateBlock(id, { parentId });
        }
      });
      if (parent) {
        const childWidths = selectedIds
          .filter((id) => id !== parentId)
          .map((id) => blocks.find((b) => b.id === id)?.width || 480);
        const maxChildWidth = Math.max(parent.width || 480, ...childWidths);
        if (maxChildWidth > (parent.width || 480)) {
          updateBlock(parentId, { width: maxChildWidth });
        }
      }
      useBlockStore.getState().saveHistory();
    }
    setContextMenu(null);
    setContextTargetId(null);
    setShowParentPicker(false);
  }, [selectedIds, blocks, updateBlock]);

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
        className={`${depth === 0 ? 'absolute group/block' : 'relative group/block w-full'} flex flex-col`}
        style={depth === 0 ? {
          left: block.x,
          top: block.y,
          width: block.width,
          ...(block.height ? { height: `${block.height}px` } : {}),
        } : {
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
          ...(block.height ? { minHeight: `${block.height}px` } : {}),
        }}
        data-block-id={block.id}
        data-tour={(block.meta?.tourId as string) || block.id.match(/(guide-block-[a-z]+)/)?.[1] || block.id}
      >
        <div className="h-full flex-1 flex flex-col min-h-0 w-full relative">
          {dropTargetId === block.id && (
            <div className="absolute inset-x-2 -top-3.5 z-30 flex items-center justify-center pointer-events-none">
              <span className="px-2.5 py-1 text-[11px] font-semibold bg-[#3370ff] text-white rounded-full shadow-lg border border-blue-400 flex items-center gap-1.5 animate-bounce">
                <span>📥 松开鼠标：快捷归属为子 Block</span>
              </span>
            </div>
          )}
          <div
            className={`h-full flex-1 flex flex-col min-h-0 rounded-xl border transition-all ${
              dropTargetId === block.id
                ? 'border-[#3370ff] ring-4 ring-[#3370ff]/30 bg-[#eff4ff]/60 dark:bg-blue-950/20 shadow-xl shadow-blue-500/20'
                : selectedIds.includes(block.id)
                  ? 'border-[#3370ff] ring-2 ring-[#3370ff]/20 shadow-card-hover'
                  : isChild
                    ? 'border-[#c2d6ff]/70 dark:border-[#33363e] bg-[#f9fbff]/95 dark:bg-[#1a1c20]/95 shadow-xs'
                    : 'border-[#dee0e3] dark:border-[#33363e] hover:border-[#a6b0c3] dark:hover:border-[#4e535f] bg-white dark:bg-[#1f2125] shadow-card hover:shadow-card-hover'
            } backdrop-blur-sm`}
          >
            <div
              className={`shrink-0 flex items-center gap-1.5 h-8 px-2.5 cursor-grab active:cursor-grabbing border-b ${
                isChild ? 'border-[#dee0e3]/60 bg-[#eff4ff]/40 dark:border-[#2e3037] dark:bg-[#23252a]' : 'border-[#eff0f2] dark:border-[#2e3037]'
              }`}
              onMouseDown={(e) => startDragBlock(block.id, e)}
            >
              {depth === 0 ? (
                <Move className="w-3 h-3 text-[#8f959e] dark:text-[#6b7280]" />
              ) : (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-[#eff4ff] text-[#3370ff] dark:bg-blue-500/15 dark:text-[#4b85ff] border border-[#c2d6ff]">
                  子 Block
                </span>
              )}
              <input
                value={block.title}
                onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                placeholder="Block 标题"
                className={`flex-1 bg-transparent text-[11px] outline-none placeholder:text-gray-400 dark:placeholder:text-zinc-600 ${
                  isChild ? 'text-blue-700 dark:text-blue-300 font-medium' : 'text-gray-700 dark:text-zinc-300'
                }`}
                onMouseDown={(e) => e.stopPropagation()}
              />
              {isChild && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    outdentBlock(block.id);
                  }}
                  className="flex items-center gap-1 px-1.5 py-0.5 text-[9px] rounded bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60 hover:bg-blue-50 dark:hover:bg-blue-900/40 transition-colors"
                  title="移出子 Block（提升为画布顶级 Block）"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <ArrowUpFromLine className="w-2.5 h-2.5" />
                  <span>移出</span>
                </button>
              )}
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
                      onRemove={(tag) => handleRemoveTag(block.id, tag)}
                      existingTags={block.meta.tags || []}
                      triggerRect={tagWheelRect}
                    />
                  )}
                </div>
              </div>
            </div>

            {!block.collapsed && (
              <div className="flex-1 min-h-0 px-3 py-2 overflow-auto flex flex-col">
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
              <div className="shrink-0 px-3 pb-3 pt-2 border-t border-[#eff0f2] dark:border-[#2e3037] bg-[#f7f8fa]/80 dark:bg-[#141517]/80 rounded-b-xl">
                <div className="flex items-center justify-between py-1 mb-1.5 text-[11px] font-medium text-[#3370ff] dark:text-[#4b85ff]">
                  <div className="flex items-center gap-1.5">
                    <ArrowDownToLine className="w-3 h-3" />
                    <span>包含的子 Block ({children.length})</span>
                  </div>
                  <span className="text-[10px] text-[#8f959e] dark:text-[#6b7280] font-normal">
                    支持在内部折叠或移出到画布
                  </span>
                </div>
                <div className="space-y-2 border-l-2 border-[#3370ff]/40 dark:border-[#4b85ff]/40 pl-2.5 my-1">
                  {children.map((child) => renderBlockTree(child, depth + 1))}
                </div>
              </div>
            )}
          </div>
        </div>

        {depth === 0 && !block.collapsed && (
          <>
            {/* 右边缘宽度拉伸 */}
            <div
              className="absolute right-0 top-0 bottom-3 w-2.5 cursor-ew-resize opacity-0 group-hover/block:opacity-100 transition-opacity hover:bg-blue-400/40 rounded-r-lg z-10"
              onMouseDown={(e) => startResizeBlock(block.id, 'ew', e)}
              title="左右拉伸宽度"
            />
            {/* 下边缘高度拉伸 */}
            <div
              className="absolute left-0 right-3 bottom-0 h-2.5 cursor-ns-resize opacity-0 group-hover/block:opacity-100 transition-opacity hover:bg-blue-400/40 rounded-b-lg z-10"
              onMouseDown={(e) => startResizeBlock(block.id, 'ns', e)}
              title="上下拉伸高度"
            />
            {/* 右下角对角线双向拉伸 */}
            <div
              className="absolute right-0 bottom-0 w-3.5 h-3.5 cursor-nwse-resize opacity-0 group-hover/block:opacity-100 transition-opacity hover:bg-blue-500 rounded-br-lg z-20"
              onMouseDown={(e) => startResizeBlock(block.id, 'nwse', e)}
              title="自由拉伸尺寸"
            />
          </>
        )}
      </div>
    );
  }, [sortedBlocks, selectedIds, childCountMap, updateBlock, startDragBlock, handleSelect, handleOpenAIMenu, linkMode, linkSource, startResizeBlock, tagWheelBlockId, tagWheelRect, handleAddTag, handleRemoveTag, outdentBlock, dropTargetId]);

  return (
    <div
      ref={canvasRef}
      className="flex-1 overflow-hidden relative cursor-crosshair bg-[#f7f8fa] dark:bg-[#141517]"
      style={{
        backgroundImage: 'radial-gradient(circle, rgba(143,149,158,0.22) 1px, transparent 1px)',
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
          className="fixed pointer-events-none z-50 border border-[#3370ff] bg-[#3370ff]/10 rounded-xs"
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
          transition: isNavigating ? 'transform 0.4s cubic-bezier(0.2, 0.9, 0.3, 1)' : 'none',
          width: '10000px',
          height: '10000px',
        }}
      >
        {/* 底层 SVG：渲染连线贝塞尔曲线与分组虚线框 (z-1) */}
        <svg
          className="absolute origin-top-left pointer-events-none"
          style={{
            width: '10000px',
            height: '10000px',
            zIndex: 1,
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
          {connectionLinks.map((link) => (
            <path
              key={`line-${link.id}`}
              d={link.path}
              fill="none"
              stroke="rgba(96,165,250,0.6)"
              strokeWidth="2"
              strokeDasharray="6 3"
              markerEnd="url(#linkArrow)"
            />
          ))}
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

        {/* 中间层：Block 卡片树渲染 (z-2) */}
        <div className="relative" style={{ zIndex: 2 }}>
          {visibleBlocks.filter((b) => !b.parentId).map((b) => renderBlockTree(b))}
        </div>

        {/* 顶层高优先级 SVG 覆盖层：渲染断开连接交互药丸 (z-30) - 彻底避免被任何 Block 卡片实体背景遮挡 */}
        <svg
          className="absolute origin-top-left pointer-events-none"
          style={{
            width: '10000px',
            height: '10000px',
            zIndex: 30,
          }}
        >
          {connectionLinks.map((link) => (
            <g
              key={`pill-${link.id}`}
              className="pointer-events-auto cursor-pointer group/linkpill"
              onClick={(e) => {
                e.stopPropagation();
                removeLink(link.fromId, link.toId);
              }}
            >
              <title>{`断开与「${link.targetTitle}」的关联`}</title>
              <rect
                x={link.midX - 32}
                y={link.midY - 12}
                width={64}
                height={24}
                rx={12}
                className="fill-white dark:fill-zinc-900 stroke-blue-500/80 group-hover/linkpill:stroke-red-500 group-hover/linkpill:fill-red-50 dark:group-hover/linkpill:fill-red-950/80 transition-all"
                strokeWidth={1.5}
                style={{
                  filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.18))',
                }}
              />
              <text
                x={link.midX}
                y={link.midY + 4}
                textAnchor="middle"
                className="text-[11px] font-medium fill-blue-600 dark:fill-blue-400 group-hover/linkpill:fill-red-600 dark:group-hover/linkpill:fill-red-400 font-sans select-none pointer-events-none transition-colors"
              >
                ✕ 断开
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* 缩略图导航 (Minimap 鹰眼) */}
      <CanvasMinimap
        blocks={blocks}
        pan={pan}
        zoom={zoom}
        onPanChange={setPan}
        containerRef={canvasRef}
      />

      <div data-ui-control className="absolute bottom-4 right-4 flex items-center gap-1.5 bg-white/95 dark:bg-[#1f2125]/95 backdrop-blur-md border border-[#dee0e3] dark:border-[#33363e] rounded-xl px-2.5 py-1.5 z-20 shadow-card">
        <button
          onClick={() => setZoom((z) => Math.max(0.3, Number((z - 0.1).toFixed(1))))}
          className="text-xs text-[#646a73] dark:text-[#9ca3af] hover:text-[#1f2329] dark:hover:text-[#f2f3f5] hover:bg-[#eff0f2] dark:hover:bg-[#282a30] w-6 h-6 rounded-md flex items-center justify-center transition-colors"
          title="缩小"
        >
          −
        </button>
        <span className="text-xs text-[#646a73] dark:text-[#9ca3af] font-medium w-10 text-center">{Math.round(zoom * 100)}%</span>
        <button
          onClick={() => setZoom((z) => Math.min(2, Number((z + 0.1).toFixed(1))))}
          className="text-xs text-[#646a73] dark:text-[#9ca3af] hover:text-[#1f2329] dark:hover:text-[#f2f3f5] hover:bg-[#eff0f2] dark:hover:bg-[#282a30] w-6 h-6 rounded-md flex items-center justify-center transition-colors"
          title="放大"
        >
          +
        </button>
        <div className="w-px h-3.5 bg-[#dee0e3] dark:bg-[#33363e] mx-0.5" />
        <button
          onClick={() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
          className="text-xs text-[#646a73] dark:text-[#9ca3af] hover:text-[#3370ff] dark:hover:text-[#4b85ff] hover:bg-[#eff0f2] dark:hover:bg-[#282a30] px-1.5 py-0.5 rounded-md transition-colors font-medium"
          title="重置为 100% 原始比例与原点"
        >
          重置
        </button>
      </div>

      <div data-ui-control className="absolute bottom-4 left-4 text-[11px] text-[#8f959e] dark:text-[#6b7280] z-20">
        右键空白处添加 Block · 滚轮上下平移 · Ctrl+滚轮缩放
      </div>

      <div data-ui-control className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white/95 dark:bg-[#1f2125]/95 backdrop-blur-md border border-[#dee0e3] dark:border-[#33363e] rounded-xl px-2 py-1 z-20 max-w-[calc(100vw-32px)] overflow-x-auto shadow-card">
        {([
          { type: 'text' as BlockType, label: '正文' },
          { type: 'todo' as BlockType, label: '待办' },
          { type: 'quote' as BlockType, label: '引用' },
          { type: 'toggle' as BlockType, label: '折叠' },
        ]).map(({ type, label }) => (
          <button
            key={type}
            onClick={() => addBlockAtCenter(type)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs text-[#1f2329] dark:text-[#f2f3f5] hover:text-[#3370ff] dark:hover:text-[#4b85ff] hover:bg-[#eff4ff] dark:hover:bg-blue-500/10 rounded-md transition-colors whitespace-nowrap font-medium"
            title={`添加 ${label}`}
          >
            <Plus className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
        <div className="w-px h-3.5 bg-[#dee0e3] dark:bg-[#33363e] mx-1 shrink-0" />
        <button
          onClick={openCommandMenuCentered}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-[#eff4ff] text-[#3370ff] dark:bg-blue-500/15 dark:text-[#4b85ff] hover:bg-[#e0ebff] dark:hover:bg-blue-500/25 rounded-md transition-colors whitespace-nowrap"
          title="打开多维组件库与分类搜索"
        >
          <Sparkles className="w-3.5 h-3.5" />
          更多组件
        </button>
      </div>

      {contextMenu && createPortal(
        <div
          data-ui-control
          className="fixed z-[100] bg-white dark:bg-[#1f2125] border border-[#dee0e3] dark:border-[#33363e] rounded-xl shadow-popover py-1.5 min-w-[190px] max-h-[75vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-100"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1 text-[11px] font-semibold text-[#8f959e] dark:text-[#6b7280] flex items-center justify-between border-b border-[#eff0f2] dark:border-[#2e3037] mb-1">
            <span>添加 Block</span>
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const targetX = Math.min(contextMenu.x, window.innerWidth - 330);
                const targetY = Math.min(contextMenu.y, window.innerHeight - 450);
                setCommandMenuPos({ top: Math.max(10, targetY), left: Math.max(10, targetX) });
                setContextMenu(null);
                setCommandMenuOpen(true);
              }}
              className="text-[10px] text-blue-500 hover:underline flex items-center gap-0.5"
            >
              <span>多维菜单</span>
            </button>
          </div>
          {BLOCK_CATEGORIES.map((cat) => (
            <div key={cat.id} className="py-0.5">
              <div className="px-3 py-0.5 text-[9px] font-bold text-gray-400/80 dark:text-zinc-500 uppercase tracking-wider">
                {cat.title}
              </div>
              {cat.items.map((item) => (
                <button
                  key={item.type}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    addBlockAtPosition(item.type, contextMenu.x, contextMenu.y);
                  }}
                  className="w-full text-left px-3 py-1 text-xs text-gray-800 dark:text-zinc-200 hover:bg-blue-50 dark:hover:bg-zinc-700/80 hover:text-blue-600 dark:hover:text-blue-300 transition-colors flex items-center justify-between group"
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <Plus className="w-3 h-3 text-gray-400 group-hover:text-blue-500 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {item.badge && (
                    <span className="px-1 text-[8px] rounded bg-blue-500 text-white font-medium shrink-0 ml-1">
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ))}
          <div className="border-t border-gray-200 dark:border-zinc-700 my-1" />
          <div className="px-3 py-1 text-[11px] text-gray-500 dark:text-zinc-400 border-b border-gray-200 dark:border-zinc-700 mb-1">AI 操作</div>
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
          {contextTargetId && (
            <>
              <div className="border-t border-gray-200 dark:border-zinc-700 my-1" />
              <div className="px-3 py-1 text-[11px] text-gray-500 dark:text-zinc-400 border-b border-gray-200 dark:border-zinc-700 mb-1">Block 操作</div>
              {selectedIds.length > 0 && selectedIds.some((id) => id !== contextTargetId) && (
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
              )}
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (selectedIds.includes(contextTargetId)) {
                    selectedIds.forEach((id) => deleteBlock(id));
                  } else {
                    deleteBlock(contextTargetId);
                  }
                  clearSelection();
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-3 h-3" />
                删除 Block (Del)
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
        position={commandMenuPos}
      />

      {aiResults.length > 0 && createPortal(
        <div data-ui-control className="fixed bottom-20 right-4 z-50 space-y-2 max-w-sm max-h-[60vh] overflow-y-auto">
          {aiResults.map((result) => (
            <AIResultCard
              key={result.id}
              result={result.result}
              blockId={result.blockId}
              loading={result.loading}
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
        <div data-ui-control className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2.5 px-4 py-2 bg-white/95 dark:bg-[#1f2125]/95 backdrop-blur-md border border-[#dee0e3] dark:border-[#33363e] rounded-full shadow-popover z-40 animate-slide-up text-[#1f2329] dark:text-[#f2f3f5]">
          <span className="text-xs text-[#646a73] dark:text-[#9ca3af] font-medium px-1">已选 {selectedIds.length} 项</span>
          <div className="w-px h-3.5 bg-[#dee0e3] dark:bg-[#33363e]" />
          <button
            onClick={() => {
              selectedIds.forEach((id) => duplicateBlock(id));
              clearSelection();
            }}
            className="flex items-center gap-1.5 px-3 py-1 text-xs bg-[#eff0f2] dark:bg-[#282a30] text-[#1f2329] dark:text-[#f2f3f5] hover:bg-[#dee0e3] dark:hover:bg-[#33363e] rounded-full transition-colors font-medium"
          >
            <CopyPlus className="w-3 h-3 text-[#646a73]" />
            复制
          </button>
          <div className="w-px h-3.5 bg-[#dee0e3] dark:bg-[#33363e]" />
          {selectedIds.length >= 2 && (
            <>
              <button
                onClick={() => {
                  groupBlocks(selectedIds);
                  clearSelection();
                }}
                className="flex items-center gap-1.5 px-3 py-1 text-xs bg-[#f7f4ff] text-[#8a73df] hover:bg-[#eeebff] dark:bg-purple-950/30 dark:hover:bg-purple-900/40 rounded-full transition-colors font-medium"
              >
                <Group className="w-3 h-3" />
                组合
              </button>
              <div className="w-px h-3.5 bg-[#dee0e3] dark:bg-[#33363e]" />
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
                className="flex items-center gap-1.5 px-3 py-1 text-xs bg-[#f7f4ff] text-[#8a73df] hover:bg-[#eeebff] dark:bg-purple-950/30 dark:hover:bg-purple-900/40 rounded-full transition-colors font-medium"
              >
                <Ungroup className="w-3 h-3" />
                取消组合 ({groupMembers.length})
              </button>
                  <div className="w-px h-3.5 bg-[#dee0e3] dark:bg-[#33363e]" />
                </>
              );
            }
            return null;
          })()}
          <button
              onClick={handleStartLink}
              className="flex items-center gap-1.5 px-3 py-1 text-xs bg-[#eff4ff] text-[#3370ff] hover:bg-[#e0ebff] dark:bg-blue-500/15 dark:hover:bg-blue-500/25 rounded-full transition-colors font-medium"
            >
              <Link2 className="w-3 h-3" />
              创建链接
            </button>
            <div className="w-px h-3.5 bg-[#dee0e3] dark:bg-[#33363e]" />
            {selectedIds.some((id) => blocks.find((b) => b.id === id)?.parentId) ? (
              <button
                onClick={() => {
                  selectedIds.forEach((id) => outdentBlock(id));
                }}
                className="flex items-center gap-1.5 px-3 py-1 text-xs bg-[#fef3e6] text-[#e37318] hover:bg-[#fde8cf] dark:bg-amber-950/30 dark:hover:bg-amber-900/40 rounded-full transition-colors font-medium"
                title="移出子 Block（提升为画布独立 Block）"
              >
                <ArrowUpFromLine className="w-3 h-3" />
                移出子 Block
              </button>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setShowParentPicker(!showParentPicker)}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs bg-[#eff0f2] dark:bg-[#282a30] text-[#1f2329] dark:text-[#f2f3f5] hover:bg-[#dee0e3] dark:hover:bg-[#33363e] rounded-full transition-colors font-medium"
                >
                  <ArrowDownToLine className="w-3 h-3 text-[#646a73]" />
                  设为子 Block
                </button>
                {showParentPicker && (
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-56 max-h-48 overflow-y-auto bg-white dark:bg-[#1f2125] border border-[#dee0e3] dark:border-[#33363e] rounded-xl shadow-popover py-1">
                    <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#eff0f2] dark:border-[#2e3037]">
                      <span className="text-[11px] text-[#8f959e] dark:text-[#6b7280]">选择父 Block</span>
                      <button onClick={() => setShowParentPicker(false)} className="text-[#8f959e] hover:text-[#1f2329] dark:hover:text-[#f2f3f5]">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    {selectableParents.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-[#8f959e] dark:text-[#6b7280]">没有可选的 Block</div>
                    ) : (
                      selectableParents.map((b) => (
                        <button
                          key={b.id}
                          onClick={() => handleSetAsChild(b.id)}
                          className="w-full text-left px-3 py-1.5 text-xs text-[#1f2329] dark:text-[#f2f3f5] hover:bg-[#eff4ff] dark:hover:bg-blue-500/10 hover:text-[#3370ff] dark:hover:text-[#4b85ff] transition-colors truncate font-medium"
                        >
                          {b.title || '未命名 Block'}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
            <div className="w-px h-3.5 bg-[#dee0e3] dark:bg-[#33363e]" />
            <button
              onClick={() => {
                selectedIds.forEach((id) => deleteBlock(id));
                clearSelection();
              }}
              className="flex items-center gap-1.5 px-3 py-1 text-xs bg-[#fff5f4] text-[#d64b42] hover:bg-[#ffeceb] dark:bg-rose-950/30 dark:hover:bg-rose-900/40 rounded-full transition-colors font-medium"
              title="删除选中的 Block (快捷键 Delete / Backspace)"
            >
              <Trash2 className="w-3 h-3" />
              删除
            </button>
          </div>
      )}

      {linkMode && (
        <div data-ui-control className="fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-2.5 bg-blue-600/90 backdrop-blur-xl text-white text-sm rounded-full shadow-2xl shadow-black/50 z-40 animate-slide-up flex items-center gap-3">
          <span>🔗 正在建立链接：请点击任意目标 Block</span>
          <button
            onClick={() => { setLinkMode(false); setLinkSource(null); }}
            className="px-2 py-0.5 rounded-full bg-white/20 hover:bg-white/30 text-xs transition-colors"
          >
            取消 (ESC)
          </button>
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
