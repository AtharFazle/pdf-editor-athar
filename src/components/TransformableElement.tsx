import React, { useState, useRef, useEffect } from 'react';
import {
  Trash2,
  Copy,
  RotateCw,
  Bold,
  Italic,
  AArrowUp,
  AArrowDown,
} from 'lucide-react';
import type { PdfElement, TextElement } from '../types/pdf';

interface TransformableElementProps {
  element: PdfElement;
  scale: number;
  isSelected: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onChange: (updatedElement: PdfElement) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

const COLOR_PRESETS = [
  '#000000',
  '#1e293b',
  '#dc2626',
  '#2563eb',
  '#16a34a',
  '#d97706',
  '#7c3aed',
  '#ffffff',
];

const getFontCss = (fontFamily: string): string => {
  switch (fontFamily) {
    case 'Times-Roman':
      return "'Times New Roman', Times, serif";
    case 'Courier':
      return "'Courier New', Courier, monospace";
    case 'Roboto':
      return "'Roboto', sans-serif";
    case 'Montserrat':
      return "'Montserrat', sans-serif";
    case 'Dancing Script':
      return "'Dancing Script', cursive";
    case 'Helvetica':
    default:
      return "'Helvetica Neue', Helvetica, Arial, sans-serif";
  }
};

export const TransformableElement: React.FC<TransformableElementProps> = ({
  element,
  scale,
  isSelected,
  onSelect,
  onChange,
  onDelete,
  onDuplicate,
}) => {
  const [isEditingText, setIsEditingText] = useState(false);
  const textInputRef = useRef<HTMLTextAreaElement>(null);
  const elementRef = useRef<HTMLDivElement>(null);

  // Scaled DOM dimensions
  const domX = element.x * scale;
  const domY = element.y * scale;
  const domW = element.width * scale;
  const domH = element.height * scale;

  useEffect(() => {
    if (isEditingText && textInputRef.current) {
      textInputRef.current.focus();
      textInputRef.current.select();
    }
  }, [isEditingText]);

  // --- DRAGGING ---
  const handleDragStart = (e: React.MouseEvent) => {
    if (isEditingText) return;
    e.stopPropagation();
    onSelect(e);

    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const startX = element.x;
    const startY = element.y;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = (moveEvent.clientX - startClientX) / scale;
      const dy = (moveEvent.clientY - startClientY) / scale;
      onChange({
        ...element,
        x: Math.max(0, startX + dx),
        y: Math.max(0, startY + dy),
      });
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // --- RESIZING ---
  const handleResizeStart = (e: React.MouseEvent, handle: string) => {
    e.stopPropagation();
    e.preventDefault();

    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const startX = element.x;
    const startY = element.y;
    const startW = element.width;
    const startH = element.height;
    const startFontSize = element.type === 'text' ? element.fontSize : 14;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = (moveEvent.clientX - startClientX) / scale;
      const dy = (moveEvent.clientY - startClientY) / scale;

      let newX = startX;
      let newY = startY;
      let newW = startW;
      let newH = startH;

      if (handle.includes('e')) newW = Math.max(20, startW + dx);
      if (handle.includes('s')) newH = Math.max(15, startH + dy);
      if (handle.includes('w')) {
        const potentialW = startW - dx;
        if (potentialW >= 20) {
          newW = potentialW;
          newX = startX + dx;
        }
      }
      if (handle.includes('n')) {
        const potentialH = startH - dy;
        if (potentialH >= 15) {
          newH = potentialH;
          newY = startY + dy;
        }
      }

      // Proportional aspect ratio locking on corner handles for images, signatures, and drawings
      if (element.type !== 'text' && handle.length === 2) {
        const aspectRatio = startH / startW;
        newH = Math.max(15, Math.round(newW * aspectRatio));
      }

      // If text element, dynamically scale font size on corner resize
      let newFontSize = startFontSize;
      if (element.type === 'text' && handle.length === 2) {
        const scaleFactor = newW / startW;
        newFontSize = Math.max(8, Math.min(120, Math.round(startFontSize * scaleFactor)));
      }

      onChange({
        ...element,
        x: newX,
        y: newY,
        width: newW,
        height: newH,
        ...(element.type === 'text' ? { fontSize: newFontSize } : {}),
      });
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // --- ROTATING ---
  const handleRotateStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!elementRef.current) return;
    const rect = elementRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const radians = Math.atan2(moveEvent.clientY - centerY, moveEvent.clientX - centerX);
      let deg = Math.round(radians * (180 / Math.PI) + 90); // 0 is top
      if (deg < 0) deg += 360;
      onChange({
        ...element,
        rotation: deg,
      });
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      ref={elementRef}
      onClick={onSelect}
      onMouseDown={handleDragStart}
      onDoubleClick={() => {
        if (element.type === 'text') setIsEditingText(true);
      }}
      style={{
        position: 'absolute',
        left: `${domX}px`,
        top: `${domY}px`,
        width: `${domW}px`,
        height: `${domH}px`,
        transform: `rotate(${element.rotation}deg)`,
        transformOrigin: 'center center',
      }}
      className={`group absolute cursor-move select-none transition-shadow ${
        isSelected
          ? 'ring-2 ring-blue-500 ring-offset-1 z-30'
          : 'hover:ring-1 hover:ring-blue-400/60 z-10'
      }`}
    >
      {/* Element Content */}
      <div className="w-full h-full relative overflow-hidden flex items-center justify-center">
        {element.type === 'text' && (
          isEditingText ? (
            <textarea
              ref={textInputRef}
              value={element.content}
              onChange={(e) =>
                onChange({
                  ...element,
                  content: e.target.value,
                })
              }
              onBlur={() => setIsEditingText(false)}
              style={{
                fontSize: `${element.fontSize * scale}px`,
                fontFamily: getFontCss(element.fontFamily),
                color: element.color,
                fontWeight: element.isBold ? 'bold' : 'normal',
                fontStyle: element.isItalic ? 'italic' : 'normal',
                lineHeight: 1.2,
              }}
              className="w-full h-full bg-blue-500/10 border border-blue-400 p-0 m-0 outline-none resize-none overflow-hidden"
            />
          ) : (
            <div
              style={{
                fontSize: `${element.fontSize * scale}px`,
                fontFamily: getFontCss(element.fontFamily),
                color: element.color,
                fontWeight: element.isBold ? 'bold' : 'normal',
                fontStyle: element.isItalic ? 'italic' : 'normal',
                lineHeight: 1.2,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
              className="w-full h-full p-0 m-0 pointer-events-none"
            >
              {element.content}
            </div>
          )
        )}

        {(element.type === 'image' || element.type === 'signature' || element.type === 'pencil') && (
          <img
            src={element.imageDataUrl}
            alt={element.type}
            className="w-full h-full object-fill pointer-events-none"
          />
        )}
      </div>

      {/* Floating Toolbar for Selected Element */}
      {isSelected && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 px-2 py-1 rounded-xl shadow-xl z-50 text-slate-200 text-xs whitespace-nowrap pointer-events-auto"
        >
          {element.type === 'text' && (
            <>
              {/* Font Family */}
              <select
                value={element.fontFamily}
                onChange={(e) =>
                  onChange({
                    ...element,
                    fontFamily: e.target.value as TextElement['fontFamily'],
                  })
                }
                className="bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-slate-200 outline-none"
              >
                <option value="Helvetica">Helvetica / Arial</option>
                <option value="Times-Roman">Times New Roman</option>
                <option value="Courier">Courier New</option>
                <option value="Roboto">Roboto</option>
                <option value="Montserrat">Montserrat</option>
                <option value="Dancing Script">Dancing Script (Handwriting)</option>
              </select>

              {/* Font Size Adjust */}
              <button
                onClick={() =>
                  onChange({
                    ...element,
                    fontSize: Math.max(8, element.fontSize - 2),
                  })
                }
                className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white"
                title="Kecilkan Font"
              >
                <AArrowDown className="w-3.5 h-3.5" />
              </button>
              <span className="font-semibold text-slate-300 min-w-[20px] text-center">
                {element.fontSize}
              </span>
              <button
                onClick={() =>
                  onChange({
                    ...element,
                    fontSize: Math.min(140, element.fontSize + 2),
                  })
                }
                className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white"
                title="Besarkan Font"
              >
                <AArrowUp className="w-3.5 h-3.5" />
              </button>

              <div className="h-4 w-[1px] bg-slate-700 mx-0.5" />

              {/* Bold & Italic */}
              <button
                onClick={() =>
                  onChange({
                    ...element,
                    isBold: !element.isBold,
                  })
                }
                className={`p-1 rounded ${
                  element.isBold ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-300'
                }`}
                title="Tebal (Bold)"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() =>
                  onChange({
                    ...element,
                    isItalic: !element.isItalic,
                  })
                }
                className={`p-1 rounded ${
                  element.isItalic ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-300'
                }`}
                title="Miring (Italic)"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>

              <div className="h-4 w-[1px] bg-slate-700 mx-0.5" />

              {/* Color Presets */}
              <div className="flex items-center gap-1">
                {COLOR_PRESETS.map((color) => (
                  <button
                    key={color}
                    onClick={() => onChange({ ...element, color })}
                    style={{ backgroundColor: color }}
                    className={`w-3.5 h-3.5 rounded-full border ${
                      element.color === color ? 'ring-2 ring-blue-400 border-white' : 'border-slate-600'
                    }`}
                  />
                ))}
              </div>

              <div className="h-4 w-[1px] bg-slate-700 mx-0.5" />
            </>
          )}

          <button
            onClick={onDuplicate}
            className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white"
            title="Duplikat Elemen"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 hover:bg-red-500/20 rounded text-red-400 hover:text-red-300"
            title="Hapus Elemen"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Resize & Rotate Handles (only shown when selected) */}
      {isSelected && (
        <>
          {/* Rotate Handle Top Knob */}
          <div
            onMouseDown={handleRotateStart}
            className="absolute -top-6 left-1/2 -translate-x-1/2 w-4 h-4 bg-blue-600 rounded-full border border-white shadow-md flex items-center justify-center cursor-grab active:cursor-grabbing hover:scale-125 transition-transform"
            title="Putar Elemen"
          >
            <RotateCw className="w-2.5 h-2.5 text-white" />
          </div>

          {/* 8-Point Resize Handles */}
          {['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].map((handle) => {
            let posClass = '';
            let cursorClass = '';
            if (handle === 'nw') {
              posClass = '-top-1.5 -left-1.5';
              cursorClass = 'cursor-nwse-resize';
            } else if (handle === 'n') {
              posClass = '-top-1.5 left-1/2 -translate-x-1/2';
              cursorClass = 'cursor-ns-resize';
            } else if (handle === 'ne') {
              posClass = '-top-1.5 -right-1.5';
              cursorClass = 'cursor-nesw-resize';
            } else if (handle === 'e') {
              posClass = 'top-1/2 -translate-y-1/2 -right-1.5';
              cursorClass = 'cursor-ew-resize';
            } else if (handle === 'se') {
              posClass = '-bottom-1.5 -right-1.5';
              cursorClass = 'cursor-nwse-resize';
            } else if (handle === 's') {
              posClass = '-bottom-1.5 left-1/2 -translate-x-1/2';
              cursorClass = 'cursor-ns-resize';
            } else if (handle === 'sw') {
              posClass = '-bottom-1.5 -left-1.5';
              cursorClass = 'cursor-nesw-resize';
            } else if (handle === 'w') {
              posClass = 'top-1/2 -translate-y-1/2 -left-1.5';
              cursorClass = 'cursor-ew-resize';
            }

            return (
              <div
                key={handle}
                onMouseDown={(e) => handleResizeStart(e, handle)}
                className={`absolute w-3 h-3 bg-white border-2 border-blue-600 rounded-sm shadow-md ${posClass} ${cursorClass} hover:scale-125 transition-transform z-40`}
              />
            );
          })}
        </>
      )}
    </div>
  );
};
