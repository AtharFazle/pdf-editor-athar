import React from 'react';
import {
  MousePointer,
  Type,
  Image as ImageIcon,
  PenTool,
  Pencil,
  ZoomIn,
  ZoomOut,
  Undo2,
  Redo2,
  Download,
  FolderOpen,
  ChevronLeft,
  ChevronRight,
  FileText,
  Copy,
  ClipboardPaste,
} from 'lucide-react';
import type { ActiveTool } from '../types/pdf';

interface ToolbarProps {
  fileName: string;
  activeTool: ActiveTool;
  onSelectTool: (tool: ActiveTool) => void;
  onAddImageClick: () => void;
  onAddSignatureClick: () => void;
  pencilColor: string;
  onPencilColorChange: (color: string) => void;
  pencilWidth: number;
  onPencilWidthChange: (width: number) => void;
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  hasSelection: boolean;
  hasCopiedElement: boolean;
  onCopy: () => void;
  onPaste: () => void;
  onNewFile: () => void;
  onExport: () => void;
  isExporting: boolean;
}

const PENCIL_COLORS = ['#dc2626', '#000000', '#2563eb', '#16a34a', '#d97706', '#7c3aed', '#ffffff'];

export const Toolbar: React.FC<ToolbarProps> = ({
  fileName,
  activeTool,
  onSelectTool,
  onAddImageClick,
  onAddSignatureClick,
  pencilColor,
  onPencilColorChange,
  pencilWidth,
  onPencilWidthChange,
  scale,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  currentPage,
  totalPages,
  onPageChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  hasSelection,
  hasCopiedElement,
  onCopy,
  onPaste,
  onNewFile,
  onExport,
  isExporting,
}) => {
  return (
    <header className="shrink-0 z-50 w-full bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-3 shadow-md">
      {/* Left: Branding & File Info */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 font-bold text-white text-lg">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
            <FileText className="w-5 h-5" />
          </div>
          <span className="hidden sm:inline bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
            PDF Editor
          </span>
        </div>

        <div className="h-6 w-[1px] bg-slate-800 mx-1 hidden sm:block" />

        <div className="flex items-center gap-2 max-w-[200px] sm:max-w-[300px]">
          <span className="text-xs text-slate-300 truncate font-medium bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700/50">
            {fileName}
          </span>
          <button
            onClick={onNewFile}
            title="Buka File Baru"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <FolderOpen className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Center: Editing Tools */}
      <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 shadow-inner">
        <button
          onClick={() => onSelectTool('select')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTool === 'select'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
          title="Pilih / Geser Elemen"
        >
          <MousePointer className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Pilih</span>
        </button>

        <button
          onClick={() => onSelectTool('text')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTool === 'text'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
          title="Tambah Teks"
        >
          <Type className="w-3.5 h-3.5" />
          <span>Teks</span>
        </button>

        <button
          onClick={() => onSelectTool('pencil')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTool === 'pencil'
              ? 'bg-red-600 text-white shadow-md shadow-red-600/30 font-semibold'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
          title="Pensil / Brush Coretan Freehand"
        >
          <Pencil className="w-3.5 h-3.5 text-amber-400" />
          <span>Pensil / Brush</span>
        </button>

        <button
          onClick={onAddImageClick}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
          title="Tambah Gambar (PNG / JPG)"
        >
          <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
          <span>Gambar</span>
        </button>

        <button
          onClick={onAddSignatureClick}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
          title="Tambah Tanda Tangan"
        >
          <PenTool className="w-3.5 h-3.5 text-purple-400" />
          <span>Tanda Tangan</span>
        </button>
      </div>

      {/* Pencil Options Panel (shown when pencil tool is active) */}
      {activeTool === 'pencil' && (
        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1 rounded-xl border border-slate-800 text-xs animate-fade-in">
          <span className="text-slate-400 font-medium">Warna:</span>
          <div className="flex items-center gap-1">
            {PENCIL_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => onPencilColorChange(c)}
                style={{ backgroundColor: c }}
                className={`w-4 h-4 rounded-full border ${
                  pencilColor === c ? 'ring-2 ring-white border-transparent' : 'border-slate-700'
                }`}
              />
            ))}
          </div>

          <div className="h-4 w-[1px] bg-slate-800 mx-1" />

          <span className="text-slate-400 font-medium">Ukuran:</span>
          {[2, 4, 8].map((w) => (
            <button
              key={w}
              onClick={() => onPencilWidthChange(w)}
              className={`px-2 py-0.5 rounded font-semibold ${
                pencilWidth === w ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'
              }`}
            >
              {w === 2 ? 'Halus' : w === 4 ? 'Sedang' : 'Tebal'}
            </button>
          ))}
        </div>
      )}

      {/* Right Controls: Copy/Paste, Navigation, Zoom, Undo, Export */}
      <div className="flex items-center gap-2">
        {/* Copy & Paste Buttons */}
        <div className="flex items-center bg-slate-800/80 rounded-lg p-0.5 border border-slate-700/60 text-xs">
          <button
            onClick={onCopy}
            disabled={!hasSelection}
            className="p-1 text-slate-300 hover:text-white disabled:opacity-30"
            title="Salin Elemen (Ctrl+C)"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={onPaste}
            disabled={!hasCopiedElement}
            className="p-1 text-slate-300 hover:text-white disabled:opacity-30"
            title="Tempel Elemen (Ctrl+V)"
          >
            <ClipboardPaste className="w-4 h-4" />
          </button>
        </div>

        {/* Page Nav */}
        <div className="flex items-center bg-slate-800/80 rounded-lg p-0.5 border border-slate-700/60 text-xs">
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className="p-1 text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:text-slate-300"
            title="Halaman Sebelumnya"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-2 font-medium text-slate-200">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
            className="p-1 text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:text-slate-300"
            title="Halaman Selanjutnya"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Zoom */}
        <div className="flex items-center bg-slate-800/80 rounded-lg p-0.5 border border-slate-700/60 text-xs">
          <button
            onClick={onZoomOut}
            className="p-1 text-slate-300 hover:text-white"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={onZoomReset}
            className="px-1.5 font-medium text-slate-200 hover:text-blue-400 transition-colors"
            title="Reset Zoom"
          >
            {Math.round(scale * 100)}%
          </button>
          <button
            onClick={onZoomIn}
            className="p-1 text-slate-300 hover:text-white"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        {/* Undo / Redo */}
        <div className="flex items-center bg-slate-800/80 rounded-lg p-0.5 border border-slate-700/60 text-xs">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1 text-slate-300 hover:text-white disabled:opacity-30"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1 text-slate-300 hover:text-white disabled:opacity-30"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        {/* Export Button */}
        <button
          onClick={onExport}
          disabled={isExporting}
          className="flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg font-semibold text-xs shadow-lg shadow-blue-600/25 transition-all disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          <span>{isExporting ? 'Proses...' : 'Unduh PDF'}</span>
        </button>
      </div>
    </header>
  );
};
