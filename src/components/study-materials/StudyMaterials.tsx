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
  HardDrive,
  Sparkles,
  Loader2
} from 'lucide-react';
import { StudyMaterial, QualificationVersion, ExtractedQuestionDraft } from '../../types';
import { db, logActivity } from '../../db';
import { PdfViewer } from './PdfViewer';
import { EmptyState } from '../common/EmptyState';
import { Modal } from '../common/Modal';
import { ExtractionReviewModal } from '../extraction/ExtractionReviewModal';
import { extractQuestionsFromPdf } from '../../utils/pdfExtractor';
import * as pdfjsLib from 'pdfjs-dist';

interface StudyMaterialsProps {
  version: QualificationVersion;
  materials: StudyMaterial[];
  selectedMaterialId?: string | null;
  targetPage?: number;
  onClearSelectedMaterial?: () => void;
  onQuestionsExtracted?: () => void;
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

  // Synchronize incoming selected material from parent (e.g. from question click)
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

  // Extraction states
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractingTitle, setExtractingTitle] = useState('');
  const [extractionDrafts, setExtractionDrafts] = useState<ExtractedQuestionDraft[]>([]);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [extractionWarning, setExtractionWarning] = useState<string | null>(null);

  const handleStartExtraction = async (material: StudyMaterial) => {
    setIsExtracting(true);
    setExtractingTitle(material.title);
    setExtractionWarning(null);

    try {
      // Scan up to 25 pages
      const result = await extractQuestionsFromPdf(material, 1, 25);
      setIsExtracting(false);

      if (result.isScannedOrEmptyText) {
        alert(
          'Diagnostic Alert: This PDF appears to be a scanned image-only document without an embedded text layer. Automated extraction could not detect selectable text.'
        );
        return;
      }

      if (result.questions.length === 0) {
        alert(
          'No formatted questions were identified in the scanned pages. You can add question records manually in the Question Manager.'
        );
        return;
      }

      setExtractionDrafts(result.questions);
      setIsReviewOpen(true);
    } catch (err: any) {
      setIsExtracting(false);
      console.error('Extraction error:', err);
      alert('Extraction failed: ' + err.message);
    }
  };

  // File size formatter
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setUploadError('Only standard PDF (.pdf) documents are supported.');
      return;
    }

    setUploadError(null);
    setSelectedFile(file);
    if (!uploadTitle) {
      setUploadTitle(file.name.replace(/\.pdf$/i, ''));
    }
  };

  const handleSaveMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError('Please select a PDF file to import.');
      return;
    }

    setIsProcessingFile(true);
    setUploadError(null);

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();

      // Read total pages with pdfjs
      let totalPages = 1;
      try {
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer.slice(0) });
        const doc = await loadingTask.promise;
        totalPages = doc.numPages;
      } catch (err) {
        console.warn('Could not read page count upfront, defaulting to 1:', err);
      }

      const newMaterial: StudyMaterial = {
        id: 'mat-' + Date.now(),
        title: uploadTitle.trim() || selectedFile.name,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        totalPages,
        paperId: uploadPaperId,
        tags: [uploadPaperId],
        addedAt: new Date().toISOString(),
        pdfData: arrayBuffer,
      };

      await db.studyMaterials.put(newMaterial);
      await logActivity(
        'Study Material Imported',
        `Imported "${newMaterial.title}" (${totalPages} pages) for ${uploadPaperId}.`,
        'document'
      );

      setIsUploading(false);
      setSelectedFile(null);
      setUploadTitle('');
      setIsProcessingFile(false);
    } catch (err: any) {
      console.error('File import error:', err);
      setUploadError(err.message || 'Failed to import and save document.');
      setIsProcessingFile(false);
    }
  };

  const handleDeleteMaterial = async (id: string, title: string) => {
    if (window.confirm(`Are you sure you want to remove "${title}" from your local library?`)) {
      await db.studyMaterials.delete(id);
      if (activeViewerMaterial?.id === id) {
        setActiveViewerMaterial(null);
        if (onClearSelectedMaterial) onClearSelectedMaterial();
      }
      await logActivity('Study Material Deleted', `Removed document "${title}".`, 'document');
    }
  };

  // Filtered materials
  const filteredMaterials = materials.filter(m => {
    const matchesSearch = m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.fileName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPaper = filterPaper === 'all' || m.paperId === filterPaper;
    return matchesSearch && matchesPaper;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* If an active viewer is open, display it full width */}
      {activeViewerMaterial ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setActiveViewerMaterial(null);
                if (onClearSelectedMaterial) onClearSelectedMaterial();
              }}
              className="text-xs font-semibold text-gray-600 hover:text-acca-red flex items-center space-x-1 bg-white px-3 py-1.5 rounded-lg border border-gray-200"
            >
              <span>← Back to Study Materials Library</span>
            </button>
            <span className="text-xs text-gray-500">
              Viewing locally saved file: <strong className="text-gray-800">{activeViewerMaterial.fileName}</strong>
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
          <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider text-acca-red bg-red-50 px-2.5 py-0.5 rounded-full">
                  Local-First Document Storage
                </span>
                <span className="text-xs text-gray-400">100% Private on Your Device</span>
              </div>
              <h1 className="text-2xl font-extrabold text-gray-900 mt-1">
                Study Materials & PDF Library
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Import syllabus guides, past exam kits, technical articles, and notes. Link questions directly to document page numbers.
              </p>
            </div>

            <button
              onClick={() => setIsUploading(true)}
              className="bg-acca-red hover:bg-acca-red-dark text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 shadow-xs transition-colors shrink-0"
            >
              <Upload className="w-4 h-4" />
              <span>Import PDF Material</span>
            </button>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search documents by title or file name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-xs text-gray-800 focus:outline-none focus:border-acca-red"
              />
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={filterPaper}
                onChange={(e) => setFilterPaper(e.target.value)}
                className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-700 focus:outline-none focus:border-acca-red"
              >
                <option value="all">All Papers</option>
                {version.papers.map(p => (
                  <option key={p.id} value={p.id}>{p.id} — {p.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Grid of Materials */}
          {filteredMaterials.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title={materials.length === 0 ? 'No study documents imported yet' : 'No matching materials found'}
              description={
                materials.length === 0
                  ? 'Import your first ACCA study guide or past exam PDF. Documents are kept safe on your computer in local storage.'
                  : 'Try clearing your search query or choosing another paper filter.'
              }
              actionText={materials.length === 0 ? 'Import PDF Document' : undefined}
              onAction={materials.length === 0 ? () => setIsUploading(true) : undefined}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMaterials.map((material) => (
                <div
                  key={material.id}
                  className="bg-white rounded-xl border border-gray-200/80 hover:border-gray-300 p-5 shadow-xs transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div className="p-2.5 bg-red-50 text-acca-red rounded-lg group-hover:bg-acca-red group-hover:text-white transition-colors">
                        <FileText className="w-5 h-5" />
                      </div>
                      {material.paperId && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-800">
                          {material.paperId}
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-gray-900 text-sm line-clamp-1 mb-1">
                      {material.title}
                    </h3>
                    <p className="text-xs text-gray-400 truncate mb-3">
                      {material.fileName}
                    </p>

                    <div className="flex items-center space-x-3 text-xs text-gray-500 border-t border-gray-100 pt-3">
                      <span>{material.totalPages} Pages</span>
                      <span>•</span>
                      <span>{formatBytes(material.fileSize)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-100">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => {
                          setActiveViewerMaterial(material);
                          setViewerPage(1);
                        }}
                        className="text-xs font-bold text-gray-700 hover:text-acca-red flex items-center space-x-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Open</span>
                      </button>

                      <button
                        onClick={() => handleStartExtraction(material)}
                        disabled={isExtracting}
                        className="text-xs font-bold text-acca-red hover:text-acca-red-dark flex items-center space-x-1 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg transition-colors"
                        title="Extract questions, options, and topics from this PDF"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Extract Questions</span>
                      </button>
                    </div>

                    <button
                      onClick={() => handleDeleteMaterial(material.id, material.title)}
                      className="text-gray-300 hover:text-red-500 p-1 transition-colors"
                      title="Delete document"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Import Modal */}
          <Modal
            isOpen={isUploading}
            onClose={() => {
              if (!isProcessingFile) {
                setIsUploading(false);
                setSelectedFile(null);
                setUploadError(null);
              }
            }}
            title="Import Study PDF"
          >
            <form onSubmit={handleSaveMaterial} className="space-y-4">
              {uploadError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-acca-red flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{uploadError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Document Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. FR BPP Study Text 2026 / Passcards"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-lg p-2.5 outline-none focus:border-acca-red"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Associated ACCA Paper
                </label>
                <select
                  value={uploadPaperId}
                  onChange={(e) => setUploadPaperId(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-lg p-2.5 outline-none focus:border-acca-red"
                >
                  {version.papers.map(p => (
                    <option key={p.id} value={p.id}>{p.id} — {p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Select Local PDF
                </label>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 cursor-pointer"
                  required
                />
                {selectedFile && (
                  <p className="text-[11px] text-gray-500 mt-1">
                    Selected: {selectedFile.name} ({formatBytes(selectedFile.size)})
                  </p>
                )}
              </div>

              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-[11px] text-gray-500 flex items-center space-x-2">
                <HardDrive className="w-4 h-4 text-gray-400 shrink-0" />
                <span>Documents are stored directly on your machine in local IndexedDB. No files are uploaded to external servers.</span>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  disabled={isProcessingFile}
                  onClick={() => setIsUploading(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessingFile || !selectedFile}
                  className="px-4 py-2 text-xs font-bold text-white bg-acca-red hover:bg-acca-red-dark disabled:opacity-50 rounded-lg flex items-center space-x-1.5"
                >
                  {isProcessingFile ? (
                    <span>Processing Document...</span>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>Save Locally</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </Modal>

          {/* Extraction In-Progress Loading Modal */}
          {isExtracting && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs">
              <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4 text-center space-y-4 border border-gray-100">
                <div className="w-12 h-12 bg-red-50 text-acca-red rounded-full flex items-center justify-center mx-auto animate-pulse">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Extracting Questions & Syllabus Topics</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Analyzing pages in <strong>{extractingTitle}</strong>...
                  </p>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-acca-red h-full w-2/3 animate-indeterminate" />
                </div>
              </div>
            </div>
          )}

          {/* Extraction Review Screen */}
          <ExtractionReviewModal
            isOpen={isReviewOpen}
            onClose={() => setIsReviewOpen(false)}
            drafts={extractionDrafts}
            materialTitle={extractingTitle}
            onQuestionsSaved={() => {
              // Questions are saved to DB
            }}
          />
        </>
      )}
    </div>
  );
};
