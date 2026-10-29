import React, { useEffect, useState, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import {
  WrittenAnswerDraft,
  QuestionRecord,
  QualificationVersion
} from '../../types';
import { db, logActivity } from '../../db';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Table as TableIcon,
  Undo2,
  Redo2,
  Save,
  Copy,
  Download,
  History,
  Clock,
  Plus,
  Trash2,
  Check,
  FileText,
  Sparkles
} from 'lucide-react';
import { AnswerReviewModal } from './AnswerReviewModal';
import { evaluateWrittenAnswer } from '../../utils/answerReviewEngine';
import { AnswerReviewResult } from '../../types';

interface AnswerWriterProps {
  version: QualificationVersion;
  allQuestions: QuestionRecord[];
  initialQuestionId?: string;
  initialPaperId?: string;
  onSelectQuestion?: (questionId: string) => void;
  onOpenSpreadsheet?: () => void;
}

export const AnswerWriter: React.FC<AnswerWriterProps> = ({
  version,
  allQuestions,
  initialQuestionId,
  initialPaperId = 'FR',
  onSelectQuestion,
  onOpenSpreadsheet,
}) => {
  const [selectedPaperId, setSelectedPaperId] = useState<string>(initialPaperId);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>(initialQuestionId || '');
  const [answerAttempts, setAnswerAttempts] = useState<WrittenAnswerDraft[]>([]);
  const [activeAttemptIndex, setActiveAttemptIndex] = useState<number>(0);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'dirty'>('saved');
  const [copySuccess, setCopySuccess] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewResult, setReviewResult] = useState<AnswerReviewResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize TipTap Editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: '<p>Start typing your structured answer here...</p>',
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl focus:outline-none min-h-[400px] p-6 text-gray-900',
      },
    },
    onUpdate: ({ editor }) => {
      setSaveStatus('dirty');
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        handleAutoSave();
      }, 1000);
    },
  });

  // Load answers from DB when selected question changes
  useEffect(() => {
    const loadDrafts = async () => {
      let query = db.writtenAnswers.where('paperId').equals(selectedPaperId);
      let drafts = await query.toArray();

      if (selectedQuestionId) {
        drafts = drafts.filter(d => d.questionId === selectedQuestionId);
      }

      drafts.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      if (drafts.length > 0) {
        setAnswerAttempts(drafts);
        setActiveAttemptIndex(0);
        if (editor && drafts[0].contentHtml) {
          editor.commands.setContent(drafts[0].contentHtml);
        }
      } else {
        // Create initial blank attempt for this question/paper
        const blank: WrittenAnswerDraft = {
          id: 'draft-' + Date.now(),
          questionId: selectedQuestionId || undefined,
          paperId: selectedPaperId,
          title: selectedQuestionId
            ? `Answer: ${allQuestions.find(q => q.id === selectedQuestionId)?.title || 'Question'}`
            : `${selectedPaperId} Theory & Case Study Response`,
          attemptNumber: 1,
          contentHtml: '<p>Start typing your answer here...</p>',
          plainText: '',
          wordCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        setAnswerAttempts([blank]);
        setActiveAttemptIndex(0);
        if (editor) {
          editor.commands.setContent(blank.contentHtml);
        }
      }
      setSaveStatus('saved');
    };

    loadDrafts();
  }, [selectedPaperId, selectedQuestionId, editor]);

  const activeDraft = answerAttempts[activeAttemptIndex];

  // Auto-save logic
  const handleAutoSave = async () => {
    if (!editor || !activeDraft) return;

    setSaveStatus('saving');
    const html = editor.getHTML();
    const text = editor.getText();
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const now = new Date().toISOString();

    const updated: WrittenAnswerDraft = {
      ...activeDraft,
      contentHtml: html,
      plainText: text,
      wordCount: words,
      updatedAt: now
    };

    await db.writtenAnswers.put(updated);
    setAnswerAttempts(prev => {
      const copy = [...prev];
      copy[activeAttemptIndex] = updated;
      return copy;
    });
    setSaveStatus('saved');
  };

  // Create new version / attempt
  const handleCreateNewAttempt = async () => {
    if (!editor) return;
    const now = new Date().toISOString();
    const nextNumber = answerAttempts.length + 1;

    const newDraft: WrittenAnswerDraft = {
      id: 'draft-' + Date.now(),
      questionId: selectedQuestionId || undefined,
      paperId: selectedPaperId,
      title: `${selectedQuestionId ? 'Question Answer' : 'Response'} (Attempt ${nextNumber})`,
      attemptNumber: nextNumber,
      contentHtml: '<p>Start typing your new attempt here...</p>',
      plainText: '',
      wordCount: 0,
      createdAt: now,
      updatedAt: now
    };

    await db.writtenAnswers.put(newDraft);
    const updated = [newDraft, ...answerAttempts];
    setAnswerAttempts(updated);
    setActiveAttemptIndex(0);
    editor.commands.setContent(newDraft.contentHtml);
    await logActivity('New Answer Attempt', `Started attempt ${nextNumber} for ${selectedPaperId}`, 'workspace');
  };

  // Switch attempt
  const handleSwitchAttempt = (index: number) => {
    if (!editor || index === activeAttemptIndex) return;
    handleAutoSave();
    setActiveAttemptIndex(index);
    editor.commands.setContent(answerAttempts[index].contentHtml);
  };

  // Copy answer to clipboard
  const handleCopyAnswer = () => {
    if (!editor) return;
    const text = editor.getText();
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  // Export answer file
  const handleExportFile = (format: 'txt' | 'html' | 'md') => {
    if (!editor || !activeDraft) return;
    let content = '';
    let mime = 'text/plain';
    let ext = format;

    if (format === 'txt') {
      content = editor.getText();
    } else if (format === 'html') {
      content = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${activeDraft.title}</title><style>body{font-family:sans-serif;max-width:800px;margin:2rem auto;line-height:1.6;color:#111;}</style></head><body>${editor.getHTML()}</body></html>`;
      mime = 'text/html';
    } else if (format === 'md') {
      content = `# ${activeDraft.title}\n\n${editor.getText()}`;
      mime = 'text/markdown';
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `catchy-acca-${selectedPaperId}-answer.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Insert standard ACCA response table
  const handleInsertTable = () => {
    if (!editor) return;
    editor.commands.insertTable({ rows: 3, cols: 3, withHeaderRow: true });
  };

  const handleRunReview = () => {
    if (!editor) return;
    setIsAnalyzing(true);
    setIsReviewModalOpen(true);
    setTimeout(() => {
      const studentText = editor.getText();
      const benchmarkModel = selectedQuestion?.notes || selectedQuestion?.title || 'Standard ACCA model answer';
      const result = evaluateWrittenAnswer({
        questionId: selectedQuestionId || 'general-draft',
        studentAnswerText: studentText,
        modelAnswer: benchmarkModel,
        markingGuide: selectedQuestion?.notes,
        paperId: selectedPaperId,
      });
      setReviewResult(result);
      setIsAnalyzing(false);
    }, 350);
  };

  const wordCount = editor ? (editor.getText().trim() ? editor.getText().trim().split(/\s+/).length : 0) : 0;
  const charCount = editor ? editor.getText().length : 0;

  const paperQuestions = allQuestions.filter(q => q.paperId === selectedPaperId);
  const selectedQuestion = allQuestions.find(q => q.id === selectedQuestionId);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-acca-red bg-red-50 px-2.5 py-0.5 rounded-full">
              Constructed Response Workspace
            </span>
            <span className="text-xs text-gray-400">ACCA CBE Word Processor</span>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 mt-1">
            Answer Writer
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Draft, format, and review constructed responses. Supports headings, tables, undo/redo, automatic draft recovery, and version history.
          </p>
        </div>

        {/* Paper & Question Selectors */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedPaperId}
            onChange={(e) => {
              setSelectedPaperId(e.target.value);
              setSelectedQuestionId('');
            }}
            className="text-xs font-bold border border-gray-300 rounded-xl px-3 py-2 bg-white text-gray-900 outline-none focus:border-acca-red"
          >
            {version.papers.map(p => (
              <option key={p.id} value={p.id}>{p.id} — {p.name}</option>
            ))}
          </select>

          <select
            value={selectedQuestionId}
            onChange={(e) => setSelectedQuestionId(e.target.value)}
            className="text-xs font-medium border border-gray-300 rounded-xl px-3 py-2 bg-white text-gray-700 outline-none focus:border-acca-red max-w-xs truncate"
          >
            <option value="">General Practice (No linked question)</option>
            {paperQuestions.map(q => (
              <option key={q.id} value={q.id}>
                {q.questionNumber}: {q.title}
              </option>
            ))}
          </select>

          {onOpenSpreadsheet && (
            <button
              onClick={onOpenSpreadsheet}
              className="text-xs font-bold bg-neutral-900 hover:bg-black text-white px-3 py-2 rounded-xl transition-colors"
            >
              Open Workings Grid
            </button>
          )}

          <button
            onClick={() => {
              setIsReviewModalOpen(true);
              if (!reviewResult) {
                handleRunReview();
              }
            }}
            className="text-xs font-bold bg-acca-50 dark:bg-acca-950/40 text-acca-700 dark:text-acca-300 hover:bg-acca-100 border border-acca-200 dark:border-acca-900 px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-acca-600" />
            Review Answer
          </button>
        </div>
      </div>

      {/* Linked Question Context Banner (if any) */}
      {selectedQuestion && (
        <div className="bg-gray-50 border border-gray-200/80 rounded-2xl p-4 text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-gray-900">
              {selectedQuestion.questionNumber}: {selectedQuestion.title}
            </span>
            <span className="font-bold px-2 py-0.5 rounded bg-white border border-gray-200 text-gray-700">
              {selectedQuestion.availableMarks || 20} Marks
            </span>
          </div>
          <p className="text-gray-600 line-clamp-2 leading-relaxed font-sans">
            {selectedQuestion.notes || selectedQuestion.title}
          </p>
        </div>
      )}

      {/* Main Word Processor Surface */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden flex flex-col min-h-[600px]">
        {/* Editor Toolbar */}
        <div className="bg-gray-50 border-b border-gray-200 p-2.5 flex flex-wrap items-center justify-between gap-2 select-none">
          {/* Formatting Controls */}
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => editor?.chain().focus().undo().run()}
              disabled={!editor?.can().undo()}
              className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30 text-gray-700 transition-colors"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().redo().run()}
              disabled={!editor?.can().redo()}
              className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30 text-gray-700 transition-colors"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-4 h-4" />
            </button>

            <span className="w-px h-5 bg-gray-300 mx-1" />

            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
              className={`p-1.5 rounded text-xs font-bold transition-colors ${
                editor?.isActive('heading', { level: 1 })
                  ? 'bg-neutral-900 text-white'
                  : 'hover:bg-gray-200 text-gray-700'
              }`}
              title="Heading 1"
            >
              <Heading1 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
              className={`p-1.5 rounded text-xs font-bold transition-colors ${
                editor?.isActive('heading', { level: 2 })
                  ? 'bg-neutral-900 text-white'
                  : 'hover:bg-gray-200 text-gray-700'
              }`}
              title="Heading 2"
            >
              <Heading2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
              className={`p-1.5 rounded text-xs font-bold transition-colors ${
                editor?.isActive('heading', { level: 3 })
                  ? 'bg-neutral-900 text-white'
                  : 'hover:bg-gray-200 text-gray-700'
              }`}
              title="Heading 3"
            >
              <Heading3 className="w-4 h-4" />
            </button>

            <span className="w-px h-5 bg-gray-300 mx-1" />

            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleBold().run()}
              className={`p-1.5 rounded transition-colors ${
                editor?.isActive('bold')
                  ? 'bg-neutral-900 text-white'
                  : 'hover:bg-gray-200 text-gray-700'
              }`}
              title="Bold (Ctrl+B)"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              className={`p-1.5 rounded transition-colors ${
                editor?.isActive('italic')
                  ? 'bg-neutral-900 text-white'
                  : 'hover:bg-gray-200 text-gray-700'
              }`}
              title="Italic (Ctrl+I)"
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleUnderline().run()}
              className={`p-1.5 rounded transition-colors ${
                editor?.isActive('underline')
                  ? 'bg-neutral-900 text-white'
                  : 'hover:bg-gray-200 text-gray-700'
              }`}
              title="Underline (Ctrl+U)"
            >
              <UnderlineIcon className="w-4 h-4" />
            </button>

            <span className="w-px h-5 bg-gray-300 mx-1" />

            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              className={`p-1.5 rounded transition-colors ${
                editor?.isActive('bulletList')
                  ? 'bg-neutral-900 text-white'
                  : 'hover:bg-gray-200 text-gray-700'
              }`}
              title="Bullet List"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
              className={`p-1.5 rounded transition-colors ${
                editor?.isActive('orderedList')
                  ? 'bg-neutral-900 text-white'
                  : 'hover:bg-gray-200 text-gray-700'
              }`}
              title="Numbered List"
            >
              <ListOrdered className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleInsertTable}
              className="p-1.5 rounded hover:bg-gray-200 text-gray-700 transition-colors"
              title="Insert Table (3x3)"
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Right Status & Actions */}
          <div className="flex items-center space-x-3 text-xs">
            {/* Save Status Indicator */}
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                saveStatus === 'saving'
                  ? 'bg-amber-100 text-amber-800'
                  : saveStatus === 'dirty'
                  ? 'bg-gray-200 text-gray-700'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {saveStatus === 'saving' ? 'Saving draft...' : saveStatus === 'dirty' ? 'Unsaved edits' : 'Saved locally'}
            </span>

            <button
              type="button"
              onClick={handleCopyAnswer}
              className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded flex items-center space-x-1"
              title="Copy to clipboard"
            >
              {copySuccess ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span className="hidden sm:inline">{copySuccess ? 'Copied!' : 'Copy'}</span>
            </button>

            {/* Export Dropdown */}
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={() => handleExportFile('txt')}
                className="px-2 py-1 bg-white border border-gray-300 hover:bg-gray-50 rounded text-gray-700 font-medium text-[11px]"
              >
                TXT
              </button>
              <button
                type="button"
                onClick={() => handleExportFile('md')}
                className="px-2 py-1 bg-white border border-gray-300 hover:bg-gray-50 rounded text-gray-700 font-medium text-[11px]"
              >
                MD
              </button>
              <button
                type="button"
                onClick={() => handleExportFile('html')}
                className="px-2 py-1 bg-white border border-gray-300 hover:bg-gray-50 rounded text-gray-700 font-medium text-[11px]"
              >
                HTML
              </button>
            </div>
          </div>
        </div>

        {/* Editable Content Canvas */}
        <div className="flex-1 bg-white overflow-y-auto cursor-text">
          <EditorContent editor={editor} />
        </div>

        {/* Footer Meta & Version Attempts Bar */}
        <div className="bg-gray-50 border-t border-gray-200 p-3 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
          <div className="flex items-center space-x-4">
            <span><strong>{wordCount}</strong> Words</span>
            <span>•</span>
            <span><strong>{charCount}</strong> Characters</span>
            <span>•</span>
            <span className="flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              <span>Last saved: {new Date(activeDraft?.updatedAt || Date.now()).toLocaleTimeString()}</span>
            </span>
          </div>

          {/* Multiple Attempt Tabs */}
          <div className="flex items-center space-x-1.5">
            <span className="text-[11px] font-bold uppercase text-gray-400 mr-1 flex items-center space-x-1">
              <History className="w-3 h-3" />
              <span>Attempts:</span>
            </span>

            {answerAttempts.map((att, idx) => (
              <button
                key={att.id}
                type="button"
                onClick={() => handleSwitchAttempt(idx)}
                className={`px-2 py-1 rounded text-[11px] font-bold transition-all ${
                  idx === activeAttemptIndex
                    ? 'bg-acca-red text-white'
                    : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-100'
                }`}
              >
                #{att.attemptNumber || idx + 1}
              </button>
            ))}

            <button
              type="button"
              onClick={handleCreateNewAttempt}
              className="p-1 text-gray-500 hover:text-acca-red hover:bg-white rounded border border-dashed border-gray-300 transition-colors"
              title="Start a new answer attempt"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Answer Review & Model Comparison Modal */}
      <AnswerReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        reviewResult={reviewResult}
        isAnalyzing={isAnalyzing}
        onRunReview={handleRunReview}
        hasModelAnswer={Boolean(selectedQuestion?.notes || selectedQuestion?.title)}
      />
    </div>
  );
};
