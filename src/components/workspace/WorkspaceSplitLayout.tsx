import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FileText,
  Table2,
  PenTool,
  BookOpen,
  ChevronDown,
  GripVertical,
  ExternalLink,
  Layers,
  AlertCircle
} from 'lucide-react';
import { StudyMaterial, QualificationVersion } from '../../types';
import { PdfViewer } from '../study-materials/PdfViewer';
import { getMaterialDisplayName, formatFileSize } from '../../config/studyMaterials';

interface WorkspaceSplitLayoutProps {
  workspaceType: 'excel' | 'word';
  studyMaterials: StudyMaterial[];
  selectedMaterialId: string | null;
  onSelectMaterial: (id: string | null) => void;
  onNavigateToStudyMaterials: () => void;
  onSwitchWorkspace: (type: 'excel' | 'word') => void;
  version: QualificationVersion;
  children: React.ReactNode;
}

const SPLIT_STORAGE_KEY = 'catchy_workspace_split_ratio';
const DEFAULT_SPLIT_RATIO = 45; // 45% document, 55% editor
const MIN_SPLIT_RATIO = 25;
const MAX_SPLIT_RATIO = 75;

export const WorkspaceSplitLayout: React.FC<WorkspaceSplitLayoutProps> = ({
  workspaceType,
  studyMaterials,
  selectedMaterialId,
  onSelectMaterial,
  onNavigateToStudyMaterials,
  onSwitchWorkspace,
  version,
  children,
}) => {
  // Draggable split ratio state (restored from localStorage)
  const [splitRatio, setSplitRatio] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(SPLIT_STORAGE_KEY);
      if (saved) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed >= MIN_SPLIT_RATIO && parsed <= MAX_SPLIT_RATIO) {
          return parsed;
        }
      }
    } catch {
      // fallback
    }
    return DEFAULT_SPLIT_RATIO;
  });

  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Independent viewer state per document: tracks page and zoom per material ID
  const [viewerStateMap, setViewerStateMap] = useState<Record<string, { page: number; scale: number }>>({});

  // Auto-select first material if none selected and materials are available
  useEffect(() => {
    if (!selectedMaterialId && studyMaterials.length > 0) {
      onSelectMaterial(studyMaterials[0].id);
    }
  }, [studyMaterials, selectedMaterialId, onSelectMaterial]);

  // Find currently active material
  const currentMaterial = studyMaterials.find((m) => m.id === selectedMaterialId) || null;

  // Track page change for current document
  const handlePageChange = useCallback((page: number) => {
    if (!selectedMaterialId) return;
    setViewerStateMap((prev) => ({
      ...prev,
      [selectedMaterialId]: {
        page,
        scale: prev[selectedMaterialId]?.scale || 1.2,
      },
    }));
  }, [selectedMaterialId]);

  // Track zoom change for current document
  const handleScaleChange = useCallback((scale: number) => {
    if (!selectedMaterialId) return;
    setViewerStateMap((prev) => ({
      ...prev,
      [selectedMaterialId]: {
        page: prev[selectedMaterialId]?.page || 1,
        scale,
      },
    }));
  }, [selectedMaterialId]);

  // Divider drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const relativeX = e.clientX - rect.left;
      const rawRatio = (relativeX / rect.width) * 100;
      const clamped = Math.max(MIN_SPLIT_RATIO, Math.min(MAX_SPLIT_RATIO, rawRatio));
      setSplitRatio(clamped);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      try {
        localStorage.setItem(SPLIT_STORAGE_KEY, splitRatio.toString());
      } catch {
        // Ignore storage errors
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, splitRatio]);

  const activeViewerState = (selectedMaterialId && viewerStateMap[selectedMaterialId]) || { page: 1, scale: 1.2 };

  return (
    <div className="flex flex-col w-full h-[calc(100vh-65px)] bg-[#0d0d11] overflow-hidden select-none">
      {/* Compact Workspace Header Bar */}
      <header className="h-12 bg-[#18181f] border-b border-[#282834] px-4 flex items-center justify-between shrink-0 z-10 text-xs">
        {/* Left: Workspace Title & Shared Material Selector */}
        <div className="flex items-center space-x-3 min-w-0">
          <div className="flex items-center space-x-2 shrink-0">
            {workspaceType === 'excel' ? (
              <div className="p-1.5 bg-emerald-500/15 text-emerald-400 rounded-lg border border-emerald-500/30">
                <Table2 className="w-4 h-4" />
              </div>
            ) : (
              <div className="p-1.5 bg-acca-red/15 text-acca-red rounded-lg border border-acca-red/30">
                <PenTool className="w-4 h-4" />
              </div>
            )}
            <span className="font-bold text-white text-sm hidden sm:inline">
              {workspaceType === 'excel' ? 'Excel Financial Workspace' : 'Word Answer Writer'}
            </span>
          </div>

          <span className="text-[#3a3a4c] font-light hidden sm:inline">|</span>

          {/* Shared Study Material Selector */}
          <div className="flex items-center space-x-2 min-w-0">
            <span className="text-gray-400 text-xs font-medium hidden md:inline">
              Reference Document:
            </span>

            {studyMaterials.length > 0 ? (
              <div className="relative">
                <select
                  value={selectedMaterialId || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '__manage__') {
                      onNavigateToStudyMaterials();
                    } else {
                      onSelectMaterial(val || null);
                    }
                  }}
                  aria-label="Select reference study material"
                  className="bg-[#121217] hover:bg-[#1e1e26] text-white text-xs font-semibold rounded-xl pl-3 pr-8 py-1.5 border border-[#323242] focus:outline-none focus:border-acca-red transition-colors cursor-pointer truncate max-w-[240px] sm:max-w-[320px]"
                >
                  {studyMaterials.map((m, idx) => (
                    <option key={m.id} value={m.id}>
                      {getMaterialDisplayName(m, idx)} ({m.paperId || 'All'})
                    </option>
                  ))}
                  <option value="__manage__">+ Manage Study Materials Library...</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            ) : (
              <button
                onClick={onNavigateToStudyMaterials}
                className="text-xs text-amber-400 hover:text-amber-300 bg-amber-500/10 border border-amber-500/25 px-2.5 py-1 rounded-xl flex items-center space-x-1.5 transition-colors"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>No PDF uploaded · Click to import in Study Materials</span>
              </button>
            )}

            {currentMaterial && (
              <span className="text-[11px] text-gray-500 hidden xl:inline">
                {currentMaterial.totalPages} pages · {formatFileSize(currentMaterial.fileSize)}
              </span>
            )}
          </div>
        </div>

        {/* Right: Workspace Switcher Controls */}
        <div className="flex items-center space-x-2 shrink-0">
          <div className="bg-[#121217] p-0.5 rounded-xl border border-[#2a2a38] flex items-center">
            <button
              onClick={() => onSwitchWorkspace('excel')}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all ${
                workspaceType === 'excel'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Switch to Excel Workspace"
            >
              <Table2 className="w-3.5 h-3.5" />
              <span>Excel</span>
            </button>
            <button
              onClick={() => onSwitchWorkspace('word')}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all ${
                workspaceType === 'word'
                  ? 'bg-acca-red text-white shadow-xs'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Switch to Word Workspace"
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Word</span>
            </button>
          </div>

          <button
            onClick={onNavigateToStudyMaterials}
            className="p-1.5 bg-[#1e1e26] hover:bg-[#282834] text-gray-400 hover:text-white rounded-xl border border-[#2e2e3e] transition-colors"
            title="Open Study Materials Library"
          >
            <BookOpen className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Full-Screen Split Workspace Area */}
      <div
        ref={containerRef}
        className={`flex-1 flex w-full overflow-hidden relative ${
          isDragging ? 'select-none pointer-events-none' : ''
        }`}
      >
        {/* Left Panel: Selected Original Study Document */}
        <div
          style={{ width: `${splitRatio}%` }}
          className="h-full flex flex-col min-w-[280px] overflow-hidden p-2 bg-[#0e0e13]"
        >
          {currentMaterial ? (
            <PdfViewer
              material={currentMaterial}
              initialPage={activeViewerState.page}
              initialScale={activeViewerState.scale}
              onPageChange={handlePageChange}
              onScaleChange={handleScaleChange}
              isCompact={true}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center bg-[#141419] rounded-2xl border border-[#2a2a34] text-gray-400 space-y-3">
              <BookOpen className="w-10 h-10 text-gray-600 mx-auto" />
              <h3 className="text-base font-bold text-white">No Reference Document Selected</h3>
              <p className="text-xs text-gray-400 max-w-sm">
                Upload your ACCA exam kits or past papers in Study Materials to view them side-by-side with your workings.
              </p>
              <button
                onClick={onNavigateToStudyMaterials}
                className="px-4 py-2 bg-acca-red hover:bg-acca-red-hover text-white text-xs font-bold rounded-xl transition-all shadow-xs"
              >
                Go to Study Materials
              </button>
            </div>
          )}
        </div>

        {/* Draggable Vertical Divider */}
        <div
          onMouseDown={handleMouseDown}
          role="separator"
          aria-orientation="vertical"
          aria-valuenow={Math.round(splitRatio)}
          aria-valuemin={MIN_SPLIT_RATIO}
          aria-valuemax={MAX_SPLIT_RATIO}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') {
              setSplitRatio((prev) => Math.max(MIN_SPLIT_RATIO, prev - 2));
            } else if (e.key === 'ArrowRight') {
              setSplitRatio((prev) => Math.min(MAX_SPLIT_RATIO, prev + 2));
            }
          }}
          className={`w-2.5 hover:w-3 bg-[#181820] hover:bg-acca-red/80 active:bg-acca-red cursor-col-resize transition-all flex items-center justify-center shrink-0 z-20 group relative border-x border-[#282836] ${
            isDragging ? 'bg-acca-red w-3' : ''
          }`}
          title="Drag to resize document and editor panels"
        >
          <div className="w-1 h-8 rounded-full bg-gray-600 group-hover:bg-white transition-colors" />
        </div>

        {/* Right Panel: Working Spreadsheet or Word Editor */}
        <div
          style={{ width: `${100 - splitRatio}%` }}
          className="h-full flex flex-col min-w-[320px] overflow-hidden p-2 bg-[#0e0e13]"
        >
          {children}
        </div>
      </div>
    </div>
  );
};
