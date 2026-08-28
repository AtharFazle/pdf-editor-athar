import React, { useState, useRef } from 'react';
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
  const tempCanvasRef = useRef<HTMLCanvasElement>(null);
  const pointsRef = useRef<{ x: number; y: number }[]>([]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget && (e.target as HTMLElement).tagName !== 'CANVAS') {
      return;
    }

    if (activeTool === 'pencil') {
      setIsDrawingPencil(true);
      const rect = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX - rect.left) / scale;
      const y = (e.clientY - rect.top) / scale;
      pointsRef.current = [{ x, y }];
      redrawTempCanvas();
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawingPencil || activeTool !== 'pencil') return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    pointsRef.current.push({ x, y });
    redrawTempCanvas();
  };

  const redrawTempCanvas = () => {
    const canvas = tempCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const points = pointsRef.current;
    if (points.length === 0) return;

    ctx.strokeStyle = pencilColor;
    ctx.lineWidth = pencilWidth * scale;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
      const ptX = points[i].x * scale;
      const ptY = points[i].y * scale;
      if (i === 0) ctx.moveTo(ptX, ptY);
      else ctx.lineTo(ptX, ptY);
    }
    ctx.stroke();
  };

  const handleMouseUp = () => {
    if (!isDrawingPencil || activeTool !== 'pencil') return;

    const points = pointsRef.current;
    if (points.length < 2) {
      setIsDrawingPencil(false);
      pointsRef.current = [];
      clearTempCanvas();
      return;
    }

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    for (const pt of points) {
      if (pt.x < minX) minX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y > maxY) maxY = pt.y;
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

      ctx.beginPath();
      for (let i = 0; i < points.length; i++) {
        const ptX = points[i].x - minX;
        const ptY = points[i].y - minY;
        if (i === 0) ctx.moveTo(ptX, ptY);
        else ctx.lineTo(ptX, ptY);
      }
      ctx.stroke();

      const dataUrl = offscreen.toDataURL('image/png');
      onAddPencilElement(pageIndex, minX, minY, width, height, dataUrl);
    }

    setIsDrawingPencil(false);
    pointsRef.current = [];
    clearTempCanvas();
  };

  const clearTempCanvas = () => {
    const canvas = tempCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
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
