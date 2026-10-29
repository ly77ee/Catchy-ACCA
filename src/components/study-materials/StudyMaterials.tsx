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
  HardDrive
} from 'lucide-react';
import { StudyMaterial, QualificationVersion } from '../../types';
import { db, logActivity } from '../../db';
import { PdfViewer } from './PdfViewer';
import { EmptyState } from '../common/EmptyState';
import * as pdfjsLib from 'pdfjs-dist';

interface StudyMaterialsProps {
  version: QualificationVersion;
  materials: StudyMaterial[];
  selectedMaterialId?: string | null;
  targetPage?: number;
  onClearSelectedMaterial?: () => void;
}

export const StudyMaterials: React.FC<StudyMaterialsProps> = ({
  version,
  materials,
  selectedMaterialId,
  targetPage = 1,
  onClearSelectedMaterial,
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        setUploadError('Only PDF documents are supported.');
        return;
      }
      setSelectedFile(file);
      setUploadError(null);
      if (!uploadTitle.trim()) {
        const defaultName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        setUploadTitle(defaultName);
      }
    }
  };

  const handleSaveUpload = async (e: React.FormEvent) => {
    e.preventDefault();
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
        tags: [uploadPaperId, 'PDF Reference'],
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
      setUploadError(`Failed to read PDF document: ${err.message || 'Unknown error'}`);
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleDeleteMaterial = async (id: string, title: string) => {
    if (window.confirm(`Delete study material "${title}" from your local storage?`)) {
      await db.studyMaterials.delete(id);
      await logActivity('Study Material Deleted', `Deleted "${title}".`, 'document');
      if (activeViewerMaterial?.id === id) {
        setActiveViewerMaterial(null);
      }
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const filteredMaterials = materials.filter((m) => {
    const matchesSearch =
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.fileName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPaper = filterPaper === 'all' || m.paperId === filterPaper;
    return matchesSearch && matchesPaper;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* If an active viewer is open, display it */}
      {activeViewerMaterial ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setActiveViewerMaterial(null);
                if (onClearSelectedMaterial) onClearSelectedMaterial();
              }}
              className="text-xs font-semibold text-gray-300 hover:text-white flex items-center space-x-1 bg-[#1e1e24] px-3 py-1.5 rounded-lg border border-[#2a2a34]"
            >
              <span>← Back to Library</span>
            </button>
            <span className="text-xs text-gray-400">
              Viewing: <strong className="text-white">{activeViewerMaterial.fileName}</strong>
            </span>
          </div>

          <PdfViewer
            material={activeViewerMaterial}
            initialPage={viewerPage}
            onClose={() => {
              setActiveViewerMaterial(null);
              if (onClearSelectedMaterial) onClearSelectedMaterial();
            }}
          />
        </div>
      ) : (
        <>
          {/* Header Bar */}
          <div className="bg-[#1e1e24] rounded-2xl border border-[#2a2a34] p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-acca-red bg-acca-red/10 border border-acca-red/20 px-2.5 py-0.5 rounded-full">
                  Local-First Study Documents
                </span>
                <span className="text-xs text-gray-400">100% Private on Your Device</span>
              </div>
              <h1 className="text-xl md:text-2xl font-black text-white mt-1">
                Study Materials & PDF Library
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                Import and read syllabus guides, past examiner reports, technical articles, and notes offline.
              </p>
            </div>

            <button
              onClick={() => setIsUploading(true)}
              className="bg-acca-red hover:bg-acca-red-hover text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 shadow-xs transition-colors shrink-0"
            >
              <Upload className="w-4 h-4" />
              <span>Import PDF Material</span>
            </button>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-500" />
              <input
                type="text"
                placeholder="Search documents by title or file name..."
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
                  ? 'Import ACCA syllabus guides or reference notes. Documents are stored offline in your browser IndexedDB.'
                  : 'Try clearing your search query or choosing another paper filter.'}
              </p>
              {materials.length === 0 && (
                <button
                  onClick={() => setIsUploading(true)}
                  className="px-4 py-2 bg-acca-red hover:bg-acca-red-hover text-white rounded-xl text-xs font-bold transition-all"
                >
                  Import PDF Document
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMaterials.map(material => (
                <div
                  key={material.id}
                  className="bg-[#1e1e24] rounded-xl border border-[#2a2a34] hover:border-[#3d3d4d] p-5 shadow-lg transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div className="p-2.5 bg-acca-red/10 text-acca-red rounded-lg group-hover:bg-acca-red group-hover:text-white transition-colors">
                        <FileText className="w-5 h-5" />
                      </div>
                      {material.paperId && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#141419] text-gray-300 border border-[#2a2a34]">
                          {material.paperId}
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-white text-sm line-clamp-1 mb-1">
                      {material.title}
                    </h3>
                    <p className="text-xs text-gray-500 truncate mb-3">
                      {material.fileName}
                    </p>

                    <div className="flex items-center space-x-3 text-xs text-gray-400 border-t border-[#2a2a34] pt-3">
                      <span>{material.totalPages} Pages</span>
                      <span>•</span>
                      <span>{formatBytes(material.fileSize)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-[#2a2a34]">
                    <button
                      onClick={() => {
                        setActiveViewerMaterial(material);
                        setViewerPage(1);
                      }}
                      className="text-xs font-bold text-gray-300 hover:text-white flex items-center space-x-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Open PDF</span>
                    </button>

                    <button
                      onClick={() => handleDeleteMaterial(material.id, material.title)}
                      className="text-gray-500 hover:text-rose-400 p-1 rounded"
                      title="Delete document"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Upload Modal */}
      {isUploading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[#1e1e24] border border-[#2a2a34] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#2a2a34]">
              <h3 className="text-base font-bold text-white">Import PDF Study Material</h3>
              <button
                onClick={() => setIsUploading(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUpload} className="space-y-4 text-xs">
              {uploadError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              <div>
                <label className="block text-gray-300 font-bold mb-1">
                  Document Title
                </label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={e => setUploadTitle(e.target.value)}
                  placeholder="e.g. SBR Complete Study Text 2026/2027"
                  required
                  className="w-full bg-[#141419] border border-[#2a2a34] rounded-xl px-3 py-2 text-white outline-none focus:border-acca-red"
                />
              </div>

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
                  PDF File
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".pdf,application/pdf"
                  onChange={handleFileChange}
                  className="w-full bg-[#141419] border border-[#2a2a34] rounded-xl p-2 text-gray-400 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#25252e] file:text-white"
                />
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
                  className="px-4 py-2 bg-acca-red hover:bg-acca-red-hover disabled:opacity-40 text-white rounded-xl font-bold"
                >
                  {isProcessingFile ? 'Reading PDF...' : 'Import Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
