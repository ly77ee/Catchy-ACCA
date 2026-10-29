import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import 'pdfjs-dist/web/pdf_viewer.css';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  FileText,
  AlertCircle,
  X,
  BookOpen,
  RotateCcw,
  MoveHorizontal,
  Search,
  Highlighter,
  Trash2,
  Check
} from 'lucide-react';
import { StudyMaterial, DocumentAnnotation, HighlightRect, HighlightColor } from '../../types';
import { getAnnotationsForMaterial, saveAnnotation, deleteAnnotation } from '../../db';

// Safely configure PDF.js worker (browser only; in node/jsdom test environments, keep default)
if (typeof window !== 'undefined' && !(window as any).process?.versions?.node && pdfjsLib.GlobalWorkerOptions) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  } catch {
    // Non-fatal fallback
  }
}

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

interface SelectionPopupState {
  pageNumber: number;
  x: number;
  y: number;
  text: string;
  rects: HighlightRect[];
}

interface SearchMatch {
  pageNumber: number;
  matchIndex: number;
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [numPages, setNumPages] = useState<number>(material.totalPages || 0);
  const [scale, setScale] = useState<number>(initialScale);
  const [pageInput, setPageInput] = useState<string>(String(initialPage));
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Visible pages tracking for lazy rendering
  const [visiblePages, setVisiblePages] = useState<Set<number>>(new Set([initialPage]));

  // Persistent annotations / highlights
  const [annotations, setAnnotations] = useState<DocumentAnnotation[]>([]);
  const [selectionPopup, setSelectionPopup] = useState<SelectionPopupState | null>(null);
  const [activeHighlightInfo, setActiveHighlightInfo] = useState<{ id: string; x: number; y: number; text: string } | null>(null);

