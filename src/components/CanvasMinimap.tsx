'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Map, Crosshair, ChevronDown, ChevronUp, Eye } from 'lucide-react';
import type { Block } from '@/types/block';

interface CanvasMinimapProps {
  blocks: Block[];
  pan: { x: number; y: number };
  zoom: number;
  onPanChange: (pan: { x: number; y: number }) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

const BLOCK_TYPE_COLORS: Record<string, { bg: string; border: string }> = {
  text: { bg: 'bg-blue-500/40', border: 'border-blue-500/60' },
  todo: { bg: 'bg-emerald-500/40', border: 'border-emerald-500/60' },
  code: { bg: 'bg-amber-500/40', border: 'border-amber-500/60' },
  table: { bg: 'bg-purple-500/40', border: 'border-purple-500/60' },
  media: { bg: 'bg-pink-500/40', border: 'border-pink-500/60' },
  whiteboard: { bg: 'bg-rose-500/40', border: 'border-rose-500/60' },
  mindmap: { bg: 'bg-cyan-500/40', border: 'border-cyan-500/60' },
  math: { bg: 'bg-indigo-500/40', border: 'border-indigo-500/60' },
};

export default function CanvasMinimap({
  blocks,
  pan,
  zoom,
  onPanChange,
  containerRef,
}: CanvasMinimapProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const MAP_W = 210;
  const MAP_H = 135;

  // 计算全局所有 Block 的包围盒
  const boundingBox = useMemo(() => {
    if (blocks.length === 0) {
      return { minX: 0, maxX: 1000, minY: 0, maxY: 1000, width: 1000, height: 1000 };
    }
    const minX = Math.min(...blocks.map((b) => b.x), 0);
    const maxX = Math.max(...blocks.map((b) => b.x + (b.width || 760)), 1000);
    const minY = Math.min(...blocks.map((b) => b.y), 0);
    const maxY = Math.max(...blocks.map((b) => b.y + (b.height || 260)), 1200);

    const pad = 120;
    const boxX = minX - pad;
    const boxY = minY - pad;
    const boxW = Math.max(700, (maxX - minX) + pad * 2);
    const boxH = Math.max(500, (maxY - minY) + pad * 2);

    return { minX: boxX, maxX: boxX + boxW, minY: boxY, maxY: boxY + boxH, width: boxW, height: boxH };
  }, [blocks]);

  // 缩放比例与居中偏移
  const scale = useMemo(() => {
    return Math.min(MAP_W / boundingBox.width, MAP_H / boundingBox.height);
  }, [boundingBox, MAP_W, MAP_H]);

  const offsetX = (MAP_W - boundingBox.width * scale) / 2;
  const offsetY = (MAP_H - boundingBox.height * scale) / 2;

  const worldToMini = useCallback((wx: number, wy: number) => {
    return {
      x: offsetX + (wx - boundingBox.minX) * scale,
      y: offsetY + (wy - boundingBox.minY) * scale,
    };
  }, [offsetX, offsetY, boundingBox.minX, boundingBox.minY, scale]);

  const miniToWorld = useCallback((mx: number, my: number) => {
    return {
      x: boundingBox.minX + (mx - offsetX) / scale,
      y: boundingBox.minY + (my - offsetY) / scale,
    };
  }, [offsetX, offsetY, boundingBox.minX, boundingBox.minY, scale]);

  // 视口在缩略图中的映射
  const containerW = containerRef.current?.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 1200);
  const containerH = containerRef.current?.clientHeight || (typeof window !== 'undefined' ? window.innerHeight : 800);

  const viewWorldX = -pan.x / zoom;
  const viewWorldY = -pan.y / zoom;
  const viewWorldW = containerW / zoom;
  const viewWorldH = containerH / zoom;

  const viewMini = worldToMini(viewWorldX, viewWorldY);
  const viewMiniW = Math.max(14, viewWorldW * scale);
  const viewMiniH = Math.max(12, viewWorldH * scale);

