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
  Check
} from 'lucide-react';
import { scoreQuestionResponse } from '../../utils/examScoring';
import { Modal } from '../common/Modal';

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

  // Immediate feedback revealed questions state
  const [revealedQuestions, setRevealedQuestions] = useState<Record<string, boolean>>({});

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

  // Format seconds to HH:MM:SS or MM:SS
  const formatTime = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Update response helper
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
        [currentQuestion.id]: updater(existing)
      };
    });
  };

  // Option selection for single select
  const handleSelectSingleOption = (optLabel: string) => {
    updateCurrentResponse(prev => ({
      ...prev,
      selectedOptionIds: [optLabel],
      answeredAt: new Date().toISOString()
    }));
  };

  // Option selection for multi select
  const handleToggleMultiOption = (optLabel: string) => {
    updateCurrentResponse(prev => {
      const existing = prev.selectedOptionIds || [];
      const updated = existing.includes(optLabel)
        ? existing.filter(l => l !== optLabel)
        : [...existing, optLabel];
      return {
        ...prev,
        selectedOptionIds: updated,
        answeredAt: new Date().toISOString()
      };
    });
  };

  // Written response text change
  const handleWrittenTextChange = (text: string) => {
    updateCurrentResponse(prev => ({
      ...prev,
      writtenAnswer: text,
      answeredAt: new Date().toISOString()
    }));
  };

  // Flag for review toggle
  const handleToggleFlag = () => {
    updateCurrentResponse(prev => ({
      ...prev,
      isFlaggedForReview: !prev.isFlaggedForReview
    }));
  };

  // Auto submit when timer expires
  const handleAutoSubmitOnTimeOut = () => {
    alert('Time has expired! Submitting your exam responses now.');
    handleSubmitExam();
  };

  // Final submission packaging
  const handleSubmitExam = () => {
    let totalMarksAvailable = 0;
    let totalMarksScored = 0;

    const evaluatedResponses: Record<string, StudentExamResponse> = {};

    questions.forEach(q => {
      const resp = responses[q.id];
      const marking = scoreQuestionResponse(q, resp);
      totalMarksAvailable += marking.maxMarks;
      totalMarksScored += marking.marksAwarded;

      evaluatedResponses[q.id] = {
        questionId: q.id,
        selectedOptionIds: resp?.selectedOptionIds || [],
        writtenAnswer: resp?.writtenAnswer || '',
        isFlaggedForReview: !!resp?.isFlaggedForReview,
        marksAwarded: marking.marksAwarded,
        isAutoMarked: marking.isAutoMarked,
        answeredAt: resp?.answeredAt || new Date().toISOString()
      };
    });

    const scorePercentage = totalMarksAvailable > 0
      ? Math.round((totalMarksScored / totalMarksAvailable) * 100)
      : 0;

    const attemptRecord: ExamAttemptRecord = {
      id: 'attempt-' + Date.now(),
      paperId: config.paperId,
      startedAt: new Date(startTimeRef.current).toISOString(),
      completedAt: new Date().toISOString(),
      totalTimeSeconds: totalTimeSpent,
      config,
      questionIds: questions.map(q => q.id),
      responses: evaluatedResponses,
      totalMarksAvailable,
      totalMarksScored,
      scorePercentage,
      status: 'completed'
    };

    onFinishExam(attemptRecord);
  };

  // Summary counts for review navigator
  const answeredCount = questions.filter(q => {
    const r = responses[q.id];
    return r && (r.selectedOptionIds?.length || r.writtenAnswer?.trim());
  }).length;
  const unansweredCount = questions.length - answeredCount;
  const flaggedCount = questions.filter(q => responses[q.id]?.isFlaggedForReview).length;

  const isCurrentAnswered =
    currentResponse.selectedOptionIds?.length || currentResponse.writtenAnswer?.trim();

  // Immediate mode check
  const isImmediateRevealed = revealedQuestions[currentQuestion?.id];
  const immediateMarking = isImmediateRevealed
    ? scoreQuestionResponse(currentQuestion, currentResponse)
    : null;

  const isLowTime = config.mode === 'timed' && secondsRemaining <= 300; // under 5 mins

  return (
    <div className="flex flex-col h-[90vh] bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-2xl">
      {/* Top CBE Exam Header */}
      <header className="bg-neutral-900 px-6 py-3 border-b border-neutral-800 text-white flex items-center justify-between select-none shrink-0">
        <div className="flex items-center space-x-4">
          <span className="font-black text-sm tracking-tight text-white bg-acca-red px-2.5 py-0.5 rounded">
            {config.paperId}
          </span>
          <span className="text-xs font-bold text-neutral-300 hidden sm:inline">
            ACCA CBE Simulator · Exam Session
          </span>
          <span className="text-xs text-neutral-400">
            Question <strong>{currentIndex + 1}</strong> of {questions.length}
          </span>
        </div>

        {/* Timer Bar */}
        <div className="flex items-center space-x-6">
          <div
            className={`flex items-center space-x-2 px-3 py-1 rounded-xl font-mono text-xs font-bold transition-all ${
              config.mode === 'timed'
                ? isLowTime
                  ? 'bg-red-900/60 text-red-200 border border-red-500 animate-pulse'
                  : 'bg-neutral-800 text-neutral-200 border border-neutral-700'
                : 'bg-neutral-800 text-neutral-400'
            }`}
          >
            <Clock className={`w-4 h-4 ${isLowTime ? 'text-acca-red-light' : 'text-neutral-400'}`} />
            <span>
              {config.mode === 'timed'
                ? `Time Remaining: ${formatTime(secondsRemaining)}`
                : `Time Elapsed: ${formatTime(totalTimeSpent)}`}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsExitModalOpen(true)}
              className="text-xs text-neutral-400 hover:text-white px-2 py-1 rounded transition-colors"
            >
              Exit
            </button>
            <button
              onClick={() => setIsSubmitModalOpen(true)}
              className="bg-acca-red hover:bg-acca-red-dark text-white text-xs font-bold px-4 py-1.5 rounded-xl shadow-xs transition-colors flex items-center space-x-1"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Finish Exam</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace: Left Question Area + Right Navigator */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main Question & Answer Viewport */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col justify-between space-y-6">
          <div className="space-y-6 max-w-4xl">
            {/* Question Header Meta */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <span className="text-lg font-black text-gray-900">
                  {currentQuestion?.questionNumber || `Question ${currentIndex + 1}`}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-800">
                  {currentQuestion?.availableMarks || 2} Marks
                </span>
                <span className="text-xs font-medium text-gray-500 uppercase">
                  {currentQuestion?.questionType.replace('_', ' ')}
                </span>
              </div>

              {/* Flag for Review button */}
              <button
                type="button"
                onClick={handleToggleFlag}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors ${
                  currentResponse.isFlaggedForReview
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Flag className={`w-3.5 h-3.5 ${currentResponse.isFlaggedForReview ? 'fill-amber-600 text-amber-600' : ''}`} />
                <span>{currentResponse.isFlaggedForReview ? 'Flagged for Review' : 'Flag Question'}</span>
              </button>
            </div>

            {/* Title & Prompt Text */}
            <div className="space-y-3">
              <h2 className="text-base font-bold text-gray-900 leading-snug">
                {currentQuestion?.title}
              </h2>
              <div className="p-4 bg-gray-50/70 border border-gray-200/80 rounded-2xl text-xs md:text-sm text-gray-800 leading-relaxed font-sans whitespace-pre-wrap">
                {currentQuestion?.notes || currentQuestion?.title}
              </div>

              {currentQuestion?.sourcePage && (
                <div className="text-[11px] text-gray-400 flex items-center space-x-1">
                  <span>Source document reference: Page {currentQuestion.sourcePage}</span>
                </div>
              )}
            </div>

            {/* Answer Controls based on Question Type */}
            <div className="pt-2">
              {currentQuestion?.options && currentQuestion.options.length > 0 ? (
                // Objective Options
                <div className="space-y-2.5">
                  <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    {currentQuestion.questionType === 'multi_select'
                      ? 'Select all that apply:'
                      : 'Select one option:'}
                  </span>

                  {currentQuestion.options.map((opt) => {
                    const isSelected = (currentResponse.selectedOptionIds || []).includes(opt.label);
                    const isMulti = currentQuestion.questionType === 'multi_select';

                    return (
                      <div
                        key={opt.id}
                        onClick={() => {
                          if (isMulti) {
                            handleToggleMultiOption(opt.label);
                          } else {
                            handleSelectSingleOption(opt.label);
                          }
                        }}
                        className={`p-3.5 rounded-xl border text-xs md:text-sm cursor-pointer transition-all flex items-start space-x-3 ${
                          isSelected
                            ? 'bg-red-50/30 border-acca-red ring-1 ring-acca-red text-gray-900 font-semibold'
                            : 'bg-white border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                            isSelected
                              ? 'bg-acca-red text-white'
                              : 'bg-gray-100 text-gray-700'
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
                // Written / Constructed Response
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-700 uppercase">
                      Candidate Response Workspace
                    </span>
                    <span className="text-xs text-gray-400">
                      Words: {currentResponse.writtenAnswer?.trim() ? currentResponse.writtenAnswer.trim().split(/\s+/).length : 0}
                    </span>
                  </div>
                  <textarea
                    rows={8}
                    value={currentResponse.writtenAnswer || ''}
                    onChange={(e) => handleWrittenTextChange(e.target.value)}
                    placeholder="Type your structured solution, workings, and standard references here..."
                    className="w-full text-xs md:text-sm font-mono border border-gray-300 rounded-xl p-3.5 outline-none focus:border-acca-red leading-relaxed bg-white"
                  />
                  <p className="text-[11px] text-gray-400">
                    Auto-saved locally. In accordance with exam standards, written responses are evaluated against the official marking points after submission.
                  </p>
                </div>
              )}
            </div>

            {/* Immediate Feedback Card if enabled */}
            {config.feedbackMode === 'immediate' && (
              <div className="pt-4 border-t border-gray-100">
                {!isImmediateRevealed ? (
                  <button
                    type="button"
                    disabled={!isCurrentAnswered}
                    onClick={() => setRevealedQuestions(prev => ({ ...prev, [currentQuestion.id]: true }))}
                    className="bg-neutral-900 hover:bg-black disabled:opacity-40 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors"
                  >
                    Check Answer & Solution
                  </button>
                ) : immediateMarking ? (
                  <div className={`p-4 rounded-xl border text-xs space-y-2 ${
                    immediateMarking.isCorrect
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-red-50 border-red-200 text-red-900'
                  }`}>
                    <div className="flex items-center space-x-2 font-bold text-sm">
                      {immediateMarking.isCorrect ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Correct! Awarded {immediateMarking.marksAwarded} Marks</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 text-acca-red" />
                          <span>Incorrect (0 Marks Awarded)</span>
                        </>
                      )}
                    </div>
                    {immediateMarking.explanation && (
                      <p className="leading-relaxed">{immediateMarking.explanation}</p>
                    )}
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* Bottom Navigation Buttons */}
          <div className="pt-6 border-t border-gray-200 flex items-center justify-between">
            <button
              type="button"
              disabled={currentIndex <= 0}
              onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
              className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent flex items-center space-x-1.5 transition-colors"
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
                className="px-5 py-2 rounded-xl bg-neutral-900 hover:bg-black text-xs font-bold text-white flex items-center space-x-1.5 transition-colors"
              >
                <span>Next Question</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(true)}
                className="px-5 py-2 rounded-xl bg-acca-red hover:bg-acca-red-dark text-xs font-bold text-white flex items-center space-x-1.5 transition-colors"
              >
                <Send className="w-4 h-4" />
                <span>Review & Submit</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Sidebar: CBE Question Navigator */}
        <aside className="w-64 bg-gray-50 border-l border-gray-200 p-4 flex flex-col justify-between shrink-0 overflow-y-auto select-none">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-700">
                Question Navigator
              </span>
              <span className="text-xs font-bold text-gray-500">
                {answeredCount}/{questions.length}
              </span>
            </div>

            {/* Navigator Grid */}
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
                        ? 'ring-2 ring-acca-red ring-offset-2'
                        : ''
                    } ${
                      isAnswered
                        ? 'bg-neutral-900 text-white shadow-xs'
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span>{idx + 1}</span>
                    {isFlagged && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full border-2 border-white" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="space-y-2 text-[11px] text-gray-500 border-t border-gray-200 pt-3">
              <div className="flex items-center space-x-2">
                <span className="w-3.5 h-3.5 bg-neutral-900 rounded" />
                <span>Answered ({answeredCount})</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3.5 h-3.5 bg-white border border-gray-300 rounded" />
                <span>Unanswered ({unansweredCount})</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 bg-amber-500 rounded-full" />
                <span>Flagged for Review ({flaggedCount})</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={() => setIsSubmitModalOpen(true)}
              className="w-full bg-acca-red hover:bg-acca-red-dark text-white text-xs font-bold py-2.5 rounded-xl shadow-xs transition-colors"
            >
              Finish & Submit
            </button>
          </div>
        </aside>
      </div>

      {/* Submit Confirmation Modal */}
      <Modal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        title="Confirm Exam Submission"
      >
        <div className="space-y-4">
          <p className="text-xs text-gray-600">
            Are you sure you want to complete and submit your exam session? Review your status below:
          </p>

          <div className="grid grid-cols-3 gap-3 bg-gray-50 p-3.5 rounded-xl border border-gray-200 text-center">
            <div>
              <span className="text-xl font-black text-gray-900">{answeredCount}</span>
              <span className="block text-[11px] font-bold text-gray-500 uppercase mt-0.5">Answered</span>
            </div>
            <div>
              <span className={`text-xl font-black ${unansweredCount > 0 ? 'text-amber-600' : 'text-gray-900'}`}>
                {unansweredCount}
              </span>
              <span className="block text-[11px] font-bold text-gray-500 uppercase mt-0.5">Unanswered</span>
            </div>
            <div>
              <span className="text-xl font-black text-amber-600">{flaggedCount}</span>
              <span className="block text-[11px] font-bold text-gray-500 uppercase mt-0.5">Flagged</span>
            </div>
          </div>

          {unansweredCount > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <span>
                You have <strong>{unansweredCount} unanswered questions</strong>. You can return to answer them or submit anyway.
              </span>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsSubmitModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Return to Exam
            </button>
            <button
              type="button"
              onClick={handleSubmitExam}
              className="px-4 py-2 text-xs font-bold text-white bg-acca-red hover:bg-acca-red-dark rounded-lg"
            >
              Submit Exam Now
            </button>
          </div>
        </div>
      </Modal>

      {/* Exit Modal */}
      <Modal
        isOpen={isExitModalOpen}
        onClose={() => setIsExitModalOpen(false)}
        title="Exit Exam Simulation"
      >
        <div className="space-y-4">
          <p className="text-xs text-gray-600">
            Do you want to exit without saving this attempt? Your responses for this session will be discarded.
          </p>

          <div className="flex justify-end space-x-2 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsExitModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Stay in Exam
            </button>
            <button
              type="button"
              onClick={onExitWithoutSaving}
              className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg"
            >
              Exit Without Saving
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
