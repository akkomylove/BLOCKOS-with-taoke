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
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <div className="flex items-center gap-1">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => { setColor(c); setIsEraser(false); }}
                className={`w-5 h-5 rounded-full border-2 transition-all ${
                  color === c && !isEraser ? 'border-white scale-110' : 'border-transparent'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="w-px h-4 bg-zinc-700" />
          <button
            onClick={() => setIsEraser(false)}
            className={`p-1 rounded ${!isEraser ? 'bg-zinc-700 text-blue-400' : 'text-zinc-500 hover:text-zinc-300'}`}
            title="画笔"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsEraser(true)}
            className={`p-1 rounded ${isEraser ? 'bg-zinc-700 text-blue-400' : 'text-zinc-500 hover:text-zinc-300'}`}
            title="橡皮擦"
          >
            <Eraser className="w-3.5 h-3.5" />
          </button>
          <div className="flex items-center gap-1">
            <button onClick={() => setBrushSize(Math.max(1, brushSize - 1))} className="p-0.5 text-zinc-500 hover:text-zinc-300">
              <Minus className="w-3 h-3" />
            </button>
            <span className="text-[10px] text-zinc-500 w-4 text-center">{brushSize}</span>
            <button onClick={() => setBrushSize(Math.min(20, brushSize + 1))} className="p-0.5 text-zinc-500 hover:text-zinc-300">
              <Plus className="w-3 h-3" />
            </button>
          </div>
          <div className="w-px h-4 bg-zinc-700" />
          <button onClick={clearCanvas} className="p-1 text-zinc-500 hover:text-red-400" title="清空">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          {hasDrawing && (
            <button onClick={downloadImage} className="p-1 text-zinc-500 hover:text-emerald-400" title="下载">
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
