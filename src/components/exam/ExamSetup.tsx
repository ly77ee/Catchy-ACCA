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
  AlertCircle
} from 'lucide-react';

interface ExamSetupProps {
  version: QualificationVersion;
  allQuestions: QuestionRecord[];
  materials: StudyMaterial[];
  defaultPaperId?: string;
  onStartExam: (config: ExamConfig) => void;
}

export const ExamSetup: React.FC<ExamSetupProps> = ({
  version,
  allQuestions,
  materials,
  defaultPaperId = 'FR',
  onStartExam,
}) => {
  const [paperId, setPaperId] = useState<string>(defaultPaperId);
  const [sourceMaterialId, setSourceMaterialId] = useState<string>('all');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [questionTypeFilter, setQuestionTypeFilter] = useState<'all' | 'objective' | 'written' | 'calculation'>('all');
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [ordering, setOrdering] = useState<QuestionOrdering>('randomized');
  const [mode, setMode] = useState<ExamMode>('timed');
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [feedbackMode, setFeedbackMode] = useState<FeedbackMode>('delayed');

  // Filter pool by paper and source
  const paperQuestions = useMemo(() => {
    let pool = allQuestions.filter(q => q.paperId === paperId);
    if (sourceMaterialId !== 'all') {
      pool = pool.filter(q => q.sourceMaterialId === sourceMaterialId);
    }
    return pool;
  }, [allQuestions, paperId, sourceMaterialId]);

  // Available topics for this pool
  const availableTopics = useMemo(() => {
    const topicsSet = new Set<string>();
    paperQuestions.forEach(q => {
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
      pool = pool.filter(q => q.topicTags.some(t => selectedTopics.includes(t)));
    }
    if (questionTypeFilter === 'objective') {
      pool = pool.filter(q => q.questionType === 'section_a_mcq' || q.questionType === 'multi_select' || (q.options && q.options.length > 0));
    } else if (questionTypeFilter === 'written') {
      pool = pool.filter(q => q.questionType === 'section_c_constructed' || q.questionType === 'section_b_case');
    } else if (questionTypeFilter === 'calculation') {
      pool = pool.filter(q => q.questionType === 'calculation');
    }
    return pool;
  }, [paperQuestions, selectedTopics, questionTypeFilter]);

  // Adjust count if matching pool is smaller
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
      alert('No questions match the current filters. Please adjust your criteria.');
      return;
    }

    const config: ExamConfig = {
      paperId,
      sourceMaterialId: sourceMaterialId === 'all' ? undefined : sourceMaterialId,
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
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Hero Header */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-6 md:p-8 shadow-xs">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold uppercase tracking-wider text-acca-red bg-red-50 px-2.5 py-0.5 rounded-full">
            CBE Exam Simulator
          </span>
          <span className="text-xs text-gray-400">Timed Exam Practice</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 mt-1">
          Configure Your Exam Simulation
        </h1>
        <p className="text-sm text-gray-500 mt-1 max-w-2xl">
          Simulate official ACCA Computer Based Exam (CBE) conditions. Practise objective MCQs with auto-marking or write constructed responses under timed pressure.
        </p>
      </div>

      <form onSubmit={handleLaunch} className="space-y-6">
        {/* Step 1: Paper & Material Selection */}
        <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center space-x-2">
            <span className="w-5 h-5 rounded-full bg-neutral-900 text-white text-xs flex items-center justify-center font-bold">1</span>
            <span>Target Paper & Source Material</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                ACCA Paper
              </label>
              <select
                value={paperId}
                onChange={(e) => {
                  setPaperId(e.target.value);
                  setSelectedTopics([]);
                  setSourceMaterialId('all');
                }}
                className="w-full text-xs font-bold border border-gray-300 rounded-xl p-2.5 outline-none focus:border-acca-red bg-white"
              >
                {version.papers.map(p => (
                  <option key={p.id} value={p.id}>{p.id} — {p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Source Document
              </label>
              <select
                value={sourceMaterialId}
                onChange={(e) => {
                  setSourceMaterialId(e.target.value);
                  setSelectedTopics([]);
                }}
                className="w-full text-xs font-medium border border-gray-300 rounded-xl p-2.5 outline-none focus:border-acca-red bg-white"
              >
                <option value="all">All Imported Questions ({allQuestions.filter(q => q.paperId === paperId).length})</option>
                {materials
                  .filter(m => !m.paperId || m.paperId === paperId)
                  .map(m => (
                    <option key={m.id} value={m.id}>
                      {m.title} ({paperQuestions.filter(q => q.sourceMaterialId === m.id).length} questions)
                    </option>
                  ))}
              </select>
            </div>
          </div>
        </div>

        {/* Step 2: Question Type & Topic Filters */}
        <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center space-x-2">
            <span className="w-5 h-5 rounded-full bg-neutral-900 text-white text-xs flex items-center justify-center font-bold">2</span>
            <span>Question Types & Syllabus Topics</span>
          </h2>

          {/* Question Type Radio Selector */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-2">
              Question Format (Only formats supported by selected material are enabled)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <label
                className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex flex-col justify-between ${
                  questionTypeFilter === 'all'
                    ? 'border-acca-red bg-red-50/20 text-gray-900 ring-1 ring-acca-red font-bold'
                    : 'border-gray-200 bg-white hover:border-gray-300 text-gray-600'
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
                <span>Mixed Formats</span>
                <span className="text-[10px] text-gray-400 mt-1">All available</span>
              </label>

              <label
                className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex flex-col justify-between ${
                  !supportedTypes.hasObjective
                    ? 'opacity-40 cursor-not-allowed bg-gray-50 border-gray-200'
                    : questionTypeFilter === 'objective'
                    ? 'border-acca-red bg-red-50/20 text-gray-900 ring-1 ring-acca-red font-bold'
                    : 'border-gray-200 bg-white hover:border-gray-300 text-gray-600'
                }`}
              >
                <input
                  type="radio"
                  name="qType"
                  value="objective"
                  disabled={!supportedTypes.hasObjective}
                  checked={questionTypeFilter === 'objective'}
                  onChange={() => setQuestionTypeFilter('objective')}
                  className="hidden"
                />
                <span>Objective Only</span>
                <span className="text-[10px] text-gray-400 mt-1">MCQ & Multi-Select</span>
              </label>

              <label
                className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex flex-col justify-between ${
                  !supportedTypes.hasWritten
                    ? 'opacity-40 cursor-not-allowed bg-gray-50 border-gray-200'
                    : questionTypeFilter === 'written'
                    ? 'border-acca-red bg-red-50/20 text-gray-900 ring-1 ring-acca-red font-bold'
                    : 'border-gray-200 bg-white hover:border-gray-300 text-gray-600'
                }`}
              >
                <input
                  type="radio"
                  name="qType"
                  value="written"
                  disabled={!supportedTypes.hasWritten}
                  checked={questionTypeFilter === 'written'}
                  onChange={() => setQuestionTypeFilter('written')}
                  className="hidden"
                />
                <span>Constructed Essay</span>
                <span className="text-[10px] text-gray-400 mt-1">Section C Theory</span>
              </label>

              <label
                className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex flex-col justify-between ${
                  !supportedTypes.hasCalculation
                    ? 'opacity-40 cursor-not-allowed bg-gray-50 border-gray-200'
                    : questionTypeFilter === 'calculation'
                    ? 'border-acca-red bg-red-50/20 text-gray-900 ring-1 ring-acca-red font-bold'
                    : 'border-gray-200 bg-white hover:border-gray-300 text-gray-600'
                }`}
              >
                <input
                  type="radio"
                  name="qType"
                  value="calculation"
                  disabled={!supportedTypes.hasCalculation}
                  checked={questionTypeFilter === 'calculation'}
                  onChange={() => setQuestionTypeFilter('calculation')}
                  className="hidden"
                />
                <span>Calculations</span>
                <span className="text-[10px] text-gray-400 mt-1">Numerical Items</span>
              </label>
            </div>
          </div>

          {/* Topics Chips */}
          {availableTopics.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-gray-700 uppercase">
                  Filter by Topic ({selectedTopics.length > 0 ? `${selectedTopics.length} selected` : 'All Topics'})
                </label>
                {selectedTopics.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedTopics([])}
                    className="text-xs text-acca-red hover:underline"
                  >
                    Clear topic filters
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1">
                {availableTopics.map(topic => {
                  const isSelected = selectedTopics.includes(topic);
                  return (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => toggleTopic(topic)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                        isSelected
                          ? 'bg-acca-red text-white border-acca-red font-semibold'
                          : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      #{topic}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Step 3: Exam Rules, Timer & Ordering */}
        <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center space-x-2">
            <span className="w-5 h-5 rounded-full bg-neutral-900 text-white text-xs flex items-center justify-center font-bold">3</span>
            <span>Timing, Quantity & Ordering</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Question count */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-gray-700 uppercase">
                  Number of Questions
                </label>
                <span className="text-xs font-bold text-acca-red">
                  {effectiveCount} / {maxAvailable}
                </span>
              </div>
              <input
                type="number"
                min="1"
                max={Math.max(1, maxAvailable)}
                value={effectiveCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="w-full text-xs font-bold border border-gray-300 rounded-xl p-2.5 outline-none focus:border-acca-red"
              />
            </div>

            {/* Ordering */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Question Ordering
              </label>
              <select
                value={ordering}
                onChange={(e) => setOrdering(e.target.value as QuestionOrdering)}
                className="w-full text-xs font-medium border border-gray-300 rounded-xl p-2.5 outline-none focus:border-acca-red bg-white"
              >
                <option value="randomized">Randomized (Shuffled)</option>
                <option value="sequential">Sequential (Order in paper)</option>
                <option value="by_topic">Grouped by Topic</option>
              </select>
            </div>

            {/* Timing Mode */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Timer Mode
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode('timed')}
                  className={`py-2 text-xs font-bold rounded-xl border transition-colors ${
                    mode === 'timed'
                      ? 'bg-neutral-900 text-white border-neutral-900'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Timed Mode
                </button>
                <button
                  type="button"
                  onClick={() => setMode('untimed')}
                  className={`py-2 text-xs font-bold rounded-xl border transition-colors ${
                    mode === 'untimed'
                      ? 'bg-neutral-900 text-white border-neutral-900'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Untimed Mode
                </button>
              </div>
            </div>
          </div>

          {/* Timer Duration if timed */}
          {mode === 'timed' && (
            <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
              <span className="font-bold text-gray-700">Exam Duration:</span>
              <div className="flex items-center space-x-2">
                {[15, 30, 45, 60, 195].map(mins => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setDurationMinutes(mins)}
                    className={`px-3 py-1.5 rounded-lg border font-semibold ${
                      durationMinutes === mins
                        ? 'bg-acca-red text-white border-acca-red'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {mins === 195 ? '3h 15m (Full)' : `${mins}m`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Feedback mode */}
          <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="font-bold text-gray-700">Solution Feedback:</span>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setFeedbackMode('delayed')}
                className={`px-3 py-1.5 rounded-lg border font-semibold ${
                  feedbackMode === 'delayed'
                    ? 'bg-neutral-900 text-white border-neutral-900'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                Delayed (After Final Submission)
              </button>
              <button
                type="button"
                onClick={() => setFeedbackMode('immediate')}
                className={`px-3 py-1.5 rounded-lg border font-semibold ${
                  feedbackMode === 'immediate'
                    ? 'bg-neutral-900 text-white border-neutral-900'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                Immediate (After Each Question)
              </button>
            </div>
          </div>
        </div>

        {/* Launch Button & Summary */}
        <div className="bg-neutral-900 text-white rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm text-gray-200">
                Ready to simulate: <strong className="text-white">{paperId} Exam</strong>
              </span>
              <span className="text-xs text-acca-red font-semibold bg-neutral-800 px-2 py-0.5 rounded">
                {effectiveCount} Questions
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              {mode === 'timed' ? `Timed session (${durationMinutes} minutes)` : 'Untimed practice session'}{' '}
              • {feedbackMode === 'delayed' ? 'Results reveal on final submission' : 'Immediate feedback mode'}
            </p>
          </div>

          <button
            type="submit"
            disabled={maxAvailable === 0}
            className="bg-acca-red hover:bg-acca-red-dark disabled:opacity-40 text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center justify-center space-x-2 shadow-lg transition-all shrink-0 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Launch Exam Environment</span>
          </button>
        </div>
      </form>
    </div>
  );
};
