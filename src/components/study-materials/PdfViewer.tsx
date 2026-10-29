import React, { useEffect, useRef, useState } from 'react';
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
  Search,
  BookOpen
} from 'lucide-react';
import { StudyMaterial } from '../../types';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface PdfViewerProps {
  material: StudyMaterial;
  initialPage?: number;
  onClose?: () => void;
  onSelectForQuestion?: (page: number) => void;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  material,
  initialPage = 1,
  onClose,
  onSelectForQuestion,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [numPages, setNumPages] = useState<number>(material.totalPages || 0);
  const [scale, setScale] = useState<number>(1.2);
  const [pageInput, setPageInput] = useState<string>(String(initialPage));
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

        const loadingTask = pdfjsLib.getDocument({ data });
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
  }, [material, initialPage]);

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

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= numPages) {
      setCurrentPage(newPage);
      setPageInput(String(newPage));
      containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(pageInput, 10);
    if (!isNaN(p)) {
      handlePageChange(p);
    } else {
      setPageInput(String(currentPage));
    }
  };

  const zoomIn = () => setScale(prev => Math.min(prev + 0.25, 3.0));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5));
  const resetZoom = () => setScale(1.2);

  return (
    <div className="flex flex-col h-[82vh] bg-neutral-900 rounded-2xl overflow-hidden shadow-2xl border border-neutral-700">
      {/* Top Controls Toolbar */}
      <div className="bg-neutral-800 border-b border-neutral-700 px-4 py-2.5 flex items-center justify-between text-white text-xs select-none">
        {/* Document Title & Badge */}
        <div className="flex items-center space-x-3 truncate max-w-sm">
          <FileText className="w-4 h-4 text-acca-red shrink-0" />
          <span className="font-semibold text-gray-200 truncate">{material.title}</span>
          {material.paperId && (
            <span className="bg-neutral-700 px-2 py-0.5 rounded text-[10px] font-bold text-gray-300 shrink-0">
              {material.paperId}
            </span>
          )}
        </div>

        {/* Page Navigation Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1 || loading}
            className="p-1.5 rounded hover:bg-neutral-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <form onSubmit={handlePageInputSubmit} className="flex items-center space-x-1">
            <input
              type="text"
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              className="w-12 text-center bg-neutral-700 border border-neutral-600 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none focus:border-acca-red"
            />
            <span className="text-gray-400">/ {numPages || '—'}</span>
          </form>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= numPages || loading}
            className="p-1.5 rounded hover:bg-neutral-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Zoom & Action Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={zoomOut}
            className="p-1.5 rounded hover:bg-neutral-700 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-gray-400 w-12 text-center">{Math.round(scale * 100)}%</span>
          <button
            onClick={zoomIn}
            className="p-1.5 rounded hover:bg-neutral-700 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={resetZoom}
            className="p-1.5 rounded hover:bg-neutral-700 transition-colors"
            title="Reset Zoom"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          {onSelectForQuestion && (
            <button
              onClick={() => onSelectForQuestion(currentPage)}
              className="ml-2 bg-acca-red hover:bg-acca-red-dark text-white px-2.5 py-1 rounded text-xs font-semibold flex items-center space-x-1 transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Link Page {currentPage}</span>
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="ml-3 p-1.5 rounded text-gray-400 hover:text-white hover:bg-neutral-700 transition-colors"
              title="Close Viewer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Canvas Viewport */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-neutral-950 p-6 flex items-center justify-center relative min-h-[400px]"
      >
        {loading && (
          <div className="flex flex-col items-center space-y-3 text-gray-400">
            <div className="w-8 h-8 border-2 border-acca-red border-t-transparent rounded-full animate-spin" />
            <span className="text-xs">Loading PDF document...</span>
          </div>
        )}

        {errorMessage && (
          <div className="max-w-md p-6 bg-neutral-900 border border-red-800/60 rounded-xl text-center space-y-3 text-gray-300">
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
          className={`shadow-2xl bg-white rounded-xs transition-opacity duration-200 ${
            loading || errorMessage ? 'hidden' : 'block'
          }`}
        />
      </div>
    </div>
  );
};
