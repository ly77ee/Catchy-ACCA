import React, { useState, useRef } from 'react';
import {
  FileText,
  Upload,
  Trash2,
  Eye,
  Plus,
  BookOpen,
  Filter,
  Search,
  AlertTriangle,
  CheckCircle2,
  Edit2,
  RefreshCw,
  Table2,
  PenTool,
  Clock,
  HardDrive,
  Check
} from 'lucide-react';
import { StudyMaterial, QualificationVersion } from '../../types';
import { db, logActivity } from '../../db';
import { PdfViewer } from './PdfViewer';
import {
  MAX_STUDY_MATERIALS,
  MAX_PDF_FILE_SIZE_BYTES,
  MATERIAL_TYPE_OPTIONS,
  MaterialTypeOption,
  formatFileSize,
  getMaterialDisplayName
} from '../../config/studyMaterials';
import * as pdfjsLib from 'pdfjs-dist';

interface StudyMaterialsProps {
  version: QualificationVersion;
  materials: StudyMaterial[];
  selectedMaterialId?: string | null;
  targetPage?: number;
  onClearSelectedMaterial?: () => void;
  onOpenInExcel?: (materialId: string) => void;
  onOpenInWord?: (materialId: string) => void;
}

export const StudyMaterials: React.FC<StudyMaterialsProps> = ({
  version,
  materials,
  selectedMaterialId,
  targetPage = 1,
  onClearSelectedMaterial,
  onOpenInExcel,
  onOpenInWord,
}) => {
  const [activeViewerMaterial, setActiveViewerMaterial] = useState<StudyMaterial | null>(null);
  const [viewerPage, setViewerPage] = useState<number>(targetPage);

  // Synchronize incoming selected material from parent
  React.useEffect(() => {
    if (selectedMaterialId) {
      const match = materials.find(m => m.id === selectedMaterialId);
      if (match) {
        setActiveViewerMaterial(match);
        setViewerPage(targetPage || 1);
      }
    }
  }, [selectedMaterialId, targetPage, materials]);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterPaper, setFilterPaper] = useState('all');

  // Upload modal state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadPaperId, setUploadPaperId] = useState('FR');
  const [uploadMaterialType, setUploadMaterialType] = useState<MaterialTypeOption>('Exam Kit');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Edit metadata modal state
  const [editingMaterial, setEditingMaterial] = useState<StudyMaterial | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPaperId, setEditPaperId] = useState('');
  const [editMaterialType, setEditMaterialType] = useState<MaterialTypeOption>('Exam Kit');

  // Replace PDF modal state
  const [replacingMaterial, setReplacingMaterial] = useState<StudyMaterial | null>(null);
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [replaceError, setReplaceError] = useState<string | null>(null);
  const [isProcessingReplace, setIsProcessingReplace] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const replaceFileInputRef = useRef<HTMLInputElement | null>(null);

  // Validate and handle file input
  const processIncomingFile = (file: File): boolean => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setUploadError('Only valid PDF study documents are supported.');
      return false;
    }
    if (file.size > MAX_PDF_FILE_SIZE_BYTES) {
      setUploadError(`File exceeds the maximum limit of ${formatFileSize(MAX_PDF_FILE_SIZE_BYTES)}.`);
      return false;
    }
    setSelectedFile(file);
    setUploadError(null);
    if (!uploadTitle.trim()) {
      const defaultName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setUploadTitle(defaultName);
    }
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processIncomingFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processIncomingFile(file);
    }
  };

  // Save new upload
  const handleSaveUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (materials.length >= MAX_STUDY_MATERIALS) {
      setUploadError(`Limit reached: maximum of ${MAX_STUDY_MATERIALS} active study documents allowed.`);
      return;
    }

    if (!selectedFile) {
      setUploadError('Please select a PDF file to import.');
      return;
    }

    setIsProcessingFile(true);
    setUploadError(null);

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();

      // Configure worker for reading total pages
      if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
      }

      // Verify that the PDF is readable and extract numPages
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer.slice(0) });
      const pdfDoc = await loadingTask.promise;
      const totalPages = pdfDoc.numPages || 1;

      const newMaterial: StudyMaterial = {
        id: 'mat-' + Date.now(),
        title: uploadTitle.trim() || selectedFile.name,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        totalPages,
        paperId: uploadPaperId,
        materialType: uploadMaterialType,
        tags: [uploadPaperId, uploadMaterialType, 'PDF Reference'],
        addedAt: new Date().toISOString(),
        pdfData: arrayBuffer,
      };

      await db.studyMaterials.put(newMaterial);
      await logActivity(
        'Study PDF Imported',
        `Imported "${newMaterial.title}" (${totalPages} pages) for ${newMaterial.paperId}.`,
        'document'
      );

      setIsUploading(false);
      setSelectedFile(null);
      setUploadTitle('');
    } catch (err: any) {
      console.error('PDF parsing error:', err);
      setUploadError(`Failed to read PDF document: ${err.message || 'The file appears corrupted or invalid.'}`);
    } finally {
      setIsProcessingFile(false);
    }
  };

  // Edit material metadata
  const handleStartEdit = (mat: StudyMaterial) => {
    setEditingMaterial(mat);
    setEditTitle(mat.title);
    setEditPaperId(mat.paperId || 'FR');
    setEditMaterialType((mat.materialType as MaterialTypeOption) || 'Exam Kit');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMaterial) return;

    try {
      const updated: StudyMaterial = {
        ...editingMaterial,
        title: editTitle.trim() || editingMaterial.fileName,
        paperId: editPaperId,
        materialType: editMaterialType,
        tags: [editPaperId, editMaterialType, 'PDF Reference']
      };

      await db.studyMaterials.put(updated);
      await logActivity('Study Material Renamed', `Updated details for "${updated.title}".`, 'document');
      setEditingMaterial(null);
    } catch (err: any) {
      console.error('Error updating material metadata:', err);
    }
  };

  // Replace PDF file safely without changing ID
  const handleStartReplace = (mat: StudyMaterial) => {
    setReplacingMaterial(mat);
    setReplaceFile(null);
    setReplaceError(null);
  };

  const handleSaveReplace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replacingMaterial || !replaceFile) return;

    setIsProcessingReplace(true);
    setReplaceError(null);

    try {
      const arrayBuffer = await replaceFile.arrayBuffer();

      // Validate readability with PDF.js before modifying stored record
      if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
      }
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer.slice(0) });
      const pdfDoc = await loadingTask.promise;
      const totalPages = pdfDoc.numPages || 1;

      // Safe update: retain original ID and user-configured title
      const updated: StudyMaterial = {
        ...replacingMaterial,
        fileName: replaceFile.name,
        fileSize: replaceFile.size,
        totalPages,
        addedAt: new Date().toISOString(),
        pdfData: arrayBuffer
      };

      await db.studyMaterials.put(updated);
      await logActivity('Study PDF Replaced', `Replaced file for "${updated.title}" with "${replaceFile.name}" (${totalPages} pages).`, 'document');
      setReplacingMaterial(null);
      setReplaceFile(null);
    } catch (err: any) {
      console.error('Failed replacing PDF:', err);
      setReplaceError(`Replacement validation failed: ${err.message || 'File is not a readable PDF'}. Original file preserved.`);
    } finally {
      setIsProcessingReplace(false);
    }
  };

  // Delete material
  const handleDeleteMaterial = async (id: string, title: string) => {
    if (window.confirm(`Delete study material "${title}" from your local storage?\n\nYour written answers and spreadsheets will remain intact.`)) {
      await db.studyMaterials.delete(id);
      await logActivity('Study Material Deleted', `Deleted "${title}".`, 'document');
      if (activeViewerMaterial?.id === id) {
        setActiveViewerMaterial(null);
        onClearSelectedMaterial?.();
      }
    }
  };

  const filteredMaterials = materials.filter((m) => {
    const matchesSearch =
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.fileName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPaper = filterPaper === 'all' || m.paperId === filterPaper;
    return matchesSearch && matchesPaper;
  });

  const isLimitReached = materials.length >= MAX_STUDY_MATERIALS;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* If an active viewer is open, display it */}
      {activeViewerMaterial ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setActiveViewerMaterial(null);
                onClearSelectedMaterial?.();
              }}
              className="text-xs font-semibold text-gray-300 hover:text-white flex items-center space-x-1.5 bg-[#1e1e24] px-3.5 py-1.5 rounded-xl border border-[#2a2a34] transition-colors"
            >
              <span>← Back to Library</span>
            </button>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-400">
                Viewing: <strong className="text-white">{activeViewerMaterial.title}</strong>
              </span>
              {onOpenInExcel && (
                <button
                  onClick={() => onOpenInExcel(activeViewerMaterial.id)}
                  className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-xs font-bold rounded-lg border border-emerald-500/30 flex items-center space-x-1"
                >
                  <Table2 className="w-3.5 h-3.5" />
                  <span>Open in Excel</span>
                </button>
              )}
              {onOpenInWord && (
                <button
                  onClick={() => onOpenInWord(activeViewerMaterial.id)}
                  className="px-2.5 py-1 bg-acca-red/20 hover:bg-acca-red/30 text-acca-red text-xs font-bold rounded-lg border border-acca-red/30 flex items-center space-x-1"
                >
                  <PenTool className="w-3.5 h-3.5" />
                  <span>Open in Word</span>
                </button>
              )}
            </div>
          </div>

          <div className="h-[calc(100vh-230px)] min-h-[550px]">
            <PdfViewer
              material={activeViewerMaterial}
              initialPage={viewerPage}
              onClose={() => {
                setActiveViewerMaterial(null);
                onClearSelectedMaterial?.();
              }}
            />
          </div>
        </div>
      ) : (
        <>
          {/* Header Bar */}
          <div className="bg-[#1e1e24] rounded-2xl border border-[#2a2a34] p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-acca-red bg-acca-red/10 border border-acca-red/20 px-2.5 py-0.5 rounded-full">
                  {materials.length} of {MAX_STUDY_MATERIALS} materials used
                </span>
                <span className="text-xs text-gray-400">100% Private Local-First Storage</span>
              </div>
              <h1 className="text-xl md:text-2xl font-black text-white mt-1">
                Study Materials & Exam Kits Library
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                Upload up to 4 original PDFs once. Reference the exact same documents side-by-side in full-screen Excel and Word workspaces.
              </p>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={() => {
                  setUploadError(null);
                  setIsUploading(true);
                }}
                disabled={isLimitReached}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 shadow-xs transition-all ${
                  isLimitReached
                    ? 'bg-neutral-800 text-gray-500 cursor-not-allowed border border-[#2a2a34]'
                    : 'bg-acca-red hover:bg-acca-red-hover text-white'
                }`}
                title={isLimitReached ? `Limit of ${MAX_STUDY_MATERIALS} materials reached` : 'Import PDF'}
              >
                <Upload className="w-4 h-4" />
                <span>Import PDF Material</span>
              </button>
            </div>
          </div>

          {/* Limit Notice if Max is Reached */}
          {isLimitReached && (
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs text-amber-300 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  <strong>Four-Document Limit Reached:</strong> Catchy ACCA supports up to {MAX_STUDY_MATERIALS} active study documents in local browser storage ({materials.length} stored). To import another document, please replace or delete an existing material.
                </span>
              </div>
            </div>
          )}

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-500" />
              <input
                type="text"
                placeholder="Search materials by title or filename..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-[#1e1e24] border border-[#2a2a34] rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-acca-red"
              />
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={filterPaper}
                onChange={e => setFilterPaper(e.target.value)}
                aria-label="Filter by ACCA Paper"
                className="bg-[#1e1e24] border border-[#2a2a34] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-acca-red font-semibold"
              >
                <option value="all">All Papers</option>
                {version.papers.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.id} — {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Grid of Materials */}
          {filteredMaterials.length === 0 ? (
            <div className="bg-[#1e1e24] p-12 rounded-2xl border border-[#2a2a34] text-center space-y-3">
              <BookOpen className="w-8 h-8 text-gray-500 mx-auto" />
              <h3 className="text-base font-bold text-white">
                {materials.length === 0 ? 'No study documents imported yet' : 'No matching materials found'}
              </h3>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                {materials.length === 0
                  ? 'Import your ACCA exam kits or study texts. Documents are stored offline on your device and shared with Excel and Word.'
                  : 'Try clearing your search query or choosing another paper filter.'}
              </p>
              {materials.length === 0 && (
                <button
                  onClick={() => setIsUploading(true)}
                  className="px-4 py-2 bg-acca-red hover:bg-acca-red-hover text-white rounded-xl text-xs font-bold transition-all"
                >
                  Import First PDF
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredMaterials.map((material, idx) => {
                const displayName = getMaterialDisplayName(material, idx);
                return (
                  <div
                    key={material.id}
                    className="bg-[#1e1e24] rounded-2xl border border-[#2a2a34] hover:border-[#3d3d4d] p-5 shadow-lg transition-all flex flex-col justify-between group space-y-4"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-start justify-between mb-2.5">
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-acca-red bg-acca-red/10 border border-acca-red/20 px-2 py-0.5 rounded">
                            Material {idx + 1}
                          </span>
                          {material.materialType && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#141419] text-gray-400 border border-[#2a2a34]">
                              {material.materialType}
                            </span>
                          )}
                        </div>
                        {material.paperId && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#141419] text-gray-300 border border-[#2a2a34]">
                            {material.paperId}
                          </span>
                        )}
                      </div>

                      {/* Title and Original Filename */}
                      <h3 className="font-bold text-white text-base line-clamp-1 mb-1" title={material.title}>
                        {material.title}
                      </h3>
                      <p className="text-xs text-gray-500 truncate mb-3" title={material.fileName}>
                        {material.fileName}
                      </p>

                      {/* File Metadata & Availability */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400 border-t border-[#2a2a34] pt-2.5">
                        <span>{material.totalPages} Pages</span>
                        <span>•</span>
                        <span>{formatFileSize(material.fileSize)}</span>
                        <span>•</span>
                        <span className="text-emerald-400 font-semibold flex items-center">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1 inline" /> Available offline
                        </span>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#2a2a34]">
                      {/* Left: Open in Workspaces */}
                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => {
                            setActiveViewerMaterial(material);
                            setViewerPage(1);
                          }}
                          className="px-2.5 py-1.5 bg-[#141419] hover:bg-[#25252e] text-gray-300 hover:text-white rounded-lg text-xs font-bold border border-[#2a2a34] flex items-center space-x-1 transition-colors"
                          title="Read PDF in viewer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Read</span>
                        </button>

                        {onOpenInExcel && (
                          <button
                            onClick={() => onOpenInExcel(material.id)}
                            className="px-2.5 py-1.5 bg-emerald-600/15 hover:bg-emerald-600/30 text-emerald-400 rounded-lg text-xs font-bold border border-emerald-500/30 flex items-center space-x-1 transition-colors"
                            title="Open in Excel split workspace"
                          >
                            <Table2 className="w-3.5 h-3.5" />
                            <span>Excel</span>
                          </button>
                        )}

                        {onOpenInWord && (
                          <button
                            onClick={() => onOpenInWord(material.id)}
                            className="px-2.5 py-1.5 bg-acca-red/15 hover:bg-acca-red/30 text-acca-red rounded-lg text-xs font-bold border border-acca-red/30 flex items-center space-x-1 transition-colors"
                            title="Open in Word split workspace"
                          >
                            <PenTool className="w-3.5 h-3.5" />
                            <span>Word</span>
                          </button>
                        )}
                      </div>

                      {/* Right: Management Buttons */}
                      <div className="flex items-center space-x-1 text-gray-500">
                        <button
                          onClick={() => handleStartEdit(material)}
                          className="p-1.5 hover:text-white hover:bg-[#141419] rounded-lg transition-colors"
                          title="Edit title & metadata"
                          aria-label="Edit title and metadata"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleStartReplace(material)}
                          className="p-1.5 hover:text-white hover:bg-[#141419] rounded-lg transition-colors"
                          title="Replace PDF document"
                          aria-label="Replace PDF document"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDeleteMaterial(material.id, material.title)}
                          className="p-1.5 hover:text-rose-400 hover:bg-[#141419] rounded-lg transition-colors"
                          title="Delete material"
                          aria-label="Delete material"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Upload Modal */}
      {isUploading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[#1e1e24] border border-[#2a2a34] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#2a2a34]">
              <div className="flex items-center space-x-2">
                <Upload className="w-5 h-5 text-acca-red" />
                <h3 className="text-base font-bold text-white">Import PDF Study Document</h3>
              </div>
              <button
                onClick={() => setIsUploading(false)}
                className="text-gray-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            {isLimitReached ? (
              <div className="space-y-4 text-xs">
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 space-y-2">
                  <div className="flex items-center space-x-2 font-bold text-amber-400">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Four-Document Storage Limit Reached</span>
                  </div>
                  <p>
                    Catchy ACCA allows a maximum of <strong>4 active study documents</strong> in local offline storage ({materials.length} currently stored).
                  </p>
                  <p>
                    Please replace an existing material or delete an unused document before adding another.
                  </p>
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setIsUploading(false)}
                    className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl font-bold"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveUpload} className="space-y-4 text-xs">
                {uploadError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-gray-300 font-bold mb-1">
                    Document Display Title
                  </label>
                  <input
                    type="text"
                    value={uploadTitle}
                    onChange={e => setUploadTitle(e.target.value)}
                    placeholder="e.g. SBR Exam Kit 2026 / FR BPP Revision Text"
                    required
                    className="w-full bg-[#141419] border border-[#2a2a34] rounded-xl px-3 py-2 text-white outline-none focus:border-acca-red"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-300 font-bold mb-1">
                      ACCA Paper
                    </label>
                    <select
                      value={uploadPaperId}
                      onChange={e => setUploadPaperId(e.target.value)}
                      className="w-full bg-[#141419] border border-[#2a2a34] rounded-xl px-3 py-2 text-white outline-none focus:border-acca-red font-semibold"
                    >
                      {version.papers.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.id} — {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-300 font-bold mb-1">
                      Material Type
                    </label>
                    <select
                      value={uploadMaterialType}
                      onChange={e => setUploadMaterialType(e.target.value as MaterialTypeOption)}
                      className="w-full bg-[#141419] border border-[#2a2a34] rounded-xl px-3 py-2 text-white outline-none focus:border-acca-red font-semibold"
                    >
                      {MATERIAL_TYPE_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Drag and Drop Zone */}
                <div>
                  <label className="block text-gray-300 font-bold mb-1">
                    PDF Document (Max {formatFileSize(MAX_PDF_FILE_SIZE_BYTES)})
                  </label>
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
                      isDragOver
                        ? 'border-acca-red bg-acca-red/10'
                        : selectedFile
                        ? 'border-emerald-500/50 bg-emerald-500/5'
                        : 'border-[#2a2a34] hover:border-[#3d3d4d] bg-[#141419]'
                    }`}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept=".pdf,application/pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    {selectedFile ? (
                      <div className="space-y-1">
                        <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto" />
                        <div className="font-bold text-white text-xs">{selectedFile.name}</div>
                        <div className="text-[11px] text-gray-400">{formatFileSize(selectedFile.size)}</div>
                        <div className="text-[10px] text-gray-500">Click to choose another file</div>
                      </div>
                    ) : (
                      <div className="space-y-1 text-gray-400">
                        <FileText className="w-6 h-6 text-gray-500 mx-auto mb-1" />
                        <div className="font-semibold text-gray-200">
                          Click to select PDF or drag and drop here
                        </div>
                        <div className="text-[11px] text-gray-500">
                          Stored locally in your browser IndexedDB
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-2 border-t border-[#2a2a34]">
                  <button
                    type="button"
                    onClick={() => setIsUploading(false)}
                    className="px-4 py-2 bg-[#141419] hover:bg-[#25252e] text-gray-300 rounded-xl font-semibold border border-[#2a2a34]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessingFile || !selectedFile}
                    className="px-4 py-2 bg-acca-red hover:bg-acca-red-hover disabled:opacity-40 text-white rounded-xl font-bold flex items-center space-x-1.5"
                  >
                    {isProcessingFile ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Validating PDF...</span>
                      </>
                    ) : (
                      <span>Import Document</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Edit Metadata Modal */}
      {editingMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[#1e1e24] border border-[#2a2a34] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#2a2a34]">
              <div className="flex items-center space-x-2">
                <Edit2 className="w-4 h-4 text-acca-red" />
                <h3 className="text-base font-bold text-white">Edit Material Details</h3>
              </div>
              <button
                onClick={() => setEditingMaterial(null)}
                className="text-gray-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-300 font-bold mb-1">Display Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  required
                  className="w-full bg-[#141419] border border-[#2a2a34] rounded-xl px-3 py-2 text-white outline-none focus:border-acca-red"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-bold mb-1">ACCA Paper</label>
                <select
                  value={editPaperId}
                  onChange={e => setEditPaperId(e.target.value)}
                  className="w-full bg-[#141419] border border-[#2a2a34] rounded-xl px-3 py-2 text-white outline-none focus:border-acca-red font-semibold"
                >
                  {version.papers.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.id} — {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-300 font-bold mb-1">Material Type</label>
                <select
                  value={editMaterialType}
                  onChange={e => setEditMaterialType(e.target.value as MaterialTypeOption)}
                  className="w-full bg-[#141419] border border-[#2a2a34] rounded-xl px-3 py-2 text-white outline-none focus:border-acca-red font-semibold"
                >
                  {MATERIAL_TYPE_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#2a2a34]">
                <button
                  type="button"
                  onClick={() => setEditingMaterial(null)}
                  className="px-4 py-2 bg-[#141419] hover:bg-[#25252e] text-gray-300 rounded-xl font-semibold border border-[#2a2a34]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-acca-red hover:bg-acca-red-hover text-white rounded-xl font-bold"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Replace File Modal */}
      {replacingMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[#1e1e24] border border-[#2a2a34] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#2a2a34]">
              <div className="flex items-center space-x-2">
                <RefreshCw className="w-4 h-4 text-acca-red" />
                <h3 className="text-base font-bold text-white">Replace Document File</h3>
              </div>
              <button
                onClick={() => setReplacingMaterial(null)}
                className="text-gray-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-gray-400 space-y-1">
              <p>
                Replacing document: <strong className="text-white">{replacingMaterial.title}</strong>
              </p>
              <p className="text-[11px] text-gray-500">
                The replacement file will be validated with PDF.js before overwriting. If invalid, the existing document remains untouched.
              </p>
            </div>

            {replaceError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{replaceError}</span>
              </div>
            )}

            <form onSubmit={handleSaveReplace} className="space-y-4 text-xs">
              <input
                type="file"
                ref={replaceFileInputRef}
                accept=".pdf,application/pdf"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
                      setReplaceError('Please select a valid PDF file.');
                      return;
                    }
                    if (file.size > MAX_PDF_FILE_SIZE_BYTES) {
                      setReplaceError(`File exceeds maximum size of ${formatFileSize(MAX_PDF_FILE_SIZE_BYTES)}.`);
                      return;
                    }
                    setReplaceFile(file);
                    setReplaceError(null);
                  }
                }}
                className="w-full bg-[#141419] border border-[#2a2a34] rounded-xl p-2 text-gray-400 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#25252e] file:text-white"
              />

              {replaceFile && (
                <div className="p-2.5 bg-[#141419] rounded-xl border border-[#2a2a34] text-[11px] text-gray-300">
                  New file: <strong>{replaceFile.name}</strong> ({formatFileSize(replaceFile.size)})
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#2a2a34]">
                <button
                  type="button"
                  onClick={() => setReplacingMaterial(null)}
                  className="px-4 py-2 bg-[#141419] hover:bg-[#25252e] text-gray-300 rounded-xl font-semibold border border-[#2a2a34]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessingReplace || !replaceFile}
                  className="px-4 py-2 bg-acca-red hover:bg-acca-red-hover disabled:opacity-40 text-white rounded-xl font-bold flex items-center space-x-1.5"
                >
                  {isProcessingReplace ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Validating Replacement...</span>
                    </>
                  ) : (
                    <span>Confirm Replacement</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