  // 点击缩略图空白处，快速定位居中视口
  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mapRef.current) return;
    const rect = mapRef.current.getBoundingClientRect();
    const clickMx = e.clientX - rect.left;
    const clickMy = e.clientY - rect.top;

    const targetWorld = miniToWorld(clickMx, clickMy);
    const newPanX = -(targetWorld.x - viewWorldW / 2) * zoom;
    const newPanY = -(targetWorld.y - viewWorldH / 2) * zoom;
    onPanChange({ x: Math.round(newPanX), y: Math.round(newPanY) });
  };

  // 开始拖拽视口小框
  const handleIndicatorMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaMx = e.clientX - dragStartRef.current.x;
      const deltaMy = e.clientY - dragStartRef.current.y;

      const deltaWx = deltaMx / scale;
      const deltaWy = deltaMy / scale;

      onPanChange({
        x: Math.round(dragStartRef.current.panX - deltaWx * zoom),
        y: Math.round(dragStartRef.current.panY - deltaWy * zoom),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, scale, zoom, onPanChange]);

  // 一键居中全览
  const handleCenterAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    const blocksCenterX = (boundingBox.minX + boundingBox.maxX) / 2;
    const newPanX = containerW / 2 - blocksCenterX * zoom;
    const newPanY = Math.max(40, 50 - boundingBox.minY * zoom);
    onPanChange({ x: Math.round(newPanX), y: Math.round(newPanY) });
  };

  if (isCollapsed) {
    return (
      <div data-ui-control className="absolute bottom-16 right-4 z-20">
        <button
          onClick={() => setIsCollapsed(false)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-md border border-gray-300 dark:border-zinc-700 rounded-lg shadow-md text-xs font-medium text-gray-700 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
          title="展开鹰眼缩略导航"
        >
          <Map className="w-3.5 h-3.5 text-blue-500" />
          <span>鹰眼导航</span>
        </button>
      </div>
    );
  }

  return (
    <div
      data-ui-control
      className="absolute bottom-16 right-4 z-20 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-gray-300 dark:border-zinc-700 rounded-xl shadow-xl p-2 select-none transition-all"
      style={{ width: MAP_W + 16 }}
    >
      {/* 顶栏控件 */}
      <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-gray-200 dark:border-zinc-800 text-[11px]">
        <div className="flex items-center gap-1 font-semibold text-gray-700 dark:text-zinc-300">
          <Map className="w-3.5 h-3.5 text-blue-500" />
          <span>鹰眼导航</span>
          <span className="text-[10px] text-gray-400 font-normal">({blocks.length} 块)</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCenterAll}
            className="p-1 text-gray-500 dark:text-zinc-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded transition-colors"
            title="居中全览"
          >
            <Crosshair className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-1 text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded transition-colors"
            title="收起小地图"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 缩略图画布区域 */}
      <div
        ref={mapRef}
        onClick={handleMapClick}
        className="relative bg-gray-50/80 dark:bg-zinc-950/80 border border-gray-200 dark:border-zinc-800/80 rounded-lg overflow-hidden cursor-crosshair shadow-inner"
        style={{ width: MAP_W, height: MAP_H }}
      >
        {/* 背景轻量网格 */}
        <div
          className="absolute inset-0 opacity-15 dark:opacity-20 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
            backgroundSize: '12px 12px',
          }}
        />

        {/* 渲染所有 Block 的微型缩略图 */}
        {blocks.map((b) => {
          const miniPos = worldToMini(b.x, b.y);
          const miniW = Math.max(6, (b.width || 760) * scale);
          const miniH = Math.max(4, (b.height || 200) * scale);
          const colors = BLOCK_TYPE_COLORS[b.type] || BLOCK_TYPE_COLORS.text;

          return (
            <div
              key={b.id}
              className={`absolute rounded-sm border ${colors.bg} ${colors.border} transition-opacity pointer-events-none`}
              style={{
                left: miniPos.x,
                top: miniPos.y,
                width: miniW,
                height: miniH,
              }}
              title={b.title || `Block (${b.type})`}
            />
          );
        })}

        {/* 可视区域红/蓝线小视口框（可拖拽漫游各个角落） */}
        <div
          onMouseDown={handleIndicatorMouseDown}
          className={`absolute border-2 border-blue-500 dark:border-blue-400 bg-blue-500/20 dark:bg-blue-400/20 rounded shadow-md cursor-grab active:cursor-grabbing transition-shadow ${
            isDragging ? '!cursor-grabbing ring-2 ring-blue-400/50' : 'hover:bg-blue-500/25'
          }`}
          style={{
            left: viewMini.x,
            top: viewMini.y,
            width: viewMiniW,
            height: viewMiniH,
          }}
          title="当前屏幕视口（按住拖拽漫游）"
        >
          {/* 中心微十字准星 */}
          <div className="absolute inset-0 flex items-center justify-center opacity-60 pointer-events-none">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          </div>
        </div>
      </div>

      <div className="text-[10px] text-gray-400 dark:text-zinc-500 text-center pt-1.5">
        拖动视口框漫游 · 点击空白快速定位
      </div>
    </div>
  );
}
