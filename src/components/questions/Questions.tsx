import React, { useState } from 'react';
import {
  HelpCircle,
  Plus,
  Search,
  Filter,
  AlertCircle,
  Star,
  FileText,
  ExternalLink,
  Edit2,
  Trash2,
  Tag,
  CheckCircle2,
  Clock,
  Layers,
  List,
  Folder
} from 'lucide-react';
import {
  QuestionRecord,
  QuestionStatus,
  QuestionType,
  StudyMaterial,
  QualificationVersion,
  QuestionAttempt
} from '../../types';
import { db, logActivity } from '../../db';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { EmptyState } from '../common/EmptyState';

interface QuestionsProps {
  version: QualificationVersion;
  questions: QuestionRecord[];
  materials: StudyMaterial[];
  onOpenPdfAtPage: (materialId: string, page: number) => void;
}

export const Questions: React.FC<QuestionsProps> = ({
  version,
  questions,
  materials,
  onOpenPdfAtPage,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPaper, setFilterPaper] = useState('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterOnlyDoubts, setFilterOnlyDoubts] = useState(false);
  const [groupBy, setGroupBy] = useState<'none' | 'topic' | 'paper' | 'status'>('none');

  // Modal create/edit state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionRecord | null>(null);

  // Form states
  const [formNumber, setFormNumber] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formPaperId, setFormPaperId] = useState('FR');
  const [formMaterialId, setFormMaterialId] = useState('');
  const [formPage, setFormPage] = useState<number | undefined>(undefined);
  const [formTags, setFormTags] = useState('');
  const [formType, setFormType] = useState<QuestionType>('section_c_constructed');
  const [formStatus, setFormStatus] = useState<QuestionStatus>('not_started');
  const [formIsDoubt, setFormIsDoubt] = useState(false);
  const [formConfidence, setFormConfidence] = useState(3);
  const [formNotes, setFormNotes] = useState('');

  // Attempt logger inside modal
  const [showAddAttempt, setShowAddAttempt] = useState(false);
  const [newAttemptMarks, setNewAttemptMarks] = useState<number | undefined>(undefined);
  const [newAttemptTotal, setNewAttemptTotal] = useState<number | undefined>(20);
  const [newAttemptRemarks, setNewAttemptRemarks] = useState('');

  // Open modal for Create
  const handleOpenCreate = () => {
    setEditingQuestion(null);
    setFormNumber('');
    setFormTitle('');
    setFormPaperId('FR');
    setFormMaterialId('');
    setFormPage(undefined);
    setFormTags('');
    setFormType('section_c_constructed');
    setFormStatus('not_started');
    setFormIsDoubt(false);
    setFormConfidence(3);
    setFormNotes('');
    setShowAddAttempt(false);
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (q: QuestionRecord) => {
    setEditingQuestion(q);
    setFormNumber(q.questionNumber);
    setFormTitle(q.title);
    setFormPaperId(q.paperId);
    setFormMaterialId(q.sourceMaterialId || '');
    setFormPage(q.sourcePage);
    setFormTags(q.topicTags ? q.topicTags.join(', ') : '');
    setFormType(q.questionType);
    setFormStatus(q.status);
    setFormIsDoubt(q.isDoubt);
    setFormConfidence(q.confidenceRating || 3);
    setFormNotes(q.notes || '');
    setShowAddAttempt(false);
    setIsModalOpen(true);
  };

  // Save form
  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date().toISOString();

    const tags = formTags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    let attempts = editingQuestion?.attempts || [];
    if (showAddAttempt && newAttemptMarks !== undefined) {
      const newAttempt: QuestionAttempt = {
        id: 'att-' + Date.now(),
        attemptDate: now,
        marksAwarded: Number(newAttemptMarks),
        totalMarks: Number(newAttemptTotal) || 20,
        remarks: newAttemptRemarks.trim() || undefined
      };
      attempts = [newAttempt, ...attempts];
    }

    const questionData: QuestionRecord = {
      id: editingQuestion ? editingQuestion.id : 'q-' + Date.now(),
      questionNumber: formNumber.trim() || 'Q' + (questions.length + 1),
      title: formTitle.trim(),
      paperId: formPaperId,
      sourceMaterialId: formMaterialId || undefined,
      sourcePage: formPage ? Number(formPage) : undefined,
      topicTags: tags,
      questionType: formType,
      notes: formNotes.trim(),
      status: formStatus,
      isDoubt: formIsDoubt,
      confidenceRating: formConfidence,
      attempts,
      createdAt: editingQuestion ? editingQuestion.createdAt : now,
      updatedAt: now,
    };

    await db.questions.put(questionData);
    await logActivity(
      editingQuestion ? 'Question Updated' : 'Question Added',
      `${questionData.questionNumber}: ${questionData.title} (${questionData.paperId})`,
      'question'
    );

    setIsModalOpen(false);
  };

  // Quick toggle doubt flag
  const handleToggleDoubt = async (q: QuestionRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = { ...q, isDoubt: !q.isDoubt, updatedAt: new Date().toISOString() };
    await db.questions.put(updated);
    await logActivity(
      updated.isDoubt ? 'Doubt Flagged' : 'Doubt Cleared',
      `${q.questionNumber}: ${q.title}`,
      'question'
    );
  };

  // Delete question
  const handleDeleteQuestion = async (id: string, title: string) => {
    if (window.confirm(`Delete question record "${title}"?`)) {
      await db.questions.delete(id);
      await logActivity('Question Deleted', `Removed ${title}.`, 'question');
    }
  };

  // Filter questions
  const filteredQuestions = questions.filter(q => {
    const matchesSearch =
      q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.questionNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.notes.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.topicTags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesPaper = filterPaper === 'all' || q.paperId === filterPaper;
    const matchesStatus = filterStatus === 'all' || q.status === filterStatus;
    const matchesDoubt = !filterOnlyDoubts || q.isDoubt;

    return matchesSearch && matchesPaper && matchesStatus && matchesDoubt;
  });

  // Calculate stats
  const totalCount = questions.length;
  const doubtsCount = questions.filter(q => q.isDoubt).length;
  const completedCount = questions.filter(q => q.status === 'completed').length;
  const attemptedCount = questions.filter(q => q.status === 'attempted').length;

  // Grouping helper
  const getGroupedQuestions = () => {
    if (groupBy === 'none') {
      return [{ groupKey: 'All Questions', list: filteredQuestions }];
    }

    if (groupBy === 'topic') {
      const groups: Record<string, QuestionRecord[]> = {};
      filteredQuestions.forEach(q => {
        if (q.topicTags.length === 0) {
          groups['Untagged Topics'] = groups['Untagged Topics'] || [];
          groups['Untagged Topics'].push(q);
        } else {
          q.topicTags.forEach(tag => {
            groups[tag] = groups[tag] || [];
            groups[tag].push(q);
          });
        }
      });
      return Object.entries(groups).map(([groupKey, list]) => ({ groupKey, list }));
    }

    if (groupBy === 'paper') {
      const groups: Record<string, QuestionRecord[]> = {};
      filteredQuestions.forEach(q => {
        groups[q.paperId] = groups[q.paperId] || [];
        groups[q.paperId].push(q);
      });
      return Object.entries(groups).map(([groupKey, list]) => ({ groupKey, list }));
    }

    if (groupBy === 'status') {
      const groups: Record<string, QuestionRecord[]> = {};
      filteredQuestions.forEach(q => {
        const readableStatus = q.status.replace('_', ' ').toUpperCase();
        groups[readableStatus] = groups[readableStatus] || [];
        groups[readableStatus].push(q);
      });
      return Object.entries(groups).map(([groupKey, list]) => ({ groupKey, list }));
    }

    return [{ groupKey: 'Questions', list: filteredQuestions }];
  };

  const grouped = getGroupedQuestions();

  const getQuestionTypeLabel = (type: QuestionType) => {
    switch (type) {
      case 'section_a_mcq': return 'Section A (MCQ)';
      case 'section_b_case': return 'Section B (OT Case)';
      case 'section_c_constructed': return 'Section C (Constructed Response)';
      default: return 'Standard Practice';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Bar */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-acca-red bg-red-50 px-2.5 py-0.5 rounded-full">
              Syllabus Bank & Questions
            </span>
            <span className="text-xs text-gray-400">Manual Entry & PDF Linking</span>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 mt-1">
            Question Manager
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Log past paper questions, flag doubts for tutor review, track your mark attempts, and jump directly to source PDF pages.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="bg-acca-red hover:bg-acca-red-dark text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Question Record</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-gray-200/80 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-gray-400 uppercase">Total Questions</span>
            <span className="block text-xl font-black text-gray-900 mt-0.5">{totalCount}</span>
          </div>
          <HelpCircle className="w-5 h-5 text-gray-400" />
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-red-200/80 bg-red-50/20 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-acca-red uppercase">Doubts Flagged</span>
            <span className="block text-xl font-black text-acca-red mt-0.5">{doubtsCount}</span>
          </div>
          <AlertCircle className="w-5 h-5 text-acca-red" />
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-gray-200/80 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-indigo-600 uppercase">Attempted</span>
            <span className="block text-xl font-black text-indigo-700 mt-0.5">{attemptedCount}</span>
          </div>
          <Clock className="w-5 h-5 text-indigo-500" />
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-gray-200/80 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-emerald-600 uppercase">Completed</span>
            <span className="block text-xl font-black text-emerald-700 mt-0.5">{completedCount}</span>
          </div>
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
        </div>
      </div>

      {/* Filter and Group Toolbar */}
      <div className="bg-white rounded-xl border border-gray-200/80 p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search by title, number, topic tags (e.g. Consolidation, Leases)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-xs text-gray-800 focus:outline-none focus:border-acca-red focus:bg-white"
            />
          </div>

          {/* Paper dropdown */}
          <div className="flex items-center space-x-2 shrink-0">
            <select
              value={filterPaper}
              onChange={(e) => setFilterPaper(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-700 focus:outline-none focus:border-acca-red"
            >
              <option value="all">All Papers</option>
              {version.papers.map(p => (
                <option key={p.id} value={p.id}>{p.id}</option>
              ))}
            </select>

            {/* Status dropdown */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-700 focus:outline-none focus:border-acca-red"
            >
              <option value="all">All Statuses</option>
              <option value="not_started">Not Started</option>
              <option value="attempted">Attempted</option>
              <option value="completed">Completed</option>
              <option value="needs_review">Needs Review</option>
            </select>

            {/* Doubt toggle */}
            <button
              onClick={() => setFilterOnlyDoubts(!filterOnlyDoubts)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
                filterOnlyDoubts
                  ? 'bg-red-100 text-acca-red border border-red-300'
                  : 'bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Doubts ({doubtsCount})</span>
            </button>
          </div>
        </div>

        {/* Grouping Switcher */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
          <div className="flex items-center space-x-2 text-gray-500">
            <Layers className="w-3.5 h-3.5" />
            <span className="font-medium">Group by:</span>
            <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
              <button
                onClick={() => setGroupBy('none')}
                className={`px-2.5 py-1 rounded text-xs font-medium ${groupBy === 'none' ? 'bg-white shadow-xs text-gray-900 font-bold' : 'text-gray-500 hover:text-gray-900'}`}
              >
                None (Flat)
              </button>
              <button
                onClick={() => setGroupBy('topic')}
                className={`px-2.5 py-1 rounded text-xs font-medium ${groupBy === 'topic' ? 'bg-white shadow-xs text-gray-900 font-bold' : 'text-gray-500 hover:text-gray-900'}`}
              >
                Topic Tags
              </button>
              <button
                onClick={() => setGroupBy('paper')}
                className={`px-2.5 py-1 rounded text-xs font-medium ${groupBy === 'paper' ? 'bg-white shadow-xs text-gray-900 font-bold' : 'text-gray-500 hover:text-gray-900'}`}
              >
                Paper
              </button>
              <button
                onClick={() => setGroupBy('status')}
                className={`px-2.5 py-1 rounded text-xs font-medium ${groupBy === 'status' ? 'bg-white shadow-xs text-gray-900 font-bold' : 'text-gray-500 hover:text-gray-900'}`}
              >
                Status
              </button>
            </div>
          </div>

          <span className="text-gray-400">
            Showing {filteredQuestions.length} of {questions.length} questions
          </span>
        </div>
      </div>

      {/* Questions List / Groups */}
      {filteredQuestions.length === 0 ? (
        <EmptyState
          icon={HelpCircle}
          title={questions.length === 0 ? 'No questions recorded yet' : 'No matching questions'}
          description={
            questions.length === 0
              ? 'Start organizing your question bank. You can enter question titles, tag key topics, record confidence ratings, and link questions directly to pages in your study PDFs.'
              : 'Try clearing your filters or search keywords.'
          }
          actionText={questions.length === 0 ? 'Add Question Record' : undefined}
          onAction={questions.length === 0 ? handleOpenCreate : undefined}
        />
      ) : (
        <div className="space-y-8">
          {grouped.map(({ groupKey, list }) => (
            <div key={groupKey} className="space-y-3">
              {groupBy !== 'none' && (
                <div className="flex items-center space-x-2">
                  <Folder className="w-4 h-4 text-acca-red" />
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                    {groupKey}
                  </h3>
                  <span className="text-xs text-gray-400 font-normal">({list.length})</span>
                </div>
              )}

              <div className="grid grid-cols-1 gap-3">
                {list.map((q) => {
                  const linkedMaterial = materials.find(m => m.id === q.sourceMaterialId);

                  return (
                    <div
                      key={q.id}
                      className={`bg-white rounded-xl border p-4 shadow-xs transition-all hover:border-gray-300 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                        q.isDoubt ? 'border-red-200 bg-red-50/10' : 'border-gray-200/80'
                      }`}
                    >
                      {/* Left: Info & Title */}
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-black text-gray-900 text-sm tracking-tight">
                            {q.questionNumber}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-gray-100 text-gray-700">
                            {q.paperId}
                          </span>
                          <span className="text-xs text-gray-400 font-medium">
                            • {getQuestionTypeLabel(q.questionType)}
                          </span>
                          <Badge status={q.status} />

                          {q.isDoubt && (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-acca-red border border-red-200">
                              <AlertCircle className="w-3 h-3" />
                              <span>Doubt</span>
                            </span>
                          )}

                          {/* Confidence Stars */}
                          <div className="flex items-center space-x-0.5 ml-2" title={`Confidence: ${q.confidenceRating || 3}/5`}>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-3 h-3 ${
                                  star <= (q.confidenceRating || 3)
                                    ? 'text-amber-400 fill-amber-400'
                                    : 'text-gray-200'
                                }`}
                              />
                            ))}
                          </div>
                        </div>

                        <h3 className="font-bold text-gray-900 text-sm">{q.title}</h3>

                        {q.notes && (
                          <p className="text-xs text-gray-600 line-clamp-2 bg-gray-50 p-2 rounded-lg border border-gray-100 leading-relaxed">
                            {q.notes}
                          </p>
                        )}

                        {/* Topic tags */}
                        {q.topicTags && q.topicTags.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            {q.topicTags.map((tag, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center text-[10px] font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Right: Actions & PDF Link */}
                      <div className="flex flex-wrap md:flex-col items-end justify-between gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-gray-100">
                        {/* Open in PDF button if linked */}
                        {linkedMaterial && q.sourcePage ? (
                          <button
                            onClick={() => onOpenPdfAtPage(linkedMaterial.id, q.sourcePage || 1)}
                            className="inline-flex items-center space-x-1.5 text-xs font-bold text-white bg-acca-red hover:bg-acca-red-dark px-3 py-1.5 rounded-lg shadow-xs transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Open PDF (p. {q.sourcePage})</span>
                          </button>
                        ) : linkedMaterial ? (
                          <button
                            onClick={() => onOpenPdfAtPage(linkedMaterial.id, 1)}
                            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 px-2.5 py-1.5 rounded-lg transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Open PDF</span>
                          </button>
                        ) : null}

                        <div className="flex items-center space-x-1">
                          <button
                            onClick={(e) => handleToggleDoubt(q, e)}
                            className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
                              q.isDoubt
                                ? 'text-acca-red hover:bg-red-50'
                                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                            }`}
                            title={q.isDoubt ? 'Clear Doubt' : 'Mark as Doubt'}
                          >
                            <AlertCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(q)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                            title="Edit Question"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteQuestion(q.id, q.title)}
                            className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="Delete Question"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Question Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingQuestion ? 'Edit Question Record' : 'Create Question Record'}
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveQuestion} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Question No.
              </label>
              <input
                type="text"
                placeholder="e.g. Q1 / Dec24-Q3"
                value={formNumber}
                onChange={(e) => setFormNumber(e.target.value)}
                className="w-full text-xs border border-gray-300 rounded-lg p-2.5 outline-none focus:border-acca-red"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Paper
              </label>
              <select
                value={formPaperId}
                onChange={(e) => setFormPaperId(e.target.value)}
                className="w-full text-xs border border-gray-300 rounded-lg p-2.5 outline-none focus:border-acca-red"
              >
                {version.papers.map(p => (
                  <option key={p.id} value={p.id}>{p.id} — {p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Question Type
              </label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as QuestionType)}
                className="w-full text-xs border border-gray-300 rounded-lg p-2.5 outline-none focus:border-acca-red"
              >
                <option value="section_c_constructed">Section C (Constructed)</option>
                <option value="section_b_case">Section B (OT Case)</option>
                <option value="section_a_mcq">Section A (MCQ)</option>
                <option value="other">Other Practice</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
              Question Title / Requirement
            </label>
            <input
              type="text"
              placeholder="e.g. Consolidated Statement of Profit or Loss with associate"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              className="w-full text-xs border border-gray-300 rounded-lg p-2.5 outline-none focus:border-acca-red"
              required
            />
          </div>

          {/* PDF Source Link */}
          <div className="grid grid-cols-3 gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
            <div className="col-span-2">
              <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                Link to Study Material (PDF)
              </label>
              <select
                value={formMaterialId}
                onChange={(e) => setFormMaterialId(e.target.value)}
                className="w-full text-xs border border-gray-300 rounded-lg p-2 outline-none focus:border-acca-red bg-white"
              >
                <option value="">No PDF linked (Manual Entry)</option>
                {materials.map(m => (
                  <option key={m.id} value={m.id}>{m.title} ({m.fileName})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                Page Reference
              </label>
              <input
                type="number"
                min="1"
                placeholder="e.g. 42"
                value={formPage ?? ''}
                onChange={(e) => setFormPage(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full text-xs border border-gray-300 rounded-lg p-2 outline-none focus:border-acca-red bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Status
              </label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as QuestionStatus)}
                className="w-full text-xs border border-gray-300 rounded-lg p-2.5 outline-none focus:border-acca-red"
              >
                <option value="not_started">Not Started</option>
                <option value="attempted">Attempted</option>
                <option value="completed">Completed</option>
                <option value="needs_review">Needs Review</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Confidence Rating (1 to 5)
              </label>
              <div className="flex items-center space-x-2 pt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setFormConfidence(star)}
                    className="p-1 focus:outline-none"
                  >
                    <Star
                      className={`w-5 h-5 ${
                        star <= formConfidence
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
                <span className="text-xs text-gray-500 font-semibold">{formConfidence}/5</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
              Topic Tags (comma-separated)
            </label>
            <input
              type="text"
              placeholder="e.g. Consolidation, PUP, IFRS 15, Revenue, Ethics"
              value={formTags}
              onChange={(e) => setFormTags(e.target.value)}
              className="w-full text-xs border border-gray-300 rounded-lg p-2.5 outline-none focus:border-acca-red"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
              Personal Study Notes & Solution Key Points
            </label>
            <textarea
              rows={3}
              placeholder="Important adjustments, formulas used, marking scheme notes..."
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              className="w-full text-xs border border-gray-300 rounded-lg p-2.5 outline-none focus:border-acca-red"
            />
          </div>

          {/* Doubt toggle checkbox */}
          <div className="flex items-center space-x-2 p-3 bg-red-50/50 border border-red-200/80 rounded-xl">
            <input
              type="checkbox"
              id="doubtCheckbox"
              checked={formIsDoubt}
              onChange={(e) => setFormIsDoubt(e.target.checked)}
              className="w-4 h-4 text-acca-red rounded focus:ring-acca-red border-gray-300"
            />
            <label htmlFor="doubtCheckbox" className="text-xs font-bold text-gray-800 cursor-pointer flex items-center space-x-1">
              <AlertCircle className="w-3.5 h-3.5 text-acca-red" />
              <span>Flag this question as a Doubt for review</span>
            </label>
          </div>

          {/* Attempt record toggle */}
          <div className="pt-2">
            {!showAddAttempt ? (
              <button
                type="button"
                onClick={() => setShowAddAttempt(true)}
                className="text-xs font-semibold text-gray-600 hover:text-acca-red flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log Exam Attempt for this Question</span>
              </button>
            ) : (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-700 uppercase">New Attempt Record</span>
                  <button
                    type="button"
                    onClick={() => setShowAddAttempt(false)}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    Cancel Attempt
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    placeholder="Marks scored"
                    value={newAttemptMarks ?? ''}
                    onChange={(e) => setNewAttemptMarks(e.target.value ? Number(e.target.value) : undefined)}
                    className="text-xs border border-gray-300 rounded p-2 outline-none"
                  />
                  <input
                    type="number"
                    placeholder="Total available marks (e.g. 20)"
                    value={newAttemptTotal ?? ''}
                    onChange={(e) => setNewAttemptTotal(e.target.value ? Number(e.target.value) : undefined)}
                    className="text-xs border border-gray-300 rounded p-2 outline-none"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Attempt remarks (e.g. Timed under 36 mins, lost marks on part c)"
                  value={newAttemptRemarks}
                  onChange={(e) => setNewAttemptRemarks(e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded p-2 outline-none"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold text-white bg-acca-red hover:bg-acca-red-dark rounded-lg"
            >
              Save Question
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
