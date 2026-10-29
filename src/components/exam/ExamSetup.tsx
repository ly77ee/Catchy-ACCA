import React, { useState, useMemo } from 'react';
import {
  ExamConfig,
  QuestionRecord,
  StudyMaterial,
  QualificationVersion,
  ExamMode,
  FeedbackMode,
  QuestionOrdering
} from '../../types';
import {
  FileCheck,
  Clock,
  Shuffle,
  ListOrdered,
  Layers,
  Sparkles,
  Play,
  Filter,
  CheckCircle2,
  AlertCircle,
  HelpCircle
} from 'lucide-react';

interface ExamSetupProps {
  version: QualificationVersion;
  allQuestions: QuestionRecord[];
  materials: StudyMaterial[];
  defaultPaperId?: string;
  onStartExam: (config: ExamConfig) => void;
  onOpenQuestionInManager?: (questionId: string) => void;
}

export const ExamSetup: React.FC<ExamSetupProps> = ({
  version,
  allQuestions,
  materials,
  defaultPaperId = 'FR',
  onStartExam,
  onOpenQuestionInManager,
}) => {
  const [paperId, setPaperId] = useState<string>(defaultPaperId);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [questionTypeFilter, setQuestionTypeFilter] = useState<'all' | 'objective' | 'written' | 'calculation'>('all');
  const [examType, setExamType] = useState<'practice' | 'mock'>('practice');
  const [questionCount, setQuestionCount] = useState<number>(5);
  // Default question ordering must be deterministic and respect authored sequence
  const [ordering, setOrdering] = useState<QuestionOrdering>('sequential');
  const [mode, setMode] = useState<ExamMode>('timed');
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [feedbackMode, setFeedbackMode] = useState<FeedbackMode>('delayed');

  // Filter pool by paper and ensure archived questions are excluded
  const paperQuestions = useMemo(() => {
    return allQuestions.filter(
      q => q.paperId === paperId && (q.publishStatus || 'published') !== 'archived'
    );
  }, [allQuestions, paperId]);

  // Available topics for this pool
  const availableTopics = useMemo(() => {
    const topicsSet = new Set<string>();
    paperQuestions.forEach(q => {
      if (q.syllabusArea) topicsSet.add(q.syllabusArea);
      if (q.topic) topicsSet.add(q.topic);
      q.topicTags.forEach(t => topicsSet.add(t));
    });
    return Array.from(topicsSet);
  }, [paperQuestions]);

  // Supported question types in the current pool
  const supportedTypes = useMemo(() => {
    const hasObjective = paperQuestions.some(
      q => q.questionType === 'section_a_mcq' || q.questionType === 'multi_select' || (q.options && q.options.length > 0)
    );
    const hasWritten = paperQuestions.some(
      q => q.questionType === 'section_c_constructed' || q.questionType === 'section_b_case'
    );
    const hasCalculation = paperQuestions.some(
      q => q.questionType === 'calculation' || q.notes.toLowerCase().includes('calc')
    );
    return { hasObjective, hasWritten, hasCalculation };
  }, [paperQuestions]);

  // Filtered matching questions count
  const matchingQuestions = useMemo(() => {
    let pool = paperQuestions;
    if (selectedTopics.length > 0) {
      pool = pool.filter(
        q =>
          (q.syllabusArea && selectedTopics.includes(q.syllabusArea)) ||
          (q.topic && selectedTopics.includes(q.topic)) ||
          q.topicTags.some(t => selectedTopics.includes(t))
      );
    }
    if (questionTypeFilter === 'objective') {
      pool = pool.filter(
        q =>
          q.questionType === 'section_a_mcq' ||
          q.questionType === 'multi_select' ||
          (q.options && q.options.length > 0)
      );
    } else if (questionTypeFilter === 'written') {
      pool = pool.filter(
        q => q.questionType === 'section_c_constructed' || q.questionType === 'section_b_case'
      );
    } else if (questionTypeFilter === 'calculation') {
      pool = pool.filter(q => q.questionType === 'calculation');
    }
    return pool;
  }, [paperQuestions, selectedTopics, questionTypeFilter]);

  const maxAvailable = matchingQuestions.length;
  const effectiveCount = Math.min(questionCount, maxAvailable || 1);

  const toggleTopic = (topic: string) => {
    setSelectedTopics(prev =>
      prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
    );
  };

  const handleLaunch = (e: React.FormEvent) => {
    e.preventDefault();
    if (maxAvailable === 0) {
      alert('No authored questions match the current filters. Please adjust your criteria or author questions in the Questions manager.');
      return;
    }

    const config: ExamConfig = {
      paperId,
      topicFilters: selectedTopics.length > 0 ? selectedTopics : undefined,
      questionTypeFilter,
      questionCount: effectiveCount,
      ordering,
      mode,
      durationMinutes: mode === 'timed' ? durationMinutes : undefined,
      feedbackMode
    };

    onStartExam(config);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-[#1e1e24] rounded-2xl border border-[#2a2a34] p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-acca-red bg-acca-red/10 border border-acca-red/20 px-2.5 py-0.5 rounded-full">
              ACCA Mock Exams
            </span>
            <span className="text-xs text-gray-400">
              {version.name}
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-white mt-2">
            Configure Mock Exam
          </h1>
          <p className="text-xs text-gray-400 mt-1 max-w-2xl">
            Simulate official ACCA Computer Based Exam (CBE) conditions with authored syllabus questions. Practise objective MCQs or solve constructed scenarios using the integrated Word answer writer and Excel spreadsheet workspace.
          </p>
        </div>

        {onOpenQuestionInManager && (
          <button
            type="button"
            onClick={() => onOpenQuestionInManager('')}
            className="px-3.5 py-2 bg-[#141419] hover:bg-[#25252e] text-gray-300 hover:text-white rounded-xl border border-[#2a2a34] text-xs font-bold flex items-center space-x-2 transition-colors shrink-0"
            title="Open Question Bank to create, edit, or import questions"
          >
            <HelpCircle className="w-4 h-4 text-acca-red" />
            <span>Manage Question Bank</span>
          </button>
        )}
      </div>

      <form onSubmit={handleLaunch} className="space-y-6">
        {/* Step 1: Paper & Simulation Mode */}
        <div className="bg-[#1e1e24] rounded-2xl border border-[#2a2a34] p-6 shadow-xl space-y-4">
          <h2 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center space-x-2">
            <span className="w-5 h-5 rounded-full bg-acca-red text-white text-[11px] flex items-center justify-center font-bold">1</span>
            <span>Target Paper & Mode</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">
                ACCA Paper
              </label>
              <select
                value={paperId}
                onChange={e => {
                  setPaperId(e.target.value);
                  setSelectedTopics([]);
                }}
                className="w-full text-xs font-bold border border-[#2a2a34] rounded-xl p-2.5 outline-none focus:border-acca-red bg-[#141419] text-white"
              >
                {version.papers.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.id} — {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">
                Simulation Mode
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setExamType('practice')}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                    examType === 'practice'
                      ? 'border-acca-red bg-acca-red/10 text-white'
                      : 'border-[#2a2a34] bg-[#141419] text-gray-400 hover:text-white'
                  }`}
                >
                  Topic Practice
                </button>
                <button
                  type="button"
                  onClick={() => setExamType('mock')}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                    examType === 'mock'
                      ? 'border-acca-red bg-acca-red/10 text-white'
                      : 'border-[#2a2a34] bg-[#141419] text-gray-400 hover:text-white'
                  }`}
                >
                  Full Mock Exam
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: Question Format Filter & Topic Selection */}
        <div className="bg-[#1e1e24] rounded-2xl border border-[#2a2a34] p-6 shadow-xl space-y-4">
          <h2 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center space-x-2">
            <span className="w-5 h-5 rounded-full bg-acca-red text-white text-[11px] flex items-center justify-center font-bold">2</span>
            <span>Question Format & Syllabus Filters</span>
          </h2>

          <div>
            <label className="block text-xs font-bold text-gray-300 mb-2">
              Question Format
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <label
                className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex flex-col justify-between ${
                  questionTypeFilter === 'all'
                    ? 'border-acca-red bg-acca-red/10 text-white font-bold'
                    : 'border-[#2a2a34] bg-[#141419] text-gray-400 hover:text-white'
                }`}
              >
                <input
                  type="radio"
                  name="qType"
                  value="all"
                  checked={questionTypeFilter === 'all'}
                  onChange={() => setQuestionTypeFilter('all')}
                  className="hidden"
                />
                <span>All Authored</span>
                <span className="text-[10px] text-gray-500 mt-1">Full syllabus mix</span>
              </label>

              <label
                className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex flex-col justify-between ${
                  questionTypeFilter === 'objective'
                    ? 'border-acca-red bg-acca-red/10 text-white font-bold'
                    : 'border-[#2a2a34] bg-[#141419] text-gray-400 hover:text-white'
                }`}
              >
                <input
                  type="radio"
                  name="qType"
                  value="objective"
                  checked={questionTypeFilter === 'objective'}
                  onChange={() => setQuestionTypeFilter('objective')}
                  className="hidden"
                />
                <span>Objective (MCQ)</span>
                <span className="text-[10px] text-gray-500 mt-1">Instant scoring</span>
              </label>

              <label
                className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex flex-col justify-between ${
                  questionTypeFilter === 'written'
                    ? 'border-acca-red bg-acca-red/10 text-white font-bold'
                    : 'border-[#2a2a34] bg-[#141419] text-gray-400 hover:text-white'
                }`}
              >
                <input
                  type="radio"
                  name="qType"
                  value="written"
                  checked={questionTypeFilter === 'written'}
                  onChange={() => setQuestionTypeFilter('written')}
                  className="hidden"
                />
                <span>Constructed / Case</span>
                <span className="text-[10px] text-gray-500 mt-1">Word Answer Writer</span>
              </label>

              <label
                className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex flex-col justify-between ${
                  questionTypeFilter === 'calculation'
                    ? 'border-acca-red bg-acca-red/10 text-white font-bold'
                    : 'border-[#2a2a34] bg-[#141419] text-gray-400 hover:text-white'
                }`}
              >
                <input
                  type="radio"
                  name="qType"
                  value="calculation"
                  checked={questionTypeFilter === 'calculation'}
                  onChange={() => setQuestionTypeFilter('calculation')}
                  className="hidden"
                />
                <span>Financial Workings</span>
                <span className="text-[10px] text-gray-500 mt-1">Excel Spreadsheet</span>
              </label>
            </div>
          </div>

          {/* Topics selection */}
          {availableTopics.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-2">
                Filter by Syllabus Areas / Topics (Optional)
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-[#141419] rounded-xl border border-[#2a2a34]">
                {availableTopics.map(topic => {
                  const isSelected = selectedTopics.includes(topic);
                  return (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => toggleTopic(topic)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                        isSelected
                          ? 'bg-acca-red text-white border-acca-red font-bold'
                          : 'bg-[#1e1e24] text-gray-400 border-[#2a2a34] hover:text-white'
                      }`}
                    >
                      {topic}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Step 3: Exam Conditions (Timing & Question Ordering) */}
        <div className="bg-[#1e1e24] rounded-2xl border border-[#2a2a34] p-6 shadow-xl space-y-4">
          <h2 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center space-x-2">
            <span className="w-5 h-5 rounded-full bg-acca-red text-white text-[11px] flex items-center justify-center font-bold">3</span>
            <span>Timing & Sequence</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Question count */}
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">
                Number of Questions
              </label>
              <input
                type="number"
                min={1}
                max={Math.max(1, maxAvailable)}
                value={questionCount}
                onChange={e => setQuestionCount(Number(e.target.value))}
                className="w-full bg-[#141419] border border-[#2a2a34] rounded-xl p-2.5 text-xs text-white outline-none focus:border-acca-red font-mono"
              />
              <span className="text-[10px] text-gray-500 mt-1 block">
                {maxAvailable} available in selected pool
              </span>
            </div>

            {/* Ordering (Deterministic Authored Order as Default) */}
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">
                Question Ordering
              </label>
              <select
                value={ordering}
                onChange={e => setOrdering(e.target.value as any)}
                className="w-full bg-[#141419] border border-[#2a2a34] rounded-xl p-2.5 text-xs text-white outline-none focus:border-acca-red"
              >
                <option value="sequential">Sequential (Authored Order — Default)</option>
                <option value="randomized">Randomized</option>
                <option value="by_topic">Grouped by Syllabus Area</option>
              </select>
            </div>

            {/* Timer mode */}
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">
                Exam Mode
              </label>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setMode('timed')}
                  className={`flex-1 p-2 rounded-xl text-xs font-bold border transition-all ${
                    mode === 'timed'
                      ? 'bg-acca-red text-white border-acca-red'
                      : 'bg-[#141419] text-gray-400 border-[#2a2a34] hover:text-white'
                  }`}
                >
                  Timed
                </button>
                <button
                  type="button"
                  onClick={() => setMode('untimed')}
                  className={`flex-1 p-2 rounded-xl text-xs font-bold border transition-all ${
                    mode === 'untimed'
                      ? 'bg-acca-red text-white border-acca-red'
                      : 'bg-[#141419] text-gray-400 border-[#2a2a34] hover:text-white'
                  }`}
                >
                  Untimed
                </button>
              </div>

              {mode === 'timed' && (
                <div className="mt-2">
                  <input
                    type="number"
                    min={5}
                    max={240}
                    value={durationMinutes}
                    onChange={e => setDurationMinutes(Number(e.target.value))}
                    className="w-full bg-[#141419] border border-[#2a2a34] rounded-xl p-2 text-xs text-white outline-none focus:border-acca-red font-mono"
                  />
                  <span className="text-[10px] text-gray-500 mt-0.5 block">Duration in minutes</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Launch Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={maxAvailable === 0}
            className="flex items-center space-x-2 px-6 py-3 bg-acca-red hover:bg-acca-red-hover disabled:opacity-40 text-white font-black text-sm rounded-xl transition-all shadow-lg"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Launch Mock Exam ({effectiveCount} Questions)</span>
          </button>
        </div>
      </form>
    </div>
  );
};
