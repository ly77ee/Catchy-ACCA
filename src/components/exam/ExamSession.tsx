import React, { useState, useEffect, useRef } from 'react';
import {
  QuestionRecord,
  ExamConfig,
  StudentExamResponse,
  ExamAttemptRecord
} from '../../types';
import {
  ChevronLeft,
  ChevronRight,
  Flag,
  Clock,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ExternalLink,
  Send,
  XCircle,
  Check,
  FileText,
  Table2,
  PenTool
} from 'lucide-react';
import { scoreQuestionResponse } from '../../utils/examScoring';

interface ExamSessionProps {
  config: ExamConfig;
  questions: QuestionRecord[];
  onFinishExam: (attempt: ExamAttemptRecord) => void;
  onExitWithoutSaving: () => void;
}

export const ExamSession: React.FC<ExamSessionProps> = ({
  config,
  questions,
  onFinishExam,
  onExitWithoutSaving,
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [responses, setResponses] = useState<Record<string, StudentExamResponse>>({});
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);

  // Timing
  const totalDurationSeconds = (config.durationMinutes || 30) * 60;
  const [secondsRemaining, setSecondsRemaining] = useState<number>(totalDurationSeconds);
  const [totalTimeSpent, setTotalTimeSpent] = useState<number>(0);
  const startTimeRef = useRef<number>(Date.now());

  // Timer effect
  useEffect(() => {
    if (config.mode !== 'timed') {
      const interval = setInterval(() => {
        setTotalTimeSpent(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }

    const interval = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleAutoSubmitOnTimeOut();
          return 0;
        }
        return prev - 1;
      });
      setTotalTimeSpent(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [config.mode]);

  const currentQuestion = questions[currentIndex];
  const currentResponse = responses[currentQuestion?.id] || {
    questionId: currentQuestion?.id,
    selectedOptionIds: [],
    writtenAnswer: '',
    isFlaggedForReview: false
  };

  const formatTime = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const updateCurrentResponse = (updater: (prev: StudentExamResponse) => StudentExamResponse) => {
    if (!currentQuestion) return;
    setResponses(prev => {
      const existing = prev[currentQuestion.id] || {
        questionId: currentQuestion.id,
        selectedOptionIds: [],
        writtenAnswer: '',
        isFlaggedForReview: false
      };
      return {
        ...prev,
        [currentQuestion.id]: {
          ...updater(existing),
          answeredAt: new Date().toISOString()
        }
      };
    });
  };

  const handleSelectSingleOption = (optionLabel: string) => {
    updateCurrentResponse(prev => ({
      ...prev,
      selectedOptionIds: [optionLabel]
    }));
  };

  const handleToggleMultiOption = (optionLabel: string) => {
    updateCurrentResponse(prev => {
      const current = prev.selectedOptionIds || [];
      const updated = current.includes(optionLabel)
        ? current.filter(o => o !== optionLabel)
        : [...current, optionLabel];
      return {
        ...prev,
        selectedOptionIds: updated
      };
    });
  };

  const handleWrittenTextChange = (text: string) => {
    updateCurrentResponse(prev => ({
      ...prev,
      writtenAnswer: text
    }));
  };

  const handleToggleFlag = () => {
    updateCurrentResponse(prev => ({
      ...prev,
      isFlaggedForReview: !prev.isFlaggedForReview
    }));
  };

  const handleAutoSubmitOnTimeOut = () => {
    alert('Time has expired for this exam attempt. Your answers will now be evaluated and submitted.');
    finalizeAndSubmit();
  };

  const finalizeAndSubmit = () => {
    let totalMarksAvailable = 0;
    let totalMarksScored = 0;

    questions.forEach(q => {
      const resp = responses[q.id];
      const maxMarks = q.availableMarks || 2;
      totalMarksAvailable += maxMarks;

      const scored = scoreQuestionResponse(q, resp);
      if (scored.isAutoMarked) {
        totalMarksScored += scored.marksAwarded;
      } else {
        totalMarksScored += resp?.marksAwarded ?? 0;
      }
    });

    const scorePercentage =
      totalMarksAvailable > 0
        ? Math.round((totalMarksScored / totalMarksAvailable) * 100)
        : 0;

    const attemptRecord: ExamAttemptRecord = {
      id: 'att-' + Date.now(),
      paperId: config.paperId,
      startedAt: new Date(startTimeRef.current).toISOString(),
      completedAt: new Date().toISOString(),
      totalTimeSeconds: totalTimeSpent,
      config,
      questionIds: questions.map(q => q.id),
      responses,
      totalMarksAvailable,
      totalMarksScored,
      scorePercentage,
      status: 'completed'
    };

    onFinishExam(attemptRecord);
  };

  const answeredCount = questions.filter(q => {
    const r = responses[q.id];
    return r && (r.selectedOptionIds?.length || r.writtenAnswer?.trim());
  }).length;
  const unansweredCount = questions.length - answeredCount;
  const flaggedCount = questions.filter(q => responses[q.id]?.isFlaggedForReview).length;

  const isLowTime = config.mode === 'timed' && secondsRemaining <= 300;

  return (
    <div className="flex flex-col h-[90vh] bg-[#141419] rounded-2xl border border-[#2a2a34] overflow-hidden shadow-2xl">
      {/* Top Header Bar */}
      <header className="bg-[#1e1e24] px-6 py-3 border-b border-[#2a2a34] text-white flex items-center justify-between select-none shrink-0">
        <div className="flex items-center space-x-4">
          <span className="font-black text-xs tracking-tight text-white bg-acca-red px-2.5 py-1 rounded-lg">
            {config.paperId}
          </span>
          <span className="text-xs font-bold text-gray-300 hidden sm:inline">
            ACCA CBE Simulation
          </span>
          <span className="text-xs text-gray-400">
            Question <strong>{currentIndex + 1}</strong> of {questions.length}
          </span>
        </div>

        {/* Timer & Controls */}
        <div className="flex items-center space-x-4">
          <div
            className={`flex items-center space-x-2 px-3 py-1 rounded-xl font-mono text-xs font-bold transition-all ${
              config.mode === 'timed'
                ? isLowTime
                  ? 'bg-rose-950/80 text-rose-300 border border-rose-600 animate-pulse'
                  : 'bg-[#141419] text-gray-200 border border-[#2a2a34]'
                : 'bg-[#141419] text-gray-400 border border-[#2a2a34]'
            }`}
          >
            <Clock className={`w-3.5 h-3.5 ${isLowTime ? 'text-rose-400' : 'text-gray-400'}`} />
            <span>
              {config.mode === 'timed'
                ? `Time: ${formatTime(secondsRemaining)}`
                : `Elapsed: ${formatTime(totalTimeSpent)}`}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsExitModalOpen(true)}
              className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded transition-colors"
            >
              Exit
            </button>
            <button
              onClick={() => setIsSubmitModalOpen(true)}
              className="bg-acca-red hover:bg-acca-red-hover text-white text-xs font-bold px-4 py-1.5 rounded-xl shadow-xs transition-colors flex items-center space-x-1"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Finish Exam</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left / Center Viewport */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col justify-between space-y-6">
          <div className="space-y-6 max-w-4xl">
            {/* Question Meta Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#2a2a34]">
              <div className="flex items-center space-x-3">
                <span className="text-base font-black text-white font-mono">
                  {currentQuestion?.questionNumber || `Question ${currentIndex + 1}`}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#1e1e24] text-gray-300 border border-[#2a2a34]">
                  {currentQuestion?.availableMarks || 2} Marks
                </span>
                {currentQuestion?.difficulty && (
                  <span className="text-[10px] font-semibold text-gray-400 uppercase">
                    {currentQuestion.difficulty}
                  </span>
                )}
              </div>

              {/* Flag for review */}
              <button
                type="button"
                onClick={handleToggleFlag}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors ${
                  currentResponse.isFlaggedForReview
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-[#1e1e24] text-gray-400 hover:text-white border border-[#2a2a34]'
                }`}
              >
                <Flag className={`w-3.5 h-3.5 ${currentResponse.isFlaggedForReview ? 'fill-amber-400 text-amber-400' : ''}`} />
                <span>{currentResponse.isFlaggedForReview ? 'Flagged for Review' : 'Flag Question'}</span>
              </button>
            </div>

            {/* Scenario & Background Exhibit if present */}
            {currentQuestion?.scenario && (
              <div className="bg-[#1e1e24] p-4 rounded-2xl border border-[#2a2a34] space-y-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  Scenario & Exhibits:
                </span>
                <div className="text-xs text-gray-300 leading-relaxed whitespace-pre-line font-sans">
                  {currentQuestion.scenario}
                </div>
              </div>
            )}

            {/* Question Title & Prompt Requirement */}
            <div className="space-y-3">
              <h2 className="text-sm md:text-base font-bold text-white leading-snug">
                {currentQuestion?.title}
              </h2>
              <div className="p-4 bg-[#1e1e24] border border-[#2a2a34] rounded-2xl text-xs text-gray-200 leading-relaxed font-sans whitespace-pre-line">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                  Specific Requirements:
                </span>
                {currentQuestion?.content || currentQuestion?.notes}
              </div>
            </div>

            {/* Student Answer Controls */}
            <div className="pt-2">
              {currentQuestion?.options && currentQuestion.options.length > 0 ? (
                // Objective MCQ Options (Correct answer is strictly not exposed)
                <div className="space-y-2.5">
                  <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    {currentQuestion.questionType === 'multi_select'
                      ? 'Select all applicable options:'
                      : 'Select one option:'}
                  </span>

                  {currentQuestion.options.map(opt => {
                    const isSelected = (currentResponse.selectedOptionIds || []).includes(opt.label);
                    const isMulti = currentQuestion.questionType === 'multi_select';

                    return (
                      <div
                        key={opt.id}
                        onClick={() => {
                          if (isMulti) handleToggleMultiOption(opt.label);
                          else handleSelectSingleOption(opt.label);
                        }}
                        className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all flex items-start space-x-3 ${
                          isSelected
                            ? 'bg-acca-red/10 border-acca-red text-white font-semibold'
                            : 'bg-[#1e1e24] border-[#2a2a34] hover:border-[#3d3d4d] text-gray-300'
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                            isSelected
                              ? 'bg-acca-red text-white'
                              : 'bg-[#141419] border border-[#2a2a34] text-gray-400'
                          }`}
                        >
                          {isSelected ? <Check className="w-3.5 h-3.5" /> : opt.label}
                        </div>
                        <span className="leading-relaxed flex-1">{opt.text}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                // Constructed Response Workspace
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-300 uppercase flex items-center space-x-1.5">
                      <PenTool className="w-3.5 h-3.5 text-acca-red" />
                      <span>Candidate Written Response Workspace</span>
                    </span>
                    <span className="text-xs text-gray-500 font-mono">
                      Words: {currentResponse.writtenAnswer?.trim() ? currentResponse.writtenAnswer.trim().split(/\s+/).length : 0}
                    </span>
                  </div>
                  <textarea
                    rows={10}
                    value={currentResponse.writtenAnswer || ''}
                    onChange={e => handleWrittenTextChange(e.target.value)}
                    placeholder="Type your structured solution, standard references, and analytical commentary here..."
                    className="w-full text-xs font-mono border border-[#2a2a34] rounded-xl p-4 outline-none focus:border-acca-red leading-relaxed bg-[#1e1e24] text-white placeholder-gray-600"
                  />
                  <p className="text-[11px] text-gray-500">
                    Auto-saved locally. Responses are evaluated against the official author marking rubric during results review.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Navigation Buttons */}
          <div className="pt-4 border-t border-[#2a2a34] flex items-center justify-between">
            <button
              type="button"
              disabled={currentIndex <= 0}
              onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
              className="px-4 py-2 rounded-xl border border-[#2a2a34] text-xs font-bold text-gray-300 hover:text-white hover:bg-[#1e1e24] disabled:opacity-25 flex items-center space-x-1.5 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous Question</span>
            </button>

            <span className="text-xs text-gray-400 font-semibold">
              {currentIndex + 1} of {questions.length}
            </span>

            {currentIndex < questions.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
                className="px-5 py-2 rounded-xl bg-white hover:bg-gray-200 text-xs font-bold text-black flex items-center space-x-1.5 transition-colors"
              >
                <span>Next Question</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(true)}
                className="px-5 py-2 rounded-xl bg-acca-red hover:bg-acca-red-hover text-xs font-bold text-white flex items-center space-x-1.5 transition-colors shadow-xs"
              >
                <Send className="w-4 h-4" />
                <span>Review & Submit</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Sidebar: Question Navigator */}
        <aside className="w-64 bg-[#1e1e24] border-l border-[#2a2a34] p-4 flex flex-col justify-between shrink-0 overflow-y-auto select-none">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#2a2a34] mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-300">
                Navigator
              </span>
              <span className="text-xs font-bold text-gray-400">
                {answeredCount}/{questions.length} Answered
              </span>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-4 gap-2 mb-6">
              {questions.map((q, idx) => {
                const resp = responses[q.id];
                const isAnswered = resp && (resp.selectedOptionIds?.length || resp.writtenAnswer?.trim());
                const isFlagged = resp?.isFlaggedForReview;
                const isCurrent = currentIndex === idx;

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`relative h-10 rounded-xl font-bold text-xs flex items-center justify-center transition-all ${
                      isCurrent
                        ? 'bg-acca-red text-white ring-2 ring-white/30'
                        : isAnswered
                        ? 'bg-[#141419] text-emerald-400 border border-emerald-500/30'
                        : 'bg-[#141419] text-gray-400 border border-[#2a2a34] hover:text-white'
                    }`}
                  >
                    <span>{idx + 1}</span>
                    {isFlagged && (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Legend */}
          <div className="pt-3 border-t border-[#2a2a34] text-[10px] space-y-1.5 text-gray-400">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span>Answered ({answeredCount})</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span>Flagged for Review ({flaggedCount})</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-gray-600" />
              <span>Unanswered ({unansweredCount})</span>
            </div>
          </div>
        </aside>
      </div>

      {/* Submit Confirmation Modal */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[#1e1e24] border border-[#2a2a34] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-white">
              <AlertTriangle className="w-5 h-5 text-acca-red" />
              <h3 className="text-base font-bold">Submit Exam Attempt?</h3>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              You have answered <strong>{answeredCount}</strong> of <strong>{questions.length}</strong> questions.
              {unansweredCount > 0 && ` There are ${unansweredCount} unanswered questions remaining.`}
            </p>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(false)}
                className="px-4 py-2 bg-[#141419] hover:bg-[#25252e] text-gray-300 rounded-xl text-xs font-semibold border border-[#2a2a34]"
              >
                Continue Exam
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsSubmitModalOpen(false);
                  finalizeAndSubmit();
                }}
                className="px-4 py-2 bg-acca-red hover:bg-acca-red-hover text-white rounded-xl text-xs font-bold"
              >
                Submit and View Results
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exit Modal */}
      {isExitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[#1e1e24] border border-[#2a2a34] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Exit Simulation?</h3>
            <p className="text-xs text-gray-300 leading-relaxed">
              Exiting now without submitting will discard unsaved exam progress.
            </p>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsExitModalOpen(false)}
                className="px-4 py-2 bg-[#141419] hover:bg-[#25252e] text-gray-300 rounded-xl text-xs font-semibold border border-[#2a2a34]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onExitWithoutSaving}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold"
              >
                Exit Simulation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