  // In-document text search
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchMatches, setSearchMatches] = useState<SearchMatch[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState<number>(-1);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Synchronize incoming scale changes
  useEffect(() => {
    if (initialScale && Math.abs(initialScale - scale) > 0.05) {
      setScale(initialScale);
    }
  }, [initialScale]);

  // Load annotations from DB for this material
  useEffect(() => {
    let isCancelled = false;
    const loadAnnotations = async () => {
      try {
        const loaded = await getAnnotationsForMaterial(material.id);
        if (!isCancelled) {
          setAnnotations(loaded);
        }
      } catch (err) {
        console.error('Failed to load annotations:', err);
      }
    };
    loadAnnotations();
    return () => {
      isCancelled = true;
    };
  }, [material.id]);

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
        setVisiblePages(new Set([validInitial, validInitial + 1]));
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

  // Continuous Scroll: IntersectionObserver to detect currently visible page
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !pdfDoc || numPages <= 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleSet = new Set<number>(visiblePages);
        let maxRatio = 0;
        let mostVisiblePage = currentPage;

        entries.forEach((entry) => {
          const pageNum = Number(entry.target.getAttribute('data-page-number'));
          if (!pageNum) return;

          if (entry.isIntersecting) {
            visibleSet.add(pageNum);
            // Pre-load adjacent pages
            if (pageNum > 1) visibleSet.add(pageNum - 1);
            if (pageNum < numPages) visibleSet.add(pageNum + 1);

            if (entry.intersectionRatio > maxRatio) {
              maxRatio = entry.intersectionRatio;
              mostVisiblePage = pageNum;
            }
          }
        });

        setVisiblePages(visibleSet);

        if (mostVisiblePage && mostVisiblePage !== currentPage && maxRatio > 0.2) {
          setCurrentPage(mostVisiblePage);
          setPageInput(String(mostVisiblePage));
          onPageChange?.(mostVisiblePage);
        }
      },
      {
        root: container,
        threshold: [0.1, 0.3, 0.6, 0.9],
        rootMargin: '400px 0px',
      }
    );

    pageRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => {
      observer.disconnect();
    };
  }, [pdfDoc, numPages, currentPage, onPageChange]);

  // Navigate to a specific page smoothly
  const scrollToPage = useCallback((pageNum: number) => {
    if (pageNum < 1 || pageNum > numPages) return;
    const targetEl = pageRefs.current.get(pageNum);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setCurrentPage(pageNum);
    setPageInput(String(pageNum));
    onPageChange?.(pageNum);
  }, [numPages, onPageChange]);

  // Handle page input submit
  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(pageInput, 10);
    if (!isNaN(p) && p >= 1 && p <= numPages) {
      scrollToPage(p);
    } else {
      setPageInput(String(currentPage));
    }
  };

  // Zoom scale controls
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

  // Text selection handler on page container
  const handlePageMouseUp = (pageNum: number, e: React.MouseEvent<HTMLDivElement>) => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      setSelectionPopup(null);
      return;
    }

    const text = selection.toString().trim();
    if (text.length === 0) {
      setSelectionPopup(null);
      return;
    }

    const range = selection.getRangeAt(0);
    const pageEl = pageRefs.current.get(pageNum);
    if (!pageEl || !pageEl.contains(range.commonAncestorContainer)) {
      setSelectionPopup(null);
      return;
    }

    const pageRect = pageEl.getBoundingClientRect();
    const clientRects = Array.from(range.getClientRects());
    if (clientRects.length === 0) return;

    const rects: HighlightRect[] = clientRects.map((r) => ({
      left: Math.max(0, Math.min(100, ((r.left - pageRect.left) / pageRect.width) * 100)),
      top: Math.max(0, Math.min(100, ((r.top - pageRect.top) / pageRect.height) * 100)),
      width: Math.max(0, Math.min(100, (r.width / pageRect.width) * 100)),
      height: Math.max(0, Math.min(100, (r.height / pageRect.height) * 100)),
    }));

    const first = clientRects[0];
    setSelectionPopup({
      pageNumber: pageNum,
      x: first.left + first.width / 2,
      y: first.top - 10,
      text,
      rects,
    });
  };

  // Create and save highlight
  const handleApplyHighlight = async (color: HighlightColor) => {
    if (!selectionPopup) return;

    const newAnnot: DocumentAnnotation = {
      id: 'annot-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      materialId: material.id,
      pageNumber: selectionPopup.pageNumber,
      text: selectionPopup.text,
      color,
      rects: selectionPopup.rects,
      createdAt: new Date().toISOString(),
    };

    await saveAnnotation(newAnnot);
    setAnnotations((prev) => [...prev, newAnnot]);
    setSelectionPopup(null);
    window.getSelection()?.removeAllRanges();
  };

  // Delete highlight
  const handleDeleteHighlight = async (id: string) => {
    await deleteAnnotation(id);
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
    setActiveHighlightInfo(null);
  };

  // Document Text Search
  const handleSearch = async () => {
    if (!pdfDoc || !searchQuery.trim()) return;
    setIsSearching(true);
    const query = searchQuery.toLowerCase().trim();
    const matches: SearchMatch[] = [];

    try {
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str || '')
          .join(' ')
          .toLowerCase();

        if (pageText.includes(query)) {
          matches.push({ pageNumber: i, matchIndex: matches.length });
        }
      }

      setSearchMatches(matches);
      if (matches.length > 0) {
        setCurrentMatchIndex(0);
        scrollToPage(matches[0].pageNumber);
      } else {
        setCurrentMatchIndex(-1);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleNextMatch = () => {
    if (searchMatches.length === 0) return;
    const nextIdx = (currentMatchIndex + 1) % searchMatches.length;
    setCurrentMatchIndex(nextIdx);
    scrollToPage(searchMatches[nextIdx].pageNumber);
  };

  const handlePrevMatch = () => {
    if (searchMatches.length === 0) return;
    const prevIdx = (currentMatchIndex - 1 + searchMatches.length) % searchMatches.length;
    setCurrentMatchIndex(prevIdx);
    scrollToPage(searchMatches[prevIdx].pageNumber);
  };

  const pagesArray = Array.from({ length: numPages }, (_, i) => i + 1);

  return (
    <div className="flex flex-col w-full h-full bg-[#141419] rounded-2xl overflow-hidden shadow-2xl border border-[#2a2a34] relative">
      {/* Top Controls Toolbar */}
      <div className="bg-[#1e1e24] border-b border-[#2a2a34] px-3.5 py-2 flex flex-wrap items-center justify-between text-white text-xs select-none gap-2 shrink-0">
        {/* Document Title & Paper Badge */}
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
            type="button"
            onClick={() => scrollToPage(currentPage - 1)}
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
            type="button"
            onClick={() => scrollToPage(currentPage + 1)}
            disabled={currentPage >= numPages || loading}
            className="p-1 rounded bg-[#141419] hover:bg-[#25252e] border border-[#2a2a34] disabled:opacity-30 disabled:hover:bg-[#141419] transition-colors"
            title="Next Page"
            aria-label="Next Page"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Zoom, Search & Action Controls */}
        <div className="flex items-center space-x-1">
          {/* Search Toggle */}
          <button
            type="button"
            onClick={() => setShowSearch(!showSearch)}
            className={`p-1 rounded border transition-colors ${
              showSearch
                ? 'bg-acca-red text-white border-acca-red'
                : 'bg-[#141419] hover:bg-[#25252e] border-[#2a2a34] text-gray-300'
            }`}
            title="Search in Document"
            aria-label="Search Document"
          >
            <Search className="w-3.5 h-3.5" />
          </button>

          <span className="w-px h-3.5 bg-[#2a2a34] mx-0.5" />

          {/* Zoom Out */}
          <button
            type="button"
            onClick={zoomOut}
            className="p-1 rounded bg-[#141419] hover:bg-[#25252e] border border-[#2a2a34] transition-colors"
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-gray-400 text-[11px] w-9 text-center font-mono">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={zoomIn}
            className="p-1 rounded bg-[#141419] hover:bg-[#25252e] border border-[#2a2a34] transition-colors"
            title="Zoom In"
            aria-label="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={fitToWidth}
            className="p-1 rounded bg-[#141419] hover:bg-[#25252e] border border-[#2a2a34] transition-colors text-gray-300 hover:text-white"
            title="Fit to Width"
            aria-label="Fit to Width"
          >
            <MoveHorizontal className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={resetZoom}
            className="p-1 rounded bg-[#141419] hover:bg-[#25252e] border border-[#2a2a34] transition-colors text-gray-300 hover:text-white"
            title="Reset Zoom to 100%"
            aria-label="Reset Zoom"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {annotations.length > 0 && (
            <span
              className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20"
              title={`${annotations.length} highlights saved locally in this document`}
            >
              {annotations.length} {annotations.length === 1 ? 'mark' : 'marks'}
            </span>
          )}

          {onSelectForQuestion && (
            <button
              type="button"
              onClick={() => onSelectForQuestion(currentPage)}
              className="ml-1 bg-acca-red hover:bg-acca-red-hover text-white px-2 py-0.5 rounded text-[11px] font-semibold flex items-center space-x-1 transition-colors"
            >
              <BookOpen className="w-3 h-3" />
              <span>Link P.{currentPage}</span>
            </button>
          )}

          {onClose && (
            <button
              type="button"
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

      {/* Expandable Document Search Bar */}
      {showSearch && (
        <div className="bg-[#181820] border-b border-[#282836] px-3.5 py-1.5 flex items-center justify-between gap-2 text-xs text-white">
          <div className="flex items-center space-x-2 flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
              placeholder="Find text in document..."
              className="flex-1 bg-[#121217] border border-[#2a2a34] rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-acca-red"
            />
            <button
              type="button"
              onClick={handleSearch}
              disabled={isSearching || !searchQuery.trim()}
              className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 rounded text-[11px] font-semibold"
            >
              {isSearching ? 'Searching...' : 'Find'}
            </button>
          </div>

          <div className="flex items-center space-x-2 text-[11px] text-gray-400">
            {searchMatches.length > 0 ? (
              <span>
                {currentMatchIndex + 1} of {searchMatches.length} pages
              </span>
            ) : (
              searchQuery && !isSearching && <span>No matches</span>
            )}
            <button
              type="button"
              onClick={handlePrevMatch}
              disabled={searchMatches.length === 0}
              className="p-1 rounded bg-[#121217] border border-[#2a2a34] disabled:opacity-30"
              title="Previous Match"
            >
              <ChevronLeft className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={handleNextMatch}
              disabled={searchMatches.length === 0}
              className="p-1 rounded bg-[#121217] border border-[#2a2a34] disabled:opacity-30"
              title="Next Match"
            >
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Main Continuous Scroll Viewport */}
      <div
        ref={containerRef}
        tabIndex={0}
        aria-label="PDF Content Scroll Viewport"
        className="flex-1 overflow-y-auto bg-[#0d0d11] p-4 flex flex-col items-center relative outline-none select-text space-y-6"
      >
        {loading && (
          <div className="flex flex-col items-center justify-center my-auto space-y-3 text-gray-400">
            <div className="w-8 h-8 border-2 border-acca-red border-t-transparent rounded-full animate-spin" />
            <span className="text-xs">Loading PDF document pages...</span>
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

        {/* Continuous Multi-Page List */}
        {!loading && !errorMessage && pdfDoc && (
          <div className="flex flex-col items-center space-y-6 w-full max-w-full">
            {pagesArray.map((pageNum) => {
              const pageAnnotations = annotations.filter((a) => a.pageNumber === pageNum);
              return (
                <PdfSinglePageView
                  key={`pdf-page-${pageNum}`}
                  pdfDoc={pdfDoc}
                  pageNumber={pageNum}
                  scale={scale}
                  isVisible={visiblePages.has(pageNum)}
                  annotations={pageAnnotations}
                  onMouseUp={(e) => handlePageMouseUp(pageNum, e)}
                  onHighlightClick={(annot, e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setActiveHighlightInfo({
                      id: annot.id,
                      x: rect.left + rect.width / 2,
                      y: rect.top - 8,
                      text: annot.text,
                    });
                  }}
                  setRef={(el) => {
                    if (el) pageRefs.current.set(pageNum, el);
                    else pageRefs.current.delete(pageNum);
                  }}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Text Selection Floating Highlight Menu */}
      {selectionPopup && (
        <div
          style={{
            position: 'fixed',
            left: `${selectionPopup.x}px`,
            top: `${selectionPopup.y}px`,
            transform: 'translate(-50%, -100%)',
          }}
          className="z-50 bg-[#1e1e24] text-white px-2.5 py-1.5 rounded-xl shadow-2xl border border-[#3a3a48] flex items-center space-x-2 animate-in fade-in zoom-in-95 duration-150"
        >
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center space-x-1">
            <Highlighter className="w-3 h-3 text-acca-red" />
            <span>Highlight</span>
          </span>
          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              onClick={() => handleApplyHighlight('yellow')}
              className="w-4 h-4 rounded-full bg-yellow-400 hover:scale-110 transition-transform shadow-xs border border-yellow-500"
              title="Yellow Highlight"
            />
            <button
              type="button"
              onClick={() => handleApplyHighlight('green')}
              className="w-4 h-4 rounded-full bg-emerald-400 hover:scale-110 transition-transform shadow-xs border border-emerald-500"
              title="Green Highlight"
            />
            <button
              type="button"
              onClick={() => handleApplyHighlight('pink')}
              className="w-4 h-4 rounded-full bg-pink-400 hover:scale-110 transition-transform shadow-xs border border-pink-500"
              title="Pink Highlight"
            />
            <button
              type="button"
              onClick={() => handleApplyHighlight('blue')}
              className="w-4 h-4 rounded-full bg-sky-400 hover:scale-110 transition-transform shadow-xs border border-sky-500"
              title="Blue Highlight"
            />
          </div>
          <button
            type="button"
            onClick={() => setSelectionPopup(null)}
            className="text-gray-400 hover:text-white p-0.5"
            title="Dismiss"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Highlight Details / Delete Popover */}
      {activeHighlightInfo && (
        <div
          style={{
            position: 'fixed',
            left: `${activeHighlightInfo.x}px`,
            top: `${activeHighlightInfo.y}px`,
            transform: 'translate(-50%, -100%)',
          }}
          className="z-50 bg-[#181820] text-gray-200 px-3 py-1.5 rounded-xl shadow-2xl border border-[#3a3a48] flex items-center space-x-2 text-xs animate-in fade-in zoom-in-95"
        >
          <span className="truncate max-w-[180px] text-[11px] text-gray-300 italic">
            "{activeHighlightInfo.text}"
          </span>
          <button
            type="button"
            onClick={() => handleDeleteHighlight(activeHighlightInfo.id)}
            className="px-2 py-0.5 rounded bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 text-[10px] font-bold flex items-center space-x-1"
          >
            <Trash2 className="w-3 h-3" />
            <span>Remove</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveHighlightInfo(null)}
            className="text-gray-400 hover:text-white p-0.5"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Single PDF Page Component (Canvas + TextLayer + Persistent Highlight Overlays)
// ============================================================================

interface PdfSinglePageViewProps {
  pdfDoc: pdfjsLib.PDFDocumentProxy;
  pageNumber: number;
  scale: number;
  isVisible: boolean;
  annotations: DocumentAnnotation[];
  onMouseUp: (e: React.MouseEvent<HTMLDivElement>) => void;
  onHighlightClick: (annot: DocumentAnnotation, e: React.MouseEvent<HTMLDivElement>) => void;
  setRef: (el: HTMLDivElement | null) => void;
}

const PdfSinglePageView: React.FC<PdfSinglePageViewProps> = ({
  pdfDoc,
  pageNumber,
  scale,
  isVisible,
  annotations,
  onMouseUp,
  onHighlightClick,
  setRef,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textLayerRef = useRef<HTMLDivElement | null>(null);
  const renderTaskRef = useRef<any>(null);
  const textLayerRenderTaskRef = useRef<any>(null);

  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 612 * scale,
    height: 792 * scale,
  });

  useEffect(() => {
    let isCancelled = false;

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(pageNumber);
        if (isCancelled) return;

        const viewport = page.getViewport({ scale });
        setDimensions({ width: viewport.width, height: viewport.height });

        // If not visible in/near viewport, skip expensive canvas & text layer rendering
        if (!isVisible) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        if (!context) return;

        // Cancel previous rendering tasks if running
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch {}
        }
        if (textLayerRenderTaskRef.current) {
          try {
            textLayerRenderTaskRef.current.cancel();
          } catch {}
        }

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

        const task = page.render(renderContext);
        renderTaskRef.current = task;
        await task.promise;

        if (isCancelled) return;

        // Render text layer for text selection and search
        if (textLayerRef.current) {
          textLayerRef.current.innerHTML = '';
          const textContent = await page.getTextContent();
          if (isCancelled || !textLayerRef.current) return;

          textLayerRef.current.innerHTML = '';
          const textTask = pdfjsLib.renderTextLayer({
            textContentSource: textContent,
            container: textLayerRef.current,
            viewport: viewport,
            textDivs: [],
          });
          textLayerRenderTaskRef.current = textTask;
          await textTask.promise;
        }
      } catch (err: any) {
        if (!isCancelled && err?.name !== 'RenderingCancelledException') {
          console.error(`Page ${pageNumber} render error:`, err);
        }
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
      }
      if (textLayerRenderTaskRef.current) {
        try {
          textLayerRenderTaskRef.current.cancel();
        } catch {}
      }
    };
  }, [pdfDoc, pageNumber, scale, isVisible]);

  return (
    <div
      ref={setRef}
      id={`pdf-page-${pageNumber}`}
      data-page-number={pageNumber}
      onMouseUp={onMouseUp}
      style={{
        width: `${dimensions.width}px`,
        minHeight: `${dimensions.height}px`,
        ['--scale-factor' as any]: scale,
      }}
      className="relative bg-white shadow-2xl rounded-xs overflow-hidden mx-auto transition-all"
    >
      {/* Page Canvas */}
      <canvas
        ref={canvasRef}
        className="block bg-white"
        style={{
          width: `${dimensions.width}px`,
          height: `${dimensions.height}px`,
        }}
      />

      {/* PDF.js Selectable Text Layer */}
      <div
        ref={textLayerRef}
        className="textLayer absolute inset-0 select-text pointer-events-auto"
        style={{
          width: `${dimensions.width}px`,
          height: `${dimensions.height}px`,
          ['--scale-factor' as any]: scale,
        }}
      />

      {/* Persistent Highlights Overlay Layer */}
      <div className="absolute inset-0 pointer-events-none z-20">
        {annotations.map((annot) =>
          annot.rects.map((r, i) => (
            <div
              key={`${annot.id}-${i}`}
              onClick={(e) => onHighlightClick(annot, e)}
              title={`Highlight: "${annot.text}" (Click to manage)`}
              style={{
                position: 'absolute',
                left: `${r.left}%`,
                top: `${r.top}%`,
                width: `${r.width}%`,
                height: `${r.height}%`,
              }}
              className={`pointer-events-auto cursor-pointer rounded-xs transition-opacity hover:opacity-75 ${
                annot.color === 'yellow'
                  ? 'bg-yellow-300/40 border-b border-yellow-400'
                  : annot.color === 'green'
                  ? 'bg-emerald-300/40 border-b border-emerald-400'
                  : annot.color === 'pink'
                  ? 'bg-pink-300/40 border-b border-pink-400'
                  : 'bg-sky-300/40 border-b border-sky-400'
              }`}
            />
          ))
        )}
      </div>

      {/* Bottom Page Number Watermark */}
      <div className="absolute bottom-1 right-2 text-[10px] text-gray-400 select-none pointer-events-none font-mono">
        Page {pageNumber}
      </div>
    </div>
  );
};
