import React, { useEffect, useRef } from 'react';
import { Layers } from 'lucide-react';
import { PDFCanvas } from './PDFCanvas';
import type { PDFDocumentProxy } from 'pdfjs-dist';

interface SidebarProps {
  pdfDocument: PDFDocumentProxy | null;
  totalPages: number;
  currentPage: number;
  onPageSelect: (pageIndex: number) => void;
  isOpen: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  pdfDocument,
  totalPages,
  currentPage,
  onPageSelect,
  isOpen,
}) => {
  const thumbnailRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // Auto-scroll sidebar thumbnail into view when currentPage changes
  useEffect(() => {
    const activeThumb = thumbnailRefs.current[currentPage];
    if (activeThumb) {
      activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentPage]);

  if (!isOpen || totalPages <= 0) return null;

  return (
    <aside className="w-48 bg-slate-900 border-r border-slate-800 flex flex-col h-full min-h-0 select-none shrink-0">
      <div className="p-3 border-b border-slate-800 flex items-center gap-2 text-slate-300 text-xs font-semibold uppercase tracking-wider">
        <Layers className="w-4 h-4 text-blue-400" />
        <span>Halaman ({totalPages})</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-4">
        {Array.from({ length: totalPages }, (_, index) => {
          const pageNum = index + 1;
          const isActive = pageNum === currentPage;

          return (
            <div
              key={index}
              ref={(el) => {
                thumbnailRefs.current[pageNum] = el;
              }}
              onClick={() => onPageSelect(pageNum)}
              tabIndex={0}
              role="button"
              aria-label={`Buka Halaman ${pageNum}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onPageSelect(pageNum);
                }
              }}
              className="flex flex-col items-center gap-1.5 cursor-pointer group transition-all focus:outline-none"
            >
              <div
                className={`relative rounded-md overflow-hidden shadow-md border-2 transition-all bg-white ${
                  isActive
                    ? 'border-blue-500 ring-2 ring-blue-500/40 scale-[1.02]'
                    : 'border-slate-700 group-hover:border-slate-500 group-focus-visible:border-blue-400'
                }`}
              >
                {pdfDocument && (
                  <div className="pointer-events-none">
                    <PDFCanvas
                      pdfDocument={pdfDocument}
                      pageIndex={index}
                      scale={0.2}
                    />
                  </div>
                )}
                {isActive && (
                  <div className="absolute inset-0 bg-blue-500/10 pointer-events-none" />
                )}
              </div>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-slate-400 group-hover:text-slate-200'
                }`}
              >
                {pageNum}
              </span>
            </div>
          );
        })}
      </div>
    </aside>
  );
};

