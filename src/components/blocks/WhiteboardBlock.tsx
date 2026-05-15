'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Pencil, Eraser, Trash2, Download, Palette, Minus, Plus } from 'lucide-react';

interface WhiteboardBlockProps {
  content: string;
  onChange: (content: string) => void;
  readOnly?: boolean;
}

const COLORS = ['#ffffff', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#000000'];

export default function WhiteboardBlock({ content, onChange, readOnly }: WhiteboardBlockProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#3b82f6');
  const [brushSize, setBrushSize] = useState(3);
  const [isEraser, setIsEraser] = useState(false);
  const [hasDrawing, setHasDrawing] = useState(!!content);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = 320 * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = '320px';

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (content) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, 320);
      };
      img.src = content;
    } else {
      ctx.fillStyle = '#18181b';
      ctx.fillRect(0, 0, rect.width, 320);
    }
  }, [content]);

  useEffect(() => {
    initCanvas();
  }, [initCanvas]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (readOnly) return;
    setIsDrawing(true);
    const { x, y } = getPos(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || readOnly) return;
    const { x, y } = getPos(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    ctx.lineWidth = isEraser ? brushSize * 3 : brushSize;
    ctx.strokeStyle = isEraser ? '#18181b' : color;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDraw = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onChange(dataUrl);
    setHasDrawing(true);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#18181b';
    ctx.fillRect(0, 0, container.getBoundingClientRect().width, 320);
    onChange('');
    setHasDrawing(false);
  };

  const downloadImage = () => {
    if (!content) return;
    const link = document.createElement('a');
    link.download = `whiteboard-${Date.now()}.png`;
    link.href = content;
    link.click();
  };

  return (
    <div className="w-full">
      {!readOnly && (
        <div className="flex items-center gap-2 px-3 py-2 mb-2 flex-wrap border-b border-gray-200 dark:border-zinc-800/60">
          <div className="flex items-center gap-1">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => { setColor(c); setIsEraser(false); }}
                className={`w-4 h-4 rounded-full border transition-all ${
                  color === c && !isEraser ? 'border-gray-400 dark:border-zinc-400 scale-110' : 'border-transparent hover:border-gray-400 dark:hover:border-zinc-600'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="w-px h-4 bg-gray-300/50 dark:bg-zinc-700/50" />
          <button
            onClick={() => setIsEraser(false)}
            className={`p-1.5 rounded-lg transition-colors ${!isEraser ? 'bg-blue-500/20 text-blue-400' : 'text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 hover:bg-gray-100/60 dark:hover:bg-zinc-800/60'}`}
            title="画笔"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsEraser(true)}
            className={`p-1.5 rounded-lg transition-colors ${isEraser ? 'bg-blue-500/20 text-blue-400' : 'text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 hover:bg-gray-100/60 dark:hover:bg-zinc-800/60'}`}
            title="橡皮擦"
          >
            <Eraser className="w-3.5 h-3.5" />
          </button>
          <div className="flex items-center gap-1">
            <button onClick={() => setBrushSize(Math.max(1, brushSize - 1))} className="p-0.5 text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300">
              <Minus className="w-3 h-3" />
            </button>
            <span className="text-[10px] text-gray-500 dark:text-zinc-500 w-4 text-center">{brushSize}</span>
            <button onClick={() => setBrushSize(Math.min(20, brushSize + 1))} className="p-0.5 text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300">
              <Plus className="w-3 h-3" />
            </button>
          </div>
          <div className="w-px h-4 bg-gray-300/50 dark:bg-zinc-700/50" />
          <button onClick={clearCanvas} className="p-1.5 text-gray-500 dark:text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="清空">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          {hasDrawing && (
            <button onClick={downloadImage} className="p-1.5 text-gray-500 dark:text-zinc-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors" title="下载">
              <Download className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
      <div ref={containerRef} className="w-full rounded-lg overflow-hidden border border-zinc-800">
        <canvas
          ref={canvasRef}
          className={`w-full ${readOnly ? 'cursor-default' : 'cursor-crosshair'}`}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
      </div>
    </div>
  );
}
