import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Check, X, Eraser } from 'lucide-react';
import type { PdfElement, PageDimensions, ActiveTool } from '../types/pdf';
import { TransformableElement } from './TransformableElement';

interface EditorOverlayProps {
  pageIndex: number;
  dimensions: PageDimensions;
  scale: number;
  elements: PdfElement[];
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  activeTool: ActiveTool;
  pencilColor: string;
  pencilWidth: number;
  onAddTextAtPosition: (pageIndex: number, x: number, y: number) => void;
  onAddPencilElement: (
    pageIndex: number,
    x: number,
    y: number,
    width: number,
    height: number,
    dataUrl: string
  ) => void;
  onUpdateElement: (element: PdfElement) => void;
  onDeleteElement: (id: string) => void;
  onDuplicateElement: (element: PdfElement) => void;
}

export const EditorOverlay: React.FC<EditorOverlayProps> = ({
  pageIndex,
  dimensions,
  scale,
  elements,
  selectedElementId,
  onSelectElement,
  activeTool,
  pencilColor,
  pencilWidth,
  onAddTextAtPosition,
  onAddPencilElement,
  onUpdateElement,
  onDeleteElement,
  onDuplicateElement,
}) => {
  const domWidth = dimensions.width * scale;
  const domHeight = dimensions.height * scale;

  const [isDrawingPencil, setIsDrawingPencil] = useState(false);
  const [strokeCount, setStrokeCount] = useState<number>(0);
  const tempCanvasRef = useRef<HTMLCanvasElement>(null);

  // Store multiple strokes drawn in a single session
  const allStrokesRef = useRef<{ x: number; y: number }[][]>([]);
  const currentStrokeRef = useRef<{ x: number; y: number }[]>([]);

  const redrawTempCanvas = useCallback(() => {
    const canvas = tempCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const allStrokes = [...allStrokesRef.current];
    if (currentStrokeRef.current.length > 0) {
      allStrokes.push(currentStrokeRef.current);
    }

    if (allStrokes.length === 0) return;

    ctx.strokeStyle = pencilColor;
    ctx.lineWidth = pencilWidth * scale;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const stroke of allStrokes) {
      if (stroke.length === 0) continue;
      ctx.beginPath();
      for (let i = 0; i < stroke.length; i++) {
        const ptX = stroke[i].x * scale;
        const ptY = stroke[i].y * scale;
        if (i === 0) ctx.moveTo(ptX, ptY);
        else ctx.lineTo(ptX, ptY);
      }
      ctx.stroke();
    }
  }, [pencilColor, pencilWidth, scale]);

  const clearTempCanvas = useCallback(() => {
    const canvas = tempCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  const cancelPencilDrawing = useCallback(() => {
    allStrokesRef.current = [];
    currentStrokeRef.current = [];
    setStrokeCount(0);
    clearTempCanvas();
  }, [clearTempCanvas]);

  const finalizePencilDrawing = useCallback(() => {
    const allStrokes = [...allStrokesRef.current];
    if (currentStrokeRef.current.length > 0) {
      allStrokes.push(currentStrokeRef.current);
    }

    if (allStrokes.length === 0) {
      cancelPencilDrawing();
      return;
    }

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    for (const stroke of allStrokes) {
      for (const pt of stroke) {
        if (pt.x < minX) minX = pt.x;
        if (pt.y < minY) minY = pt.y;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.y > maxY) maxY = pt.y;
      }
    }

    const pad = pencilWidth + 4;
    minX = Math.max(0, minX - pad);
    minY = Math.max(0, minY - pad);
    maxX = Math.min(dimensions.width, maxX + pad);
    maxY = Math.min(dimensions.height, maxY + pad);

    const width = Math.max(15, maxX - minX);
    const height = Math.max(15, maxY - minY);

    const offscreen = document.createElement('canvas');
    offscreen.width = width * 2;
    offscreen.height = height * 2;
    const ctx = offscreen.getContext('2d');

    if (ctx) {
      ctx.scale(2, 2);
      ctx.strokeStyle = pencilColor;
      ctx.lineWidth = pencilWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (const stroke of allStrokes) {
        if (stroke.length === 0) continue;
        ctx.beginPath();
        for (let i = 0; i < stroke.length; i++) {
          const ptX = stroke[i].x - minX;
          const ptY = stroke[i].y - minY;
          if (i === 0) ctx.moveTo(ptX, ptY);
          else ctx.lineTo(ptX, ptY);
        }
        ctx.stroke();
      }

      const dataUrl = offscreen.toDataURL('image/png');
      onAddPencilElement(pageIndex, minX, minY, width, height, dataUrl);
    }

    allStrokesRef.current = [];
    currentStrokeRef.current = [];
    setStrokeCount(0);
    clearTempCanvas();
  }, [cancelPencilDrawing, clearTempCanvas, dimensions.height, dimensions.width, onAddPencilElement, pageIndex, pencilColor, pencilWidth]);

  // Listen for Enter key to finalize pencil drawing when active
  useEffect(() => {
    if (activeTool !== 'pencil') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        finalizePencilDrawing();
      } else if (e.key === 'Escape') {
        cancelPencilDrawing();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTool, finalizePencilDrawing, cancelPencilDrawing]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget && (e.target as HTMLElement).tagName !== 'CANVAS') {
      return;
    }

    if (activeTool === 'pencil') {
      setIsDrawingPencil(true);
      const rect = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX - rect.left) / scale;
      const y = (e.clientY - rect.top) / scale;
      currentStrokeRef.current = [{ x, y }];
      redrawTempCanvas();
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawingPencil || activeTool !== 'pencil') return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    currentStrokeRef.current.push({ x, y });
    redrawTempCanvas();
  };

  const handleMouseUp = () => {
    if (!isDrawingPencil || activeTool !== 'pencil') return;

    if (currentStrokeRef.current.length > 1) {
      allStrokesRef.current.push(currentStrokeRef.current);
      setStrokeCount(allStrokesRef.current.length);
    }
    currentStrokeRef.current = [];
    setIsDrawingPencil(false);
    redrawTempCanvas();
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget && (e.target as HTMLElement).tagName !== 'CANVAS') {
      return;
    }

    if (activeTool === 'text') {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickDomX = e.clientX - rect.left;
      const clickDomY = e.clientY - rect.top;

      const pdfX = clickDomX / scale;
      const pdfY = clickDomY / scale;

      onAddTextAtPosition(pageIndex, pdfX, pdfY);
    } else if (activeTool === 'select') {
      onSelectElement(null);
    }
  };

  const pageElements = elements.filter((el) => el.pageIndex === pageIndex);

  return (
    <div
      onClick={handleOverlayClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{
        width: `${domWidth}px`,
        height: `${domHeight}px`,
      }}
      className={`absolute inset-0 pointer-events-auto ${
        activeTool === 'text'
          ? 'cursor-text'
          : activeTool === 'pencil'
          ? 'cursor-crosshair'
          : 'cursor-default'
      }`}
    >
      {/* Temporary Drawing Canvas Layer */}
      <canvas
        ref={tempCanvasRef}
        width={domWidth}
        height={domHeight}
        className="absolute inset-0 pointer-events-none z-20"
      />

      {/* Floating UX Bar for Pencil Mode */}
      {activeTool === 'pencil' && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-md border border-slate-700/90 px-3.5 py-2 rounded-2xl shadow-2xl z-50 flex items-center gap-3 text-xs text-white"
        >
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="font-semibold text-slate-200">
              Mode Pensil / Brush ({strokeCount} Coretan)
            </span>
          </div>

          <div className="h-4 w-[1px] bg-slate-700 mx-1" />

          {strokeCount > 0 && (
            <button
              onClick={cancelPencilDrawing}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Hapus coretan saat ini"
            >
              <Eraser className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}

          <button
            onClick={cancelPencilDrawing}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Batal Mode Pensil (Esc)"
          >
            <X className="w-4 h-4" />
          </button>

          <button
            onClick={finalizePencilDrawing}
            disabled={strokeCount === 0}
            className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-lg shadow-md shadow-emerald-600/25 transition-all disabled:opacity-40"
            title="Selesaikan Coretan (Tekan Enter)"
          >
            <Check className="w-4 h-4" />
            <span>Selesai (Enter)</span>
          </button>
        </div>
      )}

      {pageElements.map((element) => (
        <TransformableElement
          key={element.id}
          element={element}
          scale={scale}
          isSelected={element.id === selectedElementId}
          onSelect={(e) => {
            e.stopPropagation();
            onSelectElement(element.id);
          }}
          onChange={onUpdateElement}
          onDelete={() => onDeleteElement(element.id)}
          onDuplicate={() => onDuplicateElement(element)}
        />
      ))}
    </div>
  );
};
