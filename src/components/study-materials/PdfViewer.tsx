import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileText,
  AlertCircle,
  X,
  BookOpen,
  RotateCcw,
  MoveHorizontal
} from 'lucide-react';
import { StudyMaterial } from '../../types';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface PdfViewerProps {
  material: StudyMaterial;
  initialPage?: number;
  initialScale?: number;
  onPageChange?: (page: number) => void;
  onScaleChange?: (scale: number) => void;
  onClose?: () => void;
  onSelectForQuestion?: (page: number) => void;
  isCompact?: boolean;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  material,
  initialPage = 1,
  initialScale = 1.2,
  onPageChange,
  onScaleChange,
  onClose,
  onSelectForQuestion,
  isCompact = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [numPages, setNumPages] = useState<number>(material.totalPages || 0);
  const [scale, setScale] = useState<number>(initialScale);
  const [pageInput, setPageInput] = useState<string>(String(initialPage));
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Synchronize incoming scale changes
  useEffect(() => {
    if (initialScale && Math.abs(initialScale - scale) > 0.05) {
      setScale(initialScale);
    }
  }, [initialScale]);

  // Load PDF Document
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setErrorMessage(null);

    const loadPdf = async () => {
      try {
        if (!material.pdfData) {
          throw new Error('No PDF file data found in local storage.');
        }

        let data: ArrayBuffer;
        if (material.pdfData instanceof Blob) {
          data = await material.pdfData.arrayBuffer();
        } else if (material.pdfData instanceof ArrayBuffer) {
          data = material.pdfData;
        } else {
          throw new Error('Unsupported document data format.');
        }

        const loadingTask = pdfjsLib.getDocument({ data: data.slice(0) });
        const doc = await loadingTask.promise;

        if (isCancelled) return;

        setPdfDoc(doc);
        setNumPages(doc.numPages);
        const validInitial = Math.min(Math.max(1, initialPage), doc.numPages);
        setCurrentPage(validInitial);
        setPageInput(String(validInitial));
        setLoading(false);
      } catch (err: any) {
        if (isCancelled) return;
        console.error('PDF Load Error:', err);
        setLoading(false);
        setErrorMessage(
          err.message?.includes('Invalid PDF structure')
            ? 'The selected file is corrupt or is not a valid PDF document.'
            : err.message || 'Failed to load PDF document.'
        );
      }
    };

    loadPdf();

    return () => {
      isCancelled = true;
    };
  }, [material.id, material.addedAt]);

  // When initialPage prop changes externally (e.g. navigation jump), update current page
  useEffect(() => {
    if (pdfDoc && initialPage) {
      const validTarget = Math.min(Math.max(1, initialPage), numPages);
      if (validTarget !== currentPage) {
        setCurrentPage(validTarget);
        setPageInput(String(validTarget));
      }
    }
  }, [initialPage, pdfDoc, numPages]);

  // Render Page to Canvas
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    let isRenderCancelled = false;

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(currentPage);
        if (isRenderCancelled || !canvasRef.current) return;

        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        if (!context) return;

        // High DPI support
        const pixelRatio = window.devicePixelRatio || 1;
        canvas.height = viewport.height * pixelRatio;
        canvas.width = viewport.width * pixelRatio;
        canvas.style.height = `${viewport.height}px`;
        canvas.style.width = `${viewport.width}px`;

        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        await page.render(renderContext).promise;
      } catch (err: any) {
        if (!isRenderCancelled) {
          console.error('Page render error:', err);
        }
      }
    };

    renderPage();

    return () => {
      isRenderCancelled = true;
    };
  }, [pdfDoc, currentPage, scale]);

  const handlePageChange = useCallback((newPage: number) => {
    if (newPage >= 1 && newPage <= numPages) {
      setCurrentPage(newPage);
      setPageInput(String(newPage));
      containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      onPageChange?.(newPage);
    }
  }, [numPages, onPageChange]);

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(pageInput, 10);
    if (!isNaN(p)) {
      handlePageChange(p);
    } else {
      setPageInput(String(currentPage));
    }
  };

  const updateScale = (newScale: number) => {
    const clamped = Math.min(Math.max(newScale, 0.4), 3.0);
    setScale(clamped);
    onScaleChange?.(clamped);
  };

  const zoomIn = () => updateScale(scale + 0.2);
  const zoomOut = () => updateScale(scale - 0.2);
  const resetZoom = () => updateScale(1.0);

  const fitToWidth = async () => {
    if (!pdfDoc || !containerRef.current) return;
    try {
      const page = await pdfDoc.getPage(currentPage);
      const viewport = page.getViewport({ scale: 1.0 });
      const containerWidth = containerRef.current.clientWidth - 48; // padding
      if (containerWidth > 100 && viewport.width > 0) {
        const targetScale = Math.max(0.4, Math.min(2.5, containerWidth / viewport.width));
        updateScale(targetScale);
      }
    } catch (err) {
      console.error('Fit to width error:', err);
    }
  };

  return (
    <div className={`flex flex-col w-full h-full bg-[#141419] rounded-2xl overflow-hidden shadow-2xl border border-[#2a2a34]`}>
      {/* Top Controls Toolbar */}
      <div className="bg-[#1e1e24] border-b border-[#2a2a34] px-3.5 py-2 flex flex-wrap items-center justify-between text-white text-xs select-none gap-2">
        {/* Document Title & Badge */}
        <div className="flex items-center space-x-2 truncate max-w-xs">
          <FileText className="w-3.5 h-3.5 text-acca-red shrink-0" />
          <span className="font-semibold text-gray-200 truncate text-[11px] sm:text-xs">
            {material.title || material.fileName}
          </span>
          {material.paperId && (
            <span className="bg-[#141419] px-1.5 py-0.5 rounded text-[10px] font-bold text-gray-300 border border-[#2a2a34] shrink-0">
              {material.paperId}
            </span>
          )}
        </div>

        {/* Page Navigation Controls */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1 || loading}
            className="p-1 rounded bg-[#141419] hover:bg-[#25252e] border border-[#2a2a34] disabled:opacity-30 disabled:hover:bg-[#141419] transition-colors"
            title="Previous Page"
            aria-label="Previous Page"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <form onSubmit={handlePageInputSubmit} className="flex items-center space-x-1">
            <input
              type="text"
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              aria-label="Current Page Number"
              className="w-10 text-center bg-[#141419] border border-[#2a2a34] rounded px-1 py-0.5 text-[11px] text-white focus:outline-none focus:border-acca-red"
            />
            <span className="text-gray-400 text-[11px]">/ {numPages || '—'}</span>
          </form>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= numPages || loading}
            className="p-1 rounded bg-[#141419] hover:bg-[#25252e] border border-[#2a2a34] disabled:opacity-30 disabled:hover:bg-[#141419] transition-colors"
            title="Next Page"
            aria-label="Next Page"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Zoom & Action Controls */}
        <div className="flex items-center space-x-1">
          <button
            onClick={zoomOut}
            className="p-1 rounded bg-[#141419] hover:bg-[#25252e] border border-[#2a2a34] transition-colors"
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-gray-400 text-[11px] w-10 text-center font-mono">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={zoomIn}
            className="p-1 rounded bg-[#141419] hover:bg-[#25252e] border border-[#2a2a34] transition-colors"
            title="Zoom In"
            aria-label="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={fitToWidth}
            className="p-1 rounded bg-[#141419] hover:bg-[#25252e] border border-[#2a2a34] transition-colors text-gray-300 hover:text-white"
            title="Fit to Width"
            aria-label="Fit to Width"
          >
            <MoveHorizontal className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={resetZoom}
            className="p-1 rounded bg-[#141419] hover:bg-[#25252e] border border-[#2a2a34] transition-colors text-gray-300 hover:text-white"
            title="Reset Zoom to 100%"
            aria-label="Reset Zoom"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {onSelectForQuestion && (
            <button
              onClick={() => onSelectForQuestion(currentPage)}
              className="ml-1 bg-acca-red hover:bg-acca-red-hover text-white px-2 py-0.5 rounded text-[11px] font-semibold flex items-center space-x-1 transition-colors"
            >
              <BookOpen className="w-3 h-3" />
              <span>Link P.{currentPage}</span>
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="ml-1 p-1 rounded text-gray-400 hover:text-white hover:bg-[#25252e] transition-colors"
              title="Close Viewer"
              aria-label="Close Viewer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Canvas Viewport with Independent Scroll */}
      <div
        ref={containerRef}
        tabIndex={0}
        aria-label="PDF Content Scroll Viewport"
        className="flex-1 overflow-auto bg-[#0d0d11] p-4 flex items-start justify-center relative min-h-[350px] outline-none"
      >
        {loading && (
          <div className="flex flex-col items-center justify-center my-auto space-y-3 text-gray-400">
            <div className="w-8 h-8 border-2 border-acca-red border-t-transparent rounded-full animate-spin" />
            <span className="text-xs">Loading PDF document...</span>
          </div>
        )}

        {errorMessage && (
          <div className="max-w-md my-auto p-6 bg-[#1a1a22] border border-rose-800/60 rounded-xl text-center space-y-3 text-gray-300 shadow-2xl">
            <AlertCircle className="w-8 h-8 text-acca-red mx-auto" />
            <h4 className="font-bold text-white text-sm">Unable to Read Document</h4>
            <p className="text-xs text-gray-400 leading-relaxed">{errorMessage}</p>
            <p className="text-[11px] text-gray-500">
              Ensure you import standard, non-password-protected PDF study materials.
            </p>
          </div>
        )}

        <canvas
          ref={canvasRef}
          className={`shadow-2xl bg-white rounded-xs transition-opacity duration-200 mx-auto ${
            loading || errorMessage ? 'hidden' : 'block'
          }`}
        />
      </div>
    </div>
  );
};
