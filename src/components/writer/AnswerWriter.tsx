import React, { useEffect, useState, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import {
  WrittenAnswerDraft,
  QuestionRecord,
  QualificationVersion,
  AnswerReviewResult
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
  Copy,
  Clock,
  Plus,
  Trash2,
  Check,
  FileText,
  Sparkles,
  Rows2,
  Columns2,
  ChevronDown
} from 'lucide-react';
import { AnswerReviewModal } from './AnswerReviewModal';
import { evaluateWrittenAnswer } from '../../utils/answerReviewEngine';

interface AnswerWriterProps {
  version: QualificationVersion;
  allQuestions: QuestionRecord[];
  initialQuestionId?: string;
  initialPaperId?: string;
  onSelectQuestion?: (questionId: string) => void;
  onOpenSpreadsheet?: () => void;
  isCompact?: boolean;
}

export const AnswerWriter: React.FC<AnswerWriterProps> = ({
  version,
  allQuestions,
  initialQuestionId,
  initialPaperId = 'FR',
  onSelectQuestion,
  onOpenSpreadsheet,
  isCompact = false,
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
  const [showTableMenu, setShowTableMenu] = useState(false);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize TipTap Editor with extensions
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: '<p>Start typing your structured ACCA answer here...</p>',
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[480px] text-gray-900 leading-relaxed font-sans',
      },
    },
    onUpdate: () => {
      setSaveStatus('dirty');
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        handleAutoSave();
      }, 1000);
    },
  });

  // Load answers from DB when selected question or paper changes
  useEffect(() => {
    let isCancelled = false;
    const loadDrafts = async () => {
      let query = db.writtenAnswers.where('paperId').equals(selectedPaperId);
      let drafts = await query.toArray();

      if (selectedQuestionId) {
        drafts = drafts.filter((d) => d.questionId === selectedQuestionId);
      }

      drafts.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      if (isCancelled) return;

      if (drafts.length > 0) {
        setAnswerAttempts(drafts);
        setActiveAttemptIndex(0);
        if (editor && !editor.isDestroyed && drafts[0].contentHtml) {
          try {
            editor.commands.setContent(drafts[0].contentHtml);
          } catch {}
        }
      } else {
        // Create initial blank attempt for this question/paper
        const blank: WrittenAnswerDraft = {
          id: 'draft-' + Date.now(),
          questionId: selectedQuestionId || undefined,
          paperId: selectedPaperId,
          title: selectedQuestionId
            ? `Answer: ${allQuestions.find((q) => q.id === selectedQuestionId)?.title || 'Question'}`
            : `${selectedPaperId} CBE Word Response`,
          attemptNumber: 1,
          contentHtml: '<p>Start typing your structured ACCA answer here...</p>',
          plainText: '',
          wordCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setAnswerAttempts([blank]);
        setActiveAttemptIndex(0);
        if (editor && !editor.isDestroyed) {
          try {
            editor.commands.setContent(blank.contentHtml);
          } catch {}
        }
      }
      setSaveStatus('saved');
    };

    loadDrafts();

    return () => {
      isCancelled = true;
    };
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
      updatedAt: now,
    };

    await db.writtenAnswers.put(updated);
    setAnswerAttempts((prev) => {
      const copy = [...prev];
      copy[activeAttemptIndex] = updated;
      return copy;
    });
    setSaveStatus('saved');
  };

  // Synchronize incoming props if question or paper changes externally (e.g., from split-screen exam view)
  useEffect(() => {
    if (initialQuestionId !== undefined && initialQuestionId !== selectedQuestionId) {
      if (editor && activeDraft && saveStatus === 'dirty') {
        handleAutoSave();
      }
      setSelectedQuestionId(initialQuestionId);
    }
  }, [initialQuestionId]);

  useEffect(() => {
    if (initialPaperId && initialPaperId !== selectedPaperId) {
      if (editor && activeDraft && saveStatus === 'dirty') {
        handleAutoSave();
      }
      setSelectedPaperId(initialPaperId);
    }
  }, [initialPaperId]);

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
      updatedAt: now,
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
      content = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${activeDraft.title}</title><style>body{font-family:sans-serif;max-width:800px;margin:2rem auto;line-height:1.6;color:#111;}.ProseMirror table{border-collapse:collapse;width:100%;margin:1rem 0;}.ProseMirror td,.ProseMirror th{border:1px solid #999;padding:6px 10px;}</style></head><body>${editor.getHTML()}</body></html>`;
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

  // Table manipulation commands
  const handleInsertTable = () => {
    if (!editor) return;
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  const handleAddRowBefore = () => {
    editor?.chain().focus().addRowBefore().run();
  };

  const handleAddRowAfter = () => {
    editor?.chain().focus().addRowAfter().run();
  };

  const handleDeleteRow = () => {
    editor?.chain().focus().deleteRow().run();
  };

  const handleAddColumnBefore = () => {
    editor?.chain().focus().addColumnBefore().run();
  };

  const handleAddColumnAfter = () => {
    editor?.chain().focus().addColumnAfter().run();
  };

  const handleDeleteColumn = () => {
    editor?.chain().focus().deleteColumn().run();
  };

  const handleDeleteTable = () => {
    editor?.chain().focus().deleteTable().run();
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

  const paperQuestions = allQuestions.filter((q) => q.paperId === selectedPaperId);
  const selectedQuestion = allQuestions.find((q) => q.id === selectedQuestionId);
  const isInsideTable = Boolean(editor?.isActive('table'));

  return (
    <div className="flex flex-col h-full w-full bg-[#141419] rounded-2xl border border-[#2a2a34] overflow-hidden shadow-2xl relative">
      {/* Top Controls Bar (Integrated sleek header, replacing oversized introductory card) */}
      <div className="px-3.5 py-2.5 bg-[#1e1e24] border-b border-[#2a2a34] flex flex-wrap items-center justify-between gap-2.5 shrink-0 select-none text-xs">
        {/* Left: Paper & Question Selectors, Attempts */}
        <div className="flex items-center space-x-2 min-w-0 flex-wrap gap-y-1">
          <div className="flex items-center space-x-1.5 px-2 py-1 rounded-lg bg-[#141419] border border-[#2a2a34] shrink-0">
            <FileText className="w-3.5 h-3.5 text-acca-red" />
            <span className="font-bold text-gray-200 text-xs">Word Editor</span>
          </div>

          {/* Paper Selector */}
          <select
            value={selectedPaperId}
            onChange={async (e) => {
              if (editor && activeDraft && saveStatus === 'dirty') {
                await handleAutoSave();
              }
              setSelectedPaperId(e.target.value);
              setSelectedQuestionId('');
            }}
            className="px-2.5 py-1 bg-[#141419] border border-[#2a2a34] rounded-lg text-xs font-semibold text-gray-200 focus:outline-none focus:border-acca-red transition-colors"
          >
            {version.papers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} — {p.name}
              </option>
            ))}
          </select>

          {/* Question Selector */}
          {paperQuestions.length > 0 && (
            <select
              value={selectedQuestionId}
              onChange={async (e) => {
                if (editor && activeDraft && saveStatus === 'dirty') {
                  await handleAutoSave();
                }
                const val = e.target.value;
                setSelectedQuestionId(val);
                if (onSelectQuestion) onSelectQuestion(val);
              }}
              className="px-2.5 py-1 bg-[#141419] border border-[#2a2a34] rounded-lg text-xs font-semibold text-gray-200 focus:outline-none focus:border-acca-red transition-colors max-w-[200px] truncate"
            >
              <option value="">(General Response)</option>
              {paperQuestions.map((q) => (
                <option key={q.id} value={q.id}>
                  Q: {q.title} ({q.availableMarks || 0} marks)
                </option>
              ))}
            </select>
          )}

          {/* Switch to Spreadsheet Link */}
          {onOpenSpreadsheet && (
            <button
              type="button"
              onClick={onOpenSpreadsheet}
              className="px-2 py-1 bg-[#141419] hover:bg-[#25252e] text-gray-300 rounded-lg text-xs font-medium border border-[#2a2a34] transition-colors hidden lg:inline-flex"
            >
              Open Excel Grid
            </button>
          )}

          {/* Attempt Selector Tabs */}
          <div className="flex items-center space-x-1 ml-1 bg-[#141419] px-1 py-0.5 rounded-lg border border-[#2a2a34]">
            <span className="text-[10px] uppercase font-bold text-gray-500 px-1">Attempt:</span>
            {answerAttempts.map((att, idx) => (
              <button
                key={att.id}
                type="button"
                onClick={() => handleSwitchAttempt(idx)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all ${
                  idx === activeAttemptIndex
                    ? 'bg-acca-red text-white'
                    : 'text-gray-400 hover:text-white hover:bg-[#25252e]'
                }`}
              >
                #{att.attemptNumber || idx + 1}
              </button>
            ))}
            <button
              type="button"
              onClick={handleCreateNewAttempt}
              className="p-0.5 text-gray-400 hover:text-acca-red transition-colors"
              title="Start New Attempt"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Right: Actions, Review, Save Status */}
        <div className="flex items-center space-x-2 shrink-0">
          {/* Save Status Badge */}
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              saveStatus === 'saving'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : saveStatus === 'dirty'
                ? 'bg-gray-700/50 text-gray-300 border border-gray-600/40'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            }`}
          >
            {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'dirty' ? 'Unsaved edits' : 'Saved locally'}
          </span>

          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopyAnswer}
            className="p-1 bg-[#141419] hover:bg-[#25252e] border border-[#2a2a34] rounded text-gray-300 hover:text-white transition-colors"
            title="Copy text to clipboard"
          >
            {copySuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Export Dropdown */}
          <div className="flex items-center space-x-0.5 bg-[#141419] p-0.5 rounded border border-[#2a2a34]">
            <button
              type="button"
              onClick={() => handleExportFile('txt')}
              className="px-1.5 py-0.5 text-[10px] text-gray-300 hover:text-white hover:bg-[#25252e] rounded"
              title="Export as Plain Text"
            >
              TXT
            </button>
            <button
              type="button"
              onClick={() => handleExportFile('md')}
              className="px-1.5 py-0.5 text-[10px] text-gray-300 hover:text-white hover:bg-[#25252e] rounded"
              title="Export as Markdown"
            >
              MD
            </button>
            <button
              type="button"
              onClick={() => handleExportFile('html')}
              className="px-1.5 py-0.5 text-[10px] text-gray-300 hover:text-white hover:bg-[#25252e] rounded"
              title="Export as HTML"
            >
              HTML
            </button>
          </div>

          {/* Review Answer Button */}
          <button
            type="button"
            onClick={() => {
              setIsReviewModalOpen(true);
              if (!reviewResult) {
                handleRunReview();
              }
            }}
            className="px-2.5 py-1 bg-acca-red hover:bg-acca-red-hover text-white rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Review</span>
          </button>
        </div>
      </div>

      {/* Linked Question Context Ribbon (Compact) */}
      {selectedQuestion && (
        <div className="bg-[#181820] border-b border-[#282836] px-4 py-2 text-xs flex items-center justify-between gap-4 text-gray-300">
          <div className="min-w-0">
            <span className="font-bold text-white mr-2">
              {selectedQuestion.questionNumber}: {selectedQuestion.title}
            </span>
            <span className="text-gray-400 truncate hidden md:inline">
              {selectedQuestion.notes || selectedQuestion.title}
            </span>
          </div>
          <span className="shrink-0 px-2 py-0.5 rounded bg-[#141419] border border-[#2a2a34] font-bold text-gray-300 text-[11px]">
            {selectedQuestion.availableMarks || 20} Marks
          </span>
        </div>
      )}

      {/* Formatting & Table Controls Toolbar */}
      <div className="bg-[#1a1a22] border-b border-[#282836] px-3.5 py-1.5 flex flex-wrap items-center justify-between gap-2 select-none shrink-0 text-white text-xs">
        {/* Formatting Buttons (with onMouseDown preventDefault to preserve text selection!) */}
        <div className="flex flex-wrap items-center gap-1">
          {/* Undo / Redo */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor?.chain().focus().undo().run()}
            disabled={!editor?.can().undo()}
            className="p-1 rounded bg-[#141419] hover:bg-[#25252e] border border-[#2a2a34] disabled:opacity-30 text-gray-300 transition-colors"
            title="Undo (Ctrl+Z)"
            aria-label="Undo"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor?.chain().focus().redo().run()}
            disabled={!editor?.can().redo()}
            className="p-1 rounded bg-[#141419] hover:bg-[#25252e] border border-[#2a2a34] disabled:opacity-30 text-gray-300 transition-colors"
            title="Redo (Ctrl+Y)"
            aria-label="Redo"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>

          <span className="w-px h-4 bg-[#2a2a34] mx-1" />

          {/* Headings */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`p-1 rounded border transition-colors ${
              editor?.isActive('heading', { level: 1 })
                ? 'bg-acca-red text-white border-acca-red'
                : 'bg-[#141419] hover:bg-[#25252e] border-[#2a2a34] text-gray-300'
            }`}
            title="Heading 1"
            aria-label="Heading 1"
          >
            <Heading1 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`p-1 rounded border transition-colors ${
              editor?.isActive('heading', { level: 2 })
                ? 'bg-acca-red text-white border-acca-red'
                : 'bg-[#141419] hover:bg-[#25252e] border-[#2a2a34] text-gray-300'
            }`}
            title="Heading 2"
            aria-label="Heading 2"
          >
            <Heading2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`p-1 rounded border transition-colors ${
              editor?.isActive('heading', { level: 3 })
                ? 'bg-acca-red text-white border-acca-red'
                : 'bg-[#141419] hover:bg-[#25252e] border-[#2a2a34] text-gray-300'
            }`}
            title="Heading 3"
            aria-label="Heading 3"
          >
            <Heading3 className="w-3.5 h-3.5" />
          </button>

          <span className="w-px h-4 bg-[#2a2a34] mx-1" />

          {/* Bold, Italic, Underline */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor?.chain().focus().toggleBold().run()}
            className={`p-1 rounded border transition-colors ${
              editor?.isActive('bold')
                ? 'bg-acca-red text-white border-acca-red'
                : 'bg-[#141419] hover:bg-[#25252e] border-[#2a2a34] text-gray-300'
            }`}
            title="Bold (Ctrl+B)"
            aria-label="Bold"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            className={`p-1 rounded border transition-colors ${
              editor?.isActive('italic')
                ? 'bg-acca-red text-white border-acca-red'
                : 'bg-[#141419] hover:bg-[#25252e] border-[#2a2a34] text-gray-300'
            }`}
            title="Italic (Ctrl+I)"
            aria-label="Italic"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
            className={`p-1 rounded border transition-colors ${
              editor?.isActive('underline')
                ? 'bg-acca-red text-white border-acca-red'
                : 'bg-[#141419] hover:bg-[#25252e] border-[#2a2a34] text-gray-300'
            }`}
            title="Underline (Ctrl+U)"
            aria-label="Underline"
          >
            <UnderlineIcon className="w-3.5 h-3.5" />
          </button>

          <span className="w-px h-4 bg-[#2a2a34] mx-1" />

          {/* Lists */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            className={`p-1 rounded border transition-colors ${
              editor?.isActive('bulletList')
                ? 'bg-acca-red text-white border-acca-red'
                : 'bg-[#141419] hover:bg-[#25252e] border-[#2a2a34] text-gray-300'
            }`}
            title="Bullet List"
            aria-label="Bullet List"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            className={`p-1 rounded border transition-colors ${
              editor?.isActive('orderedList')
                ? 'bg-acca-red text-white border-acca-red'
                : 'bg-[#141419] hover:bg-[#25252e] border-[#2a2a34] text-gray-300'
            }`}
            title="Numbered List"
            aria-label="Numbered List"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>

          <span className="w-px h-4 bg-[#2a2a34] mx-1" />

          {/* Table Insertion & Management Controls */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleInsertTable}
            className={`p-1 rounded border transition-colors ${
              editor?.isActive('table')
                ? 'bg-acca-red text-white border-acca-red'
                : 'bg-[#141419] hover:bg-[#25252e] border-[#2a2a34] text-gray-300'
            }`}
            title="Insert Table (3x3)"
            aria-label="Insert Table"
          >
            <TableIcon className="w-3.5 h-3.5" />
          </button>

          {/* Contextual Table Editing Controls (Visible when cursor inside a table) */}
          {isInsideTable && (
            <div className="flex items-center space-x-1 ml-1 bg-[#141419] p-0.5 rounded border border-[#2a2a34]">
              <span className="text-[10px] font-bold text-acca-red px-1 uppercase tracking-wider">
                Table:
              </span>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleAddRowAfter}
                className="px-1.5 py-0.5 rounded text-[10px] bg-[#1e1e24] hover:bg-[#2a2a36] text-gray-200 border border-[#2a2a34] transition-colors"
                title="Add Row Below"
              >
                + Row
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleDeleteRow}
                className="px-1.5 py-0.5 rounded text-[10px] bg-[#1e1e24] hover:bg-rose-950 text-gray-200 hover:text-rose-300 border border-[#2a2a34] transition-colors"
                title="Delete Row"
              >
                - Row
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleAddColumnAfter}
                className="px-1.5 py-0.5 rounded text-[10px] bg-[#1e1e24] hover:bg-[#2a2a36] text-gray-200 border border-[#2a2a34] transition-colors"
                title="Add Column Right"
              >
                + Col
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleDeleteColumn}
                className="px-1.5 py-0.5 rounded text-[10px] bg-[#1e1e24] hover:bg-rose-950 text-gray-200 hover:text-rose-300 border border-[#2a2a34] transition-colors"
                title="Delete Column"
              >
                - Col
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleDeleteTable}
                className="p-1 rounded text-[10px] bg-[#1e1e24] hover:bg-rose-950 text-gray-300 hover:text-rose-300 border border-[#2a2a34] transition-colors"
                title="Delete Entire Table"
              >
                <Trash2 className="w-3 h-3 text-rose-400" />
              </button>
            </div>
          )}
        </div>

        {/* Word & Character Counter Indicator */}
        <div className="flex items-center space-x-3 text-[11px] text-gray-400 font-mono">
          <span>
            <strong className="text-gray-200">{wordCount}</strong> words
          </span>
          <span>•</span>
          <span>
            <strong className="text-gray-200">{charCount}</strong> chars
          </span>
        </div>
      </div>

      {/* Main Full-Height Document Canvas */}
      <div className="flex-1 overflow-y-auto bg-[#101015] p-3 sm:p-6 flex justify-center cursor-default">
        <div
          onClick={() => {
            if (editor && !editor.isFocused) {
              editor.commands.focus('end');
            }
          }}
          className="w-full max-w-4xl bg-white text-gray-900 rounded-lg shadow-2xl border border-gray-300 min-h-full p-6 sm:p-10 flex flex-col cursor-text"
        >
          <EditorContent editor={editor} className="flex-1" />
        </div>
      </div>

      {/* Subtle Footer Bar */}
      <div className="bg-[#181820] border-t border-[#282836] px-4 py-1.5 flex items-center justify-between text-[11px] text-gray-400 shrink-0">
        <div className="flex items-center space-x-2">
          <Clock className="w-3 h-3 text-gray-500" />
          <span>Last saved: {new Date(activeDraft?.updatedAt || Date.now()).toLocaleTimeString()}</span>
        </div>
        <span className="font-sans text-gray-500 text-[10px]">
          ACCA Official CBE Format • Continuous Auto-Save
        </span>
      </div>

      {/* Answer Review & Rubric Comparison Modal */}
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
