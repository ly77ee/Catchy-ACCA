import React, { useState, useRef } from 'react';
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
  Copy,
  Download,
  Upload,
  CheckCircle2,
  Clock,
  Eye,
  Check,
  Tag,
  Layers,
  BookOpen,
  PenTool,
  Table2,
  ChevronDown,
  ShieldCheck,
  FileCheck
} from 'lucide-react';
import {
  QuestionRecord,
  QuestionStatus,
  QuestionType,
  QuestionPublishStatus,
  QuestionDifficulty,
  StudyMaterial,
  QualificationVersion,
  QuestionOption,
  QuestionExhibit,
  SubQuestion
} from '../../types';
import { db, logActivity } from '../../db';
import { ACCA_SYLLABUS_TOPICS } from '../../config/syllabusTopics';

interface QuestionsProps {
  version: QualificationVersion;
  questions: QuestionRecord[];
  materials: StudyMaterial[];
  onOpenPdfAtPage: (materialId: string, page: number) => void;
  onOpenInWriter?: (questionId: string) => void;
  onOpenInSpreadsheet?: (questionId: string) => void;
  onBackToMockExams?: () => void;
}

export const Questions: React.FC<QuestionsProps> = ({
  version,
  questions,
  materials,
  onOpenPdfAtPage,
  onOpenInWriter,
  onOpenInSpreadsheet,
  onBackToMockExams,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPaper, setFilterPaper] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPublish, setFilterPublish] = useState<string>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [filterOnlyDoubts, setFilterOnlyDoubts] = useState(false);

  // Authoring Modal State
  const [isAuthorModalOpen, setIsAuthorModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionRecord | null>(null);

  // Student Preview Modal State
  const [previewQuestion, setPreviewQuestion] = useState<QuestionRecord | null>(null);

  // Form states for Authoring
  const [formNumber, setFormNumber] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formPaperId, setFormPaperId] = useState('FR');
  const [formVersionId, setFormVersionId] = useState(version.versionId);
  const [formSyllabusArea, setFormSyllabusArea] = useState('');
  const [formTopic, setFormTopic] = useState('');
  const [formType, setFormType] = useState<QuestionType>('section_c_constructed');
  const [formDifficulty, setFormDifficulty] = useState<QuestionDifficulty>('medium');
  const [formMarks, setFormMarks] = useState<number>(20);
  const [formMinutes, setFormMinutes] = useState<number>(36);
  const [formScenario, setFormScenario] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formModelAnswer, setFormModelAnswer] = useState('');
  const [formRubric, setFormRubric] = useState('');
  const [formPublishStatus, setFormPublishStatus] = useState<QuestionPublishStatus>('published');
  const [formTags, setFormTags] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // MCQ Options State
  const [formOptions, setFormOptions] = useState<QuestionOption[]>([
    { id: 'A', label: 'A', text: '' },
    { id: 'B', label: 'B', text: '' },
    { id: 'C', label: 'C', text: '' },
    { id: 'D', label: 'D', text: '' },
  ]);
  const [formCorrectOptionIds, setFormCorrectOptionIds] = useState<string[]>(['A']);

  // Validation Warnings inside Modal
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // File import ref for JSON Question Bank
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Available topics for selected paper
  const paperTopics = ACCA_SYLLABUS_TOPICS.filter(t => t.paperId === formPaperId);

  // Open Authoring Modal for New Question
  const handleOpenCreate = () => {
    setEditingQuestion(null);
    setFormNumber(`Q${questions.length + 1}`);
    setFormTitle('');
    setFormPaperId(filterPaper !== 'all' ? filterPaper : 'FR');
    setFormVersionId(version.versionId);
    setFormSyllabusArea('');
    setFormTopic('');
    setFormType('section_c_constructed');
    setFormDifficulty('medium');
    setFormMarks(20);
    setFormMinutes(36);
    setFormScenario('');
    setFormContent('');
    setFormModelAnswer('');
    setFormRubric('');
    setFormPublishStatus('published');
    setFormTags('');
    setFormNotes('');
    setFormOptions([
      { id: 'A', label: 'A', text: '' },
      { id: 'B', label: 'B', text: '' },
      { id: 'C', label: 'C', text: '' },
      { id: 'D', label: 'D', text: '' },
    ]);
    setFormCorrectOptionIds(['A']);
    setValidationErrors([]);
    setIsAuthorModalOpen(true);
  };

  // Open Authoring Modal for Edit
  const handleOpenEdit = (q: QuestionRecord) => {
    setEditingQuestion(q);
    setFormNumber(q.questionNumber);
    setFormTitle(q.title);
    setFormPaperId(q.paperId);
    setFormVersionId(q.qualificationVersionId || version.versionId);
    setFormSyllabusArea(q.syllabusArea || '');
    setFormTopic(q.topic || '');
    setFormType(q.questionType);
    setFormDifficulty(q.difficulty || 'medium');
    setFormMarks(q.availableMarks || 20);
    setFormMinutes(q.suggestedMinutes || 36);
    setFormScenario(q.scenario || '');
    setFormContent(q.content || '');
    setFormModelAnswer(q.modelAnswer || '');
    setFormRubric(q.rubric || q.markingGuide || '');
    setFormPublishStatus(q.publishStatus || 'published');
    setFormTags(q.topicTags ? q.topicTags.join(', ') : '');
    setFormNotes(q.notes || '');
    setFormOptions(
      q.options && q.options.length > 0
        ? q.options
        : [
            { id: 'A', label: 'A', text: '' },
            { id: 'B', label: 'B', text: '' },
            { id: 'C', label: 'C', text: '' },
            { id: 'D', label: 'D', text: '' },
          ]
    );
    setFormCorrectOptionIds(q.correctOptionIds || ['A']);
    setValidationErrors([]);
    setIsAuthorModalOpen(true);
  };

  // Duplicate Question
  const handleDuplicateQuestion = async (q: QuestionRecord) => {
    const now = new Date().toISOString();
    const duplicated: QuestionRecord = {
      ...q,
      id: 'q-' + Date.now(),
      questionNumber: `${q.questionNumber}-COPY`,
      title: `${q.title} (Copy)`,
      publishStatus: 'draft',
      createdAt: now,
      updatedAt: now,
      attempts: []
    };
    await db.questions.put(duplicated);
    await logActivity('Question Duplicated', `Created copy of ${q.questionNumber}.`, 'question');
  };

  // Quick toggle Publish / Draft status
  const handleTogglePublish = async (q: QuestionRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus: QuestionPublishStatus = q.publishStatus === 'published' ? 'draft' : 'published';
    await db.questions.update(q.id, {
      publishStatus: newStatus,
      updatedAt: new Date().toISOString()
    });
    await logActivity('Question Status Updated', `${q.questionNumber} set to ${newStatus}.`, 'question');
  };

  // Save Authoring
  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: string[] = [];

    if (!formTitle.trim()) errors.push('Question title is required.');
    if (!formNumber.trim()) errors.push('Question reference number is required.');
    if (formMarks <= 0) errors.push('Available marks must be greater than 0.');

    if (formType === 'section_a_mcq') {
      const validOptions = formOptions.filter(o => o.text.trim());
      if (validOptions.length < 2) errors.push('MCQ questions require at least two answer options.');
      if (formCorrectOptionIds.length === 0) errors.push('At least one correct answer option must be selected.');
    }

    if (formPublishStatus === 'published') {
      if (!formScenario.trim() && !formContent.trim()) {
        errors.push('Published questions must have scenario or question content.');
      }
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    const now = new Date().toISOString();
    const tags = formTags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    const questionData: QuestionRecord = {
      id: editingQuestion ? editingQuestion.id : 'q-' + Date.now(),
      questionNumber: formNumber.trim(),
      title: formTitle.trim(),
      paperId: formPaperId,
      qualificationVersionId: formVersionId,
      syllabusArea: formSyllabusArea.trim() || undefined,
      topic: formTopic.trim() || undefined,
      questionType: formType,
      difficulty: formDifficulty,
      availableMarks: Number(formMarks),
      suggestedMinutes: Number(formMinutes),
      scenario: formScenario.trim() || undefined,
      content: formContent.trim() || undefined,
      modelAnswer: formModelAnswer.trim() || undefined,
      rubric: formRubric.trim() || undefined,
      markingGuide: formRubric.trim() || undefined,
      publishStatus: formPublishStatus,
      topicTags: tags,
      notes: formNotes.trim(),
      status: editingQuestion ? editingQuestion.status : 'not_started',
      isDoubt: editingQuestion ? editingQuestion.isDoubt : false,
      confidenceRating: editingQuestion ? editingQuestion.confidenceRating : 3,
      attempts: editingQuestion?.attempts || [],
      options: formType === 'section_a_mcq' ? formOptions : undefined,
      correctOptionIds: formType === 'section_a_mcq' ? formCorrectOptionIds : undefined,
      createdAt: editingQuestion ? editingQuestion.createdAt : now,
      updatedAt: now
    };

    await db.questions.put(questionData);
    await logActivity(
      editingQuestion ? 'Question Updated' : 'Question Authored',
      `${questionData.questionNumber}: ${questionData.title} (${questionData.paperId})`,
      'question'
    );

    setIsAuthorModalOpen(false);
  };

  // Delete question
  const handleDeleteQuestion = async (id: string, title: string) => {
    if (window.confirm(`Delete question record "${title}"?`)) {
      await db.questions.delete(id);
      await logActivity('Question Deleted', `Removed ${title}.`, 'question');
    }
  };

  // Export Question Bank as JSON
  const handleExportQuestionBank = () => {
    const exportData = {
      app: 'Catchy ACCA · by ly77ee',
      exportedAt: new Date().toISOString(),
      type: 'question_bank',
      totalQuestions: questions.length,
      questions
    };
    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `catchy-acca-question-bank-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import Question Bank from JSON
  const handleImportQuestionBank = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const raw = evt.target?.result as string;
        const parsed = JSON.parse(raw);

        if (!parsed.questions || !Array.isArray(parsed.questions)) {
          alert('Invalid Question Bank file format. Expected a JSON file with a "questions" array.');
          return;
        }

        const validQuestions: QuestionRecord[] = parsed.questions.filter(
          (q: any) => q.id && q.title && q.paperId
        );

        if (validQuestions.length === 0) {
          alert('No valid questions found in the imported file.');
          return;
        }

        await db.questions.bulkPut(validQuestions);
        await logActivity(
          'Question Bank Imported',
          `Successfully imported ${validQuestions.length} questions.`,
          'question'
        );
        alert(`Successfully imported ${validQuestions.length} questions into Catchy ACCA!`);
      } catch (err) {
        alert('Failed to parse question bank JSON file: ' + String(err));
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Filter questions
  const filteredQuestions = questions.filter(q => {
    const matchesSearch =
      q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.questionNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (q.syllabusArea || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (q.topic || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.topicTags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesPaper = filterPaper === 'all' || q.paperId === filterPaper;
    const matchesType = filterType === 'all' || q.questionType === filterType;
    const matchesStatus = filterStatus === 'all' || q.status === filterStatus;
    const matchesPublish = filterPublish === 'all' || (q.publishStatus || 'published') === filterPublish;
    const matchesDifficulty = filterDifficulty === 'all' || (q.difficulty || 'medium') === filterDifficulty;
    const matchesDoubt = !filterOnlyDoubts || q.isDoubt;

    return matchesSearch && matchesPaper && matchesType && matchesStatus && matchesPublish && matchesDifficulty && matchesDoubt;
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#1e1e24] p-5 rounded-2xl border border-[#2a2a34]">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-acca-red/10 border border-acca-red/20 text-acca-red">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                Question Bank & Authoring
                <span className="text-[11px] font-semibold bg-[#141419] text-emerald-400 px-2 py-0.5 rounded-md border border-[#2a2a34]">
                  Structured Authored Mode
                </span>
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                Author, edit, and organize ACCA syllabus questions, scenarios, model answers, and marking rubrics
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {onBackToMockExams && (
            <button
              onClick={onBackToMockExams}
              className="flex items-center space-x-1.5 px-3 py-2 bg-[#141419] hover:bg-[#25252e] text-gray-300 hover:text-white rounded-xl text-xs font-semibold border border-[#2a2a34] transition-all"
              title="Return to Mock Exams"
            >
              <FileCheck className="w-4 h-4 text-acca-red" />
              <span>Back to Mock Exams</span>
            </button>
          )}

          <button
            onClick={handleOpenCreate}
            className="flex items-center space-x-1.5 px-3 py-2 bg-acca-red hover:bg-acca-red-hover text-white rounded-xl text-xs font-bold transition-all shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Author Question</span>
          </button>

          <button
            onClick={handleExportQuestionBank}
            className="flex items-center space-x-1.5 px-3 py-2 bg-[#141419] hover:bg-[#25252e] text-gray-300 hover:text-white rounded-xl text-xs font-semibold border border-[#2a2a34] transition-all"
            title="Export Question Bank as JSON"
          >
            <Download className="w-4 h-4" />
            <span>Export Bank</span>
          </button>

          <input
            type="file"
            ref={fileInputRef}
            accept=".json,application/json"
            onChange={handleImportQuestionBank}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-1.5 px-3 py-2 bg-[#141419] hover:bg-[#25252e] text-gray-300 hover:text-white rounded-xl text-xs font-semibold border border-[#2a2a34] transition-all"
            title="Import Question Bank from JSON"
          >
            <Upload className="w-4 h-4" />
            <span>Import Bank</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-[#1e1e24] p-4 rounded-2xl border border-[#2a2a34] space-y-3">
        <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by title, Q-number, syllabus area, or topic..."
              className="w-full bg-[#141419] border border-[#2a2a34] rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-acca-red"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Paper Filter */}
            <select
              value={filterPaper}
              onChange={e => setFilterPaper(e.target.value)}
              className="bg-[#141419] border border-[#2a2a34] rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-acca-red"
            >
              <option value="all">All Papers</option>
              {version.papers.map(p => (
                <option key={p.id} value={p.id}>
                  {p.id}
                </option>
              ))}
            </select>

            {/* Question Type Filter */}
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="bg-[#141419] border border-[#2a2a34] rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-acca-red"
            >
              <option value="all">All Types</option>
              <option value="section_a_mcq">Section A: MCQ</option>
              <option value="section_b_case">Section B: Case Study</option>
              <option value="section_c_constructed">Section C: Constructed</option>
              <option value="calculation">Financial Calculation</option>
            </select>

            {/* Difficulty Filter */}
            <select
              value={filterDifficulty}
              onChange={e => setFilterDifficulty(e.target.value)}
              className="bg-[#141419] border border-[#2a2a34] rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-acca-red"
            >
              <option value="all">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>

            {/* Publication Filter */}
            <select
              value={filterPublish}
              onChange={e => setFilterPublish(e.target.value)}
              className="bg-[#141419] border border-[#2a2a34] rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-acca-red"
            >
              <option value="all">All Statuses</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>

            {/* Doubt toggle */}
            <button
              onClick={() => setFilterOnlyDoubts(!filterOnlyDoubts)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center space-x-1.5 ${
                filterOnlyDoubts
                  ? 'bg-acca-red/10 border-acca-red text-acca-red'
                  : 'bg-[#141419] border-[#2a2a34] text-gray-400 hover:text-white'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Doubts Only</span>
            </button>
          </div>
        </div>

        {/* Stats Count Bar */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-1 border-t border-[#2a2a34]">
          <span>
            Showing <strong>{filteredQuestions.length}</strong> of <strong>{questions.length}</strong> questions
          </span>
          <div className="flex items-center space-x-3">
            <span>{questions.filter(q => (q.publishStatus || 'published') === 'published').length} Published</span>
            <span>•</span>
            <span>{questions.filter(q => q.publishStatus === 'draft').length} Drafts</span>
          </div>
        </div>
      </div>

      {/* Questions Grid / List */}
      <div className="space-y-3">
        {filteredQuestions.length > 0 ? (
          filteredQuestions.map(q => {
            const isPublished = (q.publishStatus || 'published') === 'published';

            return (
              <div
                key={q.id}
                className="bg-[#1e1e24] p-4 rounded-2xl border border-[#2a2a34] hover:border-[#3d3d4d] transition-all space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start space-x-3">
                    <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-acca-red text-white shrink-0 mt-0.5">
                      {q.paperId}
                    </span>

                    <div>
                      <div className="flex items-center space-x-2 flex-wrap">
                        <span className="font-mono font-bold text-xs text-gray-400">
                          {q.questionNumber}
                        </span>
                        <h3 className="text-sm font-bold text-white hover:text-acca-red transition-colors">
                          {q.title}
                        </h3>

                        {/* Status Pills */}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isPublished
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}
                        >
                          {q.publishStatus || 'published'}
                        </span>

                        {q.difficulty && (
                          <span className="text-[10px] font-medium bg-[#141419] text-gray-400 px-2 py-0.5 rounded border border-[#2a2a34]">
                            {q.difficulty.toUpperCase()}
                          </span>
                        )}

                        <span className="text-[10px] font-semibold text-gray-500">
                          {q.availableMarks || 20} Marks • {q.suggestedMinutes || 36} mins
                        </span>
                      </div>

                      {/* Syllabus & Topic */}
                      {(q.syllabusArea || q.topic) && (
                        <div className="text-xs text-gray-400 mt-1 flex items-center space-x-2">
                          {q.syllabusArea && <span>Area: <strong className="text-gray-300">{q.syllabusArea}</strong></span>}
                          {q.syllabusArea && q.topic && <span>•</span>}
                          {q.topic && <span>Topic: <strong className="text-gray-300">{q.topic}</strong></span>}
                        </div>
                      )}

                      {/* Question tags */}
                      {q.topicTags && q.topicTags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {q.topicTags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] bg-[#141419] text-gray-400 px-2 py-0.5 rounded border border-[#2a2a34]"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center space-x-1.5 self-end sm:self-start shrink-0">
                    {/* Student Preview Button */}
                    <button
                      onClick={() => setPreviewQuestion(q)}
                      className="p-1.5 rounded-lg bg-[#141419] hover:bg-[#25252e] text-gray-300 hover:text-white border border-[#2a2a34] text-xs font-semibold flex items-center space-x-1"
                      title="Preview how students see this question (without revealing model answers)"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview</span>
                    </button>

                    {/* Open in Workspace */}
                    {onOpenInWriter && (
                      <button
                        onClick={() => onOpenInWriter(q.id)}
                        className="p-1.5 rounded-lg bg-[#141419] hover:bg-[#25252e] text-gray-300 hover:text-white border border-[#2a2a34] text-xs font-semibold flex items-center space-x-1"
                        title="Open in Word Answer Writer"
                      >
                        <PenTool className="w-3.5 h-3.5" />
                        <span>Word</span>
                      </button>
                    )}

                    {onOpenInSpreadsheet && (
                      <button
                        onClick={() => onOpenInSpreadsheet(q.id)}
                        className="p-1.5 rounded-lg bg-[#141419] hover:bg-[#25252e] text-gray-300 hover:text-white border border-[#2a2a34] text-xs font-semibold flex items-center space-x-1"
                        title="Open in Excel Spreadsheet"
                      >
                        <Table2 className="w-3.5 h-3.5" />
                        <span>Excel</span>
                      </button>
                    )}

                    {/* Edit */}
                    <button
                      onClick={() => handleOpenEdit(q)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#25252e] transition-colors"
                      title="Edit question authoring details"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    {/* Duplicate */}
                    <button
                      onClick={() => handleDuplicateQuestion(q)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#25252e] transition-colors"
                      title="Duplicate Question"
                    >
                      <Copy className="w-4 h-4" />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDeleteQuestion(q.id, q.title)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-[#25252e] transition-colors"
                      title="Delete Question"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-[#1e1e24] p-12 rounded-2xl border border-[#2a2a34] text-center space-y-3">
            <HelpCircle className="w-8 h-8 text-gray-500 mx-auto" />
            <h3 className="text-base font-bold text-white">No Questions Found</h3>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              No questions match the current filter criteria. Click "Author Question" to create your first question.
            </p>
          </div>
        )}
      </div>

      {/* Authoring & Edit Modal */}
      {isAuthorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[#1e1e24] border border-[#2a2a34] rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-[#2a2a34] flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <PenTool className="w-4 h-4 text-acca-red" />
                  {editingQuestion ? `Edit Question: ${formNumber}` : 'Author New ACCA Question'}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Author questions, scenarios, marks, separate model answers, and marking rubrics
                </p>
              </div>
              <button
                onClick={() => setIsAuthorModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Validation Errors banner */}
              {validationErrors.length > 0 && (
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-xs text-rose-300 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    Please correct the following before saving:
                  </div>
                  <ul className="list-disc pl-5 space-y-0.5">
                    {validationErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Row 1: Number, Paper, Version, Publish Status */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">
                    Question Reference *
                  </label>
                  <input
                    type="text"
                    value={formNumber}
                    onChange={e => setFormNumber(e.target.value)}
                    placeholder="e.g. SBR-Q1, FR-M2"
                    required
                    className="w-full bg-[#141419] border border-[#2a2a34] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-acca-red font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">
                    ACCA Paper *
                  </label>
                  <select
                    value={formPaperId}
                    onChange={e => setFormPaperId(e.target.value)}
                    className="w-full bg-[#141419] border border-[#2a2a34] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-acca-red"
                  >
                    {version.papers.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.id} — {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">
                    Question Type
                  </label>
                  <select
                    value={formType}
                    onChange={e => setFormType(e.target.value as any)}
                    className="w-full bg-[#141419] border border-[#2a2a34] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-acca-red"
                  >
                    <option value="section_c_constructed">Constructed Response (Essay/Analysis)</option>
                    <option value="section_a_mcq">Section A: Objective MCQ</option>
                    <option value="section_b_case">Section B: Multi-Task Case</option>
                    <option value="calculation">Financial Calculation (Spreadsheet)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">
                    Publish Status
                  </label>
                  <select
                    value={formPublishStatus}
                    onChange={e => setFormPublishStatus(e.target.value as any)}
                    className="w-full bg-[#141419] border border-[#2a2a34] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-acca-red"
                  >
                    <option value="published">Published (Available to Student)</option>
                    <option value="draft">Draft (Work in Progress)</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Title */}
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">
                  Question Title *
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder="e.g. Consolidated Statement of Financial Position — Goodwill and NCI"
                  required
                  className="w-full bg-[#141419] border border-[#2a2a34] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-acca-red font-medium"
                />
              </div>

              {/* Row 3: Syllabus Area, Topic, Marks, Suggested Minutes */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">
                    Syllabus Area
                  </label>
                  <input
                    type="text"
                    value={formSyllabusArea}
                    onChange={e => setFormSyllabusArea(e.target.value)}
                    placeholder="e.g. Group Accounting"
                    className="w-full bg-[#141419] border border-[#2a2a34] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-acca-red"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">
                    Topic
                  </label>
                  <input
                    type="text"
                    value={formTopic}
                    onChange={e => setFormTopic(e.target.value)}
                    placeholder="e.g. Goodwill & Impairment"
                    className="w-full bg-[#141419] border border-[#2a2a34] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-acca-red"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">
                    Available Marks *
                  </label>
                  <input
                    type="number"
                    value={formMarks}
                    onChange={e => setFormMarks(Number(e.target.value))}
                    min={1}
                    max={100}
                    required
                    className="w-full bg-[#141419] border border-[#2a2a34] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-acca-red font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">
                    Suggested Time (Minutes)
                  </label>
                  <input
                    type="number"
                    value={formMinutes}
                    onChange={e => setFormMinutes(Number(e.target.value))}
                    min={1}
                    max={240}
                    className="w-full bg-[#141419] border border-[#2a2a34] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-acca-red font-mono"
                  />
                </div>
              </div>

              {/* Scenario / Background */}
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">
                  Scenario & Background (Case Exhibits)
                </label>
                <textarea
                  rows={4}
                  value={formScenario}
                  onChange={e => setFormScenario(e.target.value)}
                  placeholder="Enter the background scenario, financial exhibits, company history, or trial balance..."
                  className="w-full bg-[#141419] border border-[#2a2a34] rounded-xl p-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-acca-red"
                />
              </div>

              {/* Detailed Question Instructions / Requirements */}
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">
                  Question Requirements & Specific Instructions *
                </label>
                <textarea
                  rows={4}
                  value={formContent}
                  onChange={e => setFormContent(e.target.value)}
                  placeholder="Specific student requirement: e.g. Prepare the consolidated statement of financial position for the group as at 31 December 2026. (20 marks)"
                  required
                  className="w-full bg-[#141419] border border-[#2a2a34] rounded-xl p-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-acca-red"
                />
              </div>

              {/* MCQ Options Editor (If Question Type is MCQ) */}
              {formType === 'section_a_mcq' && (
                <div className="bg-[#141419] border border-[#2a2a34] rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-300">
                      MCQ Answer Options (Select Correct Answer)
                    </span>
                    <span className="text-[11px] text-gray-500">
                      Radio button indicates correct answer key for auto-marking
                    </span>
                  </div>

                  {formOptions.map(opt => (
                    <div key={opt.id} className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="correct_option"
                        checked={formCorrectOptionIds.includes(opt.id)}
                        onChange={() => setFormCorrectOptionIds([opt.id])}
                        className="accent-acca-red"
                      />
                      <span className="w-5 font-bold text-xs text-gray-400 font-mono">
                        {opt.label}:
                      </span>
                      <input
                        type="text"
                        value={opt.text}
                        onChange={e => {
                          const updated = formOptions.map(o =>
                            o.id === opt.id ? { ...o, text: e.target.value } : o
                          );
                          setFormOptions(updated);
                        }}
                        placeholder={`Option ${opt.label} text`}
                        className="flex-1 bg-[#1e1e24] border border-[#2a2a34] rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-acca-red"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Model Answer (Separated from Student View) */}
              <div className="border-t border-[#2a2a34] pt-4 space-y-4">
                <div className="flex items-center space-x-2 text-xs font-bold text-emerald-400">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Author Model Answer & Marking Rubric (Hidden from student until review stage)</span>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">
                    Model Answer Solution
                  </label>
                  <textarea
                    rows={4}
                    value={formModelAnswer}
                    onChange={e => setFormModelAnswer(e.target.value)}
                    placeholder="Provide the complete model solution, calculations, and financial statement layouts..."
                    className="w-full bg-[#141419] border border-[#2a2a34] rounded-xl p-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-acca-red"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">
                    Detailed Marking Guide & Rubric
                  </label>
                  <textarea
                    rows={3}
                    value={formRubric}
                    onChange={e => setFormRubric(e.target.value)}
                    placeholder="Mark allocation breakdown: e.g. Goodwill calculation: 4 marks. Inventory PUP adjustment: 2 marks. NCI fair value: 3 marks."
                    className="w-full bg-[#141419] border border-[#2a2a34] rounded-xl p-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-acca-red"
                  />
                </div>
              </div>
            </form>

            <div className="p-4 bg-[#141419] border-t border-[#2a2a34] flex items-center justify-between">
              <span className="text-[11px] text-gray-500">
                Authored content will be stored locally in IndexedDB.
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAuthorModalOpen(false)}
                  className="px-4 py-2 bg-[#1e1e24] hover:bg-[#25252e] text-gray-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveQuestion}
                  className="px-4 py-2 bg-acca-red hover:bg-acca-red-hover text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                >
                  Save Question
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Student Preview Modal */}
      {previewQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[#1e1e24] border border-[#2a2a34] rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-[#2a2a34] flex items-center justify-between bg-[#141419]">
              <div className="flex items-center space-x-2">
                <Eye className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Student Examination View Preview
                </span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">
                  Model Answers & Marking Rubrics Hidden
                </span>
              </div>
              <button
                onClick={() => setPreviewQuestion(null)}
                className="text-gray-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div className="flex items-center justify-between border-b border-[#2a2a34] pb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-acca-red text-white">
                    {previewQuestion.paperId}
                  </span>
                  <span className="font-mono font-bold text-xs text-gray-400">
                    {previewQuestion.questionNumber}
                  </span>
                  <h3 className="text-base font-bold text-white">
                    {previewQuestion.title}
                  </h3>
                </div>
                <span className="text-xs font-bold text-gray-300">
                  {previewQuestion.availableMarks || 20} Marks
                </span>
              </div>

              {previewQuestion.scenario && (
                <div className="bg-[#141419] p-4 rounded-xl border border-[#2a2a34] text-xs text-gray-300 leading-relaxed whitespace-pre-line">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                    Scenario / Case Exhibits:
                  </span>
                  {previewQuestion.scenario}
                </div>
              )}

              <div className="bg-[#141419] p-4 rounded-xl border border-[#2a2a34] text-xs text-gray-200 leading-relaxed whitespace-pre-line">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Requirements:
                </span>
                {previewQuestion.content || previewQuestion.notes}
              </div>

              {previewQuestion.questionType === 'section_a_mcq' && previewQuestion.options && (
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-bold text-gray-400">Answer Options:</span>
                  {previewQuestion.options.map(opt => (
                    <div
                      key={opt.id}
                      className="p-3 rounded-xl bg-[#141419] border border-[#2a2a34] flex items-center space-x-3 text-xs text-gray-300"
                    >
                      <input type="radio" name="preview_mcq" disabled className="accent-acca-red" />
                      <span className="font-bold text-gray-400">{opt.label}:</span>
                      <span>{opt.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 bg-[#141419] border-t border-[#2a2a34] flex justify-end">
              <button
                onClick={() => setPreviewQuestion(null)}
                className="px-4 py-1.5 bg-[#1e1e24] hover:bg-[#25252e] text-white rounded-xl text-xs font-semibold"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
