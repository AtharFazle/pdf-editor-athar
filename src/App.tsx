import { useState, useRef, useEffect, useCallback } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { pdfjsLib } from './utils/pdfWorker';
import { Dropzone } from './components/Dropzone';
import { Toolbar } from './components/Toolbar';
import { Sidebar } from './components/Sidebar';
import { PDFCanvas } from './components/PDFCanvas';
import { EditorOverlay } from './components/EditorOverlay';
import { SignatureModal } from './components/SignatureModal';
import type {
  PdfElement,
  PageDimensions,
  ActiveTool,
  TextElement,
  ImageElement,
  SignatureElement,
  PencilElement,
} from './types/pdf';
import { exportPdf } from './utils/pdfExport';

export function App() {
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);

  const [activeTool, setActiveTool] = useState<ActiveTool>('select');
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  // Pencil tool settings
  const [pencilColor, setPencilColor] = useState<string>('#dc2626');
  const [pencilWidth, setPencilWidth] = useState<number>(3);

  // Clipboard for Copy & Paste
  const copiedElementRef = useRef<PdfElement | null>(null);
  const [hasCopiedElement, setHasCopiedElement] = useState<boolean>(false);

  // Element state history for Undo/Redo
  const [history, setHistory] = useState<PdfElement[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  const [pageDimensionsMap, setPageDimensionsMap] = useState<Record<number, PageDimensions>>({});
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const imageInputRef = useRef<HTMLInputElement>(null);

  const currentElements = history[historyIndex] || [];

  // Helper to push a new state into history
  const pushHistory = useCallback(
    (newElements: PdfElement[]) => {
      const nextHistory = history.slice(0, historyIndex + 1);
      nextHistory.push(newElements);
      setHistory(nextHistory);
      setHistoryIndex(nextHistory.length - 1);
    },
    [history, historyIndex]
  );

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setSelectedElementId(null);
    }
  }, [historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setSelectedElementId(null);
    }
  }, [history, historyIndex]);

  // Copy & Paste Handlers
  const handleCopy = useCallback(() => {
    const el = currentElements.find((item) => item.id === selectedElementId);
    if (el) {
      copiedElementRef.current = el;
      setHasCopiedElement(true);
    }
  }, [currentElements, selectedElementId]);

  const handlePaste = useCallback(() => {
    if (!copiedElementRef.current) return;
    const targetPageIdx = currentPage - 1;
    const sourceEl = copiedElementRef.current;

    const newElement: PdfElement = {
      ...sourceEl,
      id: `${sourceEl.type}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      pageIndex: targetPageIdx,
      x: sourceEl.x + 15,
      y: sourceEl.y + 15,
    };

    const nextElements = [...currentElements, newElement];
    pushHistory(nextElements);
    setSelectedElementId(newElement.id);
  }, [currentElements, currentPage, pushHistory]);

  // Handle PDF Loading
  const loadPdfFromBytes = async (buffer: ArrayBuffer, name: string) => {
    try {
      // Create copies to prevent PDF.js worker from detaching the main ArrayBuffer
      const bytesForState = buffer.slice(0);
      const bytesForPdfJs = buffer.slice(0);

      setPdfBytes(bytesForState);
      setFileName(name);

      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(bytesForPdfJs) });
      const doc = await loadingTask.promise;

      setPdfDocument(doc);
      setTotalPages(doc.numPages);
      setCurrentPage(1);
      setScale(1.1);

      // Reset state & history
      setHistory([[]]);
      setHistoryIndex(0);
      setSelectedElementId(null);
      setPageDimensionsMap({});
      copiedElementRef.current = null;
      setHasCopiedElement(false);
    } catch (err) {
      console.error('Error loading PDF document:', err);
      alert('Gagal memuat dokumen PDF. Pastikan file valid.');
    }
  };

  const handleFileSelect = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        loadPdfFromBytes(e.target.result as ArrayBuffer, file.name);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDimensionsResolved = useCallback((pageIndex: number, dims: PageDimensions) => {
    setPageDimensionsMap((prev) => {
      if (prev[pageIndex]?.width === dims.width && prev[pageIndex]?.height === dims.height) {
        return prev;
      }
      return { ...prev, [pageIndex]: dims };
    });
  }, []);

  // --- ELEMENT CREATION & UPDATE ---
  const handleAddText = (pageIdx: number, x?: number, y?: number) => {
    const dims = pageDimensionsMap[pageIdx] || { width: 595.28, height: 841.89 };
    const defaultX = x ?? (dims.width - 160) / 2;
    const defaultY = y ?? (dims.height - 40) / 2;

    const newText: TextElement = {
      id: `text-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: 'text',
      pageIndex: pageIdx,
      x: Math.max(10, defaultX),
      y: Math.max(10, defaultY),
      width: 180,
      height: 40,
      rotation: 0,
      content: 'Ketik teks di sini',
      fontSize: 16,
      fontFamily: 'Helvetica',
      color: '#000000',
    };

    const nextElements = [...currentElements, newText];
    pushHistory(nextElements);
    setSelectedElementId(newText.id);
    setActiveTool('select');
  };

  const handleAddPencilElement = (
    pageIdx: number,
    x: number,
    y: number,
    width: number,
    height: number,
    dataUrl: string
  ) => {
    const newPencil: PencilElement = {
      id: `pencil-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: 'pencil',
      pageIndex: pageIdx,
      x,
      y,
      width,
      height,
      rotation: 0,
      imageDataUrl: dataUrl,
      color: pencilColor,
      strokeWidth: pencilWidth,
    };

    const nextElements = [...currentElements, newPencil];
    pushHistory(nextElements);
    setSelectedElementId(newPencil.id);
    setActiveTool('select');
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const imageType: 'png' | 'jpg' = file.type.includes('png') ? 'png' : 'jpg';
      const reader = new FileReader();

      reader.onload = (evt) => {
        if (evt.target?.result) {
          const dataUrl = evt.target.result as string;
          const pageIdx = currentPage - 1;
          const dims = pageDimensionsMap[pageIdx] || { width: 595.28, height: 841.89 };

          // Measure intrinsic aspect ratio
          const img = new Image();
          img.onload = () => {
            const maxDim = 200;
            let width = maxDim;
            let height = maxDim;

            if (img.naturalWidth > 0 && img.naturalHeight > 0) {
              if (img.naturalWidth >= img.naturalHeight) {
                width = maxDim;
                height = Math.round(maxDim * (img.naturalHeight / img.naturalWidth));
              } else {
                height = maxDim;
                width = Math.round(maxDim * (img.naturalWidth / img.naturalHeight));
              }
            }

            const newImage: ImageElement = {
              id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              type: 'image',
              pageIndex: pageIdx,
              x: (dims.width - width) / 2,
              y: (dims.height - height) / 2,
              width,
              height,
              rotation: 0,
              imageDataUrl: dataUrl,
              imageType,
            };

            const nextElements = [...currentElements, newImage];
            pushHistory(nextElements);
            setSelectedElementId(newImage.id);
            setActiveTool('select');
          };
          img.src = dataUrl;
        }
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

  const handleInsertSignature = (imageDataUrl: string) => {
    const pageIdx = currentPage - 1;
    const dims = pageDimensionsMap[pageIdx] || { width: 595.28, height: 841.89 };

    const newSig: SignatureElement = {
      id: `sig-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: 'signature',
      pageIndex: pageIdx,
      x: (dims.width - 160) / 2,
      y: (dims.height - 80) / 2,
      width: 160,
      height: 80,
      rotation: 0,
      imageDataUrl,
    };

    const nextElements = [...currentElements, newSig];
    pushHistory(nextElements);
    setSelectedElementId(newSig.id);
    setActiveTool('select');
  };

  const handleUpdateElement = (updatedElement: PdfElement) => {
    const nextElements = currentElements.map((el) =>
      el.id === updatedElement.id ? updatedElement : el
    );
    pushHistory(nextElements);
  };

  const handleDeleteElement = (id: string) => {
    const nextElements = currentElements.filter((el) => el.id !== id);
    pushHistory(nextElements);
    if (selectedElementId === id) {
      setSelectedElementId(null);
    }
  };

  const handleDuplicateElement = (element: PdfElement) => {
    const duplicate: PdfElement = {
      ...element,
      id: `${element.type}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      x: element.x + 15,
      y: element.y + 15,
    };

    const nextElements = [...currentElements, duplicate];
    pushHistory(nextElements);
    setSelectedElementId(duplicate.id);
  };

  // Keyboard Shortcuts (Undo, Redo, Copy, Paste, Delete, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore keyboard shortcuts when user is typing in input or textarea
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
        e.preventDefault();
        handleCopy();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
        e.preventDefault();
        handlePaste();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        handleRedo();
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElementId) {
        handleDeleteElement(selectedElementId);
      } else if (e.key === 'Escape') {
        setSelectedElementId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, handleCopy, handlePaste, selectedElementId]);

  // Export PDF
  const handleExport = async () => {
    if (!pdfBytes) return;
    try {
      setIsExporting(true);
      const exportedBytes = await exportPdf(pdfBytes.slice(0), currentElements);

      const blob = new Blob([exportedBytes as Uint8Array<ArrayBuffer>], {
        type: 'application/pdf',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const baseName = fileName.replace(/\.pdf$/i, '');
      link.download = `${baseName}_edited.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export PDF:', err);
      alert('Gagal mengekspor dokumen PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  if (!pdfDocument || !pdfBytes) {
    return (
      <Dropzone
        onFileSelect={handleFileSelect}
        onBytesSelect={(bytes, name) => loadPdfFromBytes(bytes, name)}
      />
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 overflow-x-hidden select-none">
      {/* Hidden File Input for Image Upload */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/png, image/jpeg, image/jpg"
        onChange={handleImageFileChange}
        className="hidden"
      />

      {/* Signature Modal */}
      <SignatureModal
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        onInsertSignature={handleInsertSignature}
      />

      {/* Top Header Toolbar */}
      <Toolbar
        fileName={fileName}
        activeTool={activeTool}
        onSelectTool={(tool) => {
          setActiveTool(tool);
          if (tool === 'text') {
            handleAddText(currentPage - 1);
          }
        }}
        onAddImageClick={() => imageInputRef.current?.click()}
        onAddSignatureClick={() => setIsSignatureModalOpen(true)}
        pencilColor={pencilColor}
        onPencilColorChange={setPencilColor}
        pencilWidth={pencilWidth}
        onPencilWidthChange={setPencilWidth}
        scale={scale}
        onZoomIn={() => setScale((prev) => Math.min(2.5, prev + 0.15))}
        onZoomOut={() => setScale((prev) => Math.max(0.4, prev - 0.15))}
        onZoomReset={() => setScale(1.0)}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={(page) => setCurrentPage(page)}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
        hasSelection={!!selectedElementId}
        hasCopiedElement={hasCopiedElement}
        onCopy={handleCopy}
        onPaste={handlePaste}
        onNewFile={() => {
          if (
            confirm('Apakah Anda yakin ingin membuka file baru? Perubahan belum disimpan akan hilang.')
          ) {
            setPdfDocument(null);
            setPdfBytes(null);
          }
        }}
        onExport={handleExport}
        isExporting={isExporting}
      />

      {/* Main Workspace Area */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar Thumbnails */}
        <Sidebar
          pdfDocument={pdfDocument}
          totalPages={totalPages}
          currentPage={currentPage}
          onPageSelect={(p) => setCurrentPage(p)}
          isOpen={true}
        />

        {/* Central Canvas Viewport */}
        <main
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedElementId(null);
            }
          }}
          className="flex-1 overflow-auto p-8 flex flex-col items-center gap-8 bg-slate-950/90 relative"
        >
          {Array.from({ length: totalPages }, (_, pageIdx) => {
            const dims = pageDimensionsMap[pageIdx] || { width: 595.28, height: 841.89 };
            const domW = dims.width * scale;
            const domH = dims.height * scale;

            return (
              <div
                key={pageIdx}
                id={`pdf-page-${pageIdx + 1}`}
                style={{
                  width: `${domW}px`,
                  height: `${domH}px`,
                }}
                className="relative bg-white shadow-2xl transition-all rounded-xs"
              >
                {/* PDF Page Canvas Layer */}
                <PDFCanvas
                  pdfDocument={pdfDocument}
                  pageIndex={pageIdx}
                  scale={scale}
                  onDimensionsResolved={(d) => handleDimensionsResolved(pageIdx, d)}
                />

                {/* Editor Overlay Layer */}
                <EditorOverlay
                  pageIndex={pageIdx}
                  dimensions={dims}
                  scale={scale}
                  elements={currentElements}
                  selectedElementId={selectedElementId}
                  onSelectElement={setSelectedElementId}
                  activeTool={activeTool}
                  pencilColor={pencilColor}
                  pencilWidth={pencilWidth}
                  onAddTextAtPosition={(pIdx, x, y) => handleAddText(pIdx, x, y)}
                  onAddPencilElement={handleAddPencilElement}
                  onUpdateElement={handleUpdateElement}
                  onDeleteElement={handleDeleteElement}
                  onDuplicateElement={handleDuplicateElement}
                />
              </div>
            );
          })}
        </main>
      </div>
    </div>
  );
}

export default App;
