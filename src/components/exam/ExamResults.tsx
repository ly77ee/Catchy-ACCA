import React, { useState } from 'react';
import {
  ExamAttemptRecord,
  QuestionRecord,
  QualificationVersion
} from '../../types';
import { CircularProgress } from '../common/CircularProgress';
import { scoreQuestionResponse } from '../../utils/examScoring';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  RotateCcw,
  ListFilter,
  ArrowRight,
  BookOpen,
  Award
} from 'lucide-react';

interface ExamResultsProps {
  attempt: ExamAttemptRecord;
  questions: QuestionRecord[];
  onRetake: () => void;
  onNewExam: () => void;
  onOpenQuestionInManager?: (questionId: string) => void;
}

export const ExamResults: React.FC<ExamResultsProps> = ({
  attempt,
  questions,
  onRetake,
  onNewExam,
  onOpenQuestionInManager,
}) => {
  const [filter, setFilter] = useState<'all' | 'correct' | 'incorrect' | 'written'>('all');

  // Format seconds to mm:ss or hh:mm:ss
  const formatTime = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m ${s}s`;
    }
    return `${mins}m ${s}s`;
  };

  // Evaluate all questions
  const evaluatedQuestions = questions.map(q => {
    const resp = attempt.responses[q.id];
    const scoring = scoreQuestionResponse(q, resp);
    return {
      question: q,
      response: resp,
      scoring
    };
  });

  const correctCount = evaluatedQuestions.filter(e => e.scoring.isCorrect && e.scoring.isAutoMarked).length;
  const incorrectCount = evaluatedQuestions.filter(e => !e.scoring.isCorrect && e.scoring.isAutoMarked).length;
  const writtenCount = evaluatedQuestions.filter(e => !e.scoring.isAutoMarked).length;

  const filteredItems = evaluatedQuestions.filter(item => {
    if (filter === 'correct') return item.scoring.isCorrect && item.scoring.isAutoMarked;
    if (filter === 'incorrect') return !item.scoring.isCorrect && item.scoring.isAutoMarked;
    if (filter === 'written') return !item.scoring.isAutoMarked;
    return true;
  });

  const isPassed = attempt.scorePercentage >= 50; // ACCA standard passing mark is 50%

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Hero Score Card */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-6 md:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-gray-100">
          <div className="flex items-center space-x-6">
            <CircularProgress
              percentage={attempt.scorePercentage}
              size={110}
              strokeWidth={10}
              color={isPassed ? '#16A34A' : '#C00000'}
              subLabel="Score"
            />
            <div>
              <div className="flex items-center space-x-2">
                <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                  isPassed ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-acca-red'
                }`}>
                  {isPassed ? 'Pass Mark Achieved (≥ 50%)' : 'Needs Practice (< 50%)'}
                </span>
                <span className="text-xs text-gray-400 font-bold">{attempt.paperId} Paper</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 mt-1">
                {attempt.totalMarksScored} / {attempt.totalMarksAvailable} Marks Awarded
              </h1>
              <p className="text-xs text-gray-500 mt-1">
                Completed on {new Date(attempt.completedAt || attempt.startedAt).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full md:w-auto">
            <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-3 text-center">
              <span className="text-xl font-black text-emerald-800">{correctCount}</span>
              <span className="block text-[11px] font-bold text-emerald-700 uppercase mt-0.5">Correct</span>
            </div>
            <div className="bg-red-50/70 border border-red-100 rounded-xl p-3 text-center">
              <span className="text-xl font-black text-acca-red">{incorrectCount}</span>
              <span className="block text-[11px] font-bold text-acca-red uppercase mt-0.5">Incorrect</span>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center col-span-2 sm:col-span-1">
              <span className="text-xl font-black text-gray-700">{formatTime(attempt.totalTimeSeconds)}</span>
              <span className="block text-[11px] font-bold text-gray-500 uppercase mt-0.5">Time Spent</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-6">
          <div className="flex items-center space-x-2">
            <button
              onClick={onRetake}
              className="px-4 py-2 text-xs font-bold rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center space-x-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retake Same Questions</span>
            </button>
            <button
              onClick={onNewExam}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-acca-red hover:bg-acca-red-dark text-white flex items-center space-x-1.5 transition-colors shadow-xs"
            >
              <span>Configure New Simulation</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <span className="text-xs text-gray-500">
            Recorded in local attempt history
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            filter === 'all'
              ? 'bg-neutral-900 text-white'
              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          All Questions ({evaluatedQuestions.length})
        </button>
        <button
          onClick={() => setFilter('correct')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            filter === 'correct'
              ? 'bg-emerald-700 text-white'
              : 'bg-white border border-gray-200 text-emerald-800 hover:bg-gray-50'
          }`}
        >
          Correct ({correctCount})
        </button>
        <button
          onClick={() => setFilter('incorrect')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            filter === 'incorrect'
              ? 'bg-acca-red text-white'
              : 'bg-white border border-gray-200 text-acca-red hover:bg-gray-50'
          }`}
        >
          Incorrect ({incorrectCount})
        </button>
        {writtenCount > 0 && (
          <button
            onClick={() => setFilter('written')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              filter === 'written'
                ? 'bg-blue-700 text-white'
                : 'bg-white border border-gray-200 text-blue-800 hover:bg-gray-50'
            }`}
          >
            Constructed Responses ({writtenCount})
          </button>
        )}
      </div>

      {/* Detailed Breakdown List */}
      <div className="space-y-4">
        {filteredItems.map(({ question, response, scoring }, idx) => {
          const isObjective = scoring.isAutoMarked;
          const studentSelected = response?.selectedOptionIds || [];

          return (
            <div
              key={question.id}
              className={`bg-white rounded-2xl border p-6 shadow-xs space-y-4 transition-all ${
                isObjective
                  ? scoring.isCorrect
                    ? 'border-emerald-200'
                    : 'border-red-200'
                  : 'border-gray-200'
              }`}
            >
              {/* Question Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-gray-100">
                <div className="flex items-center space-x-2.5">
                  <span className="font-black text-gray-900 text-sm">
                    {question.questionNumber}
                  </span>
                  <span className="text-xs font-semibold text-gray-500">
                    • {question.questionType.replace('_', ' ')}
                  </span>
                  {question.topicTags.map(t => (
                    <span key={t} className="text-[10px] font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                      #{t}
                    </span>
                  ))}
                </div>

                <div className="flex items-center space-x-2 text-xs font-bold">
                  {isObjective ? (
                    scoring.isCorrect ? (
                      <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg flex items-center space-x-1 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Awarded {scoring.marksAwarded}/{scoring.maxMarks} Marks</span>
                      </span>
                    ) : (
                      <span className="text-acca-red bg-red-50 px-2.5 py-1 rounded-lg flex items-center space-x-1 border border-red-200">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>0 / {scoring.maxMarks} Marks</span>
                      </span>
                    )
                  ) : (
                    <span className="text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                      Self-Evaluation Required ({scoring.maxMarks} Marks)
                    </span>
                  )}
                </div>
              </div>

              {/* Title & Prompt */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">{question.title}</h3>
                <p className="text-xs text-gray-600 leading-relaxed font-sans whitespace-pre-wrap bg-gray-50 p-3 rounded-xl border border-gray-100">
                  {question.notes || question.title}
                </p>
              </div>

              {/* Objective Options Comparison */}
              {question.options && question.options.length > 0 && (
                <div className="space-y-2 pt-1">
                  <span className="block text-xs font-bold text-gray-500 uppercase">
                    Options Evaluation:
                  </span>
                  <div className="space-y-1.5">
                    {question.options.map(opt => {
                      const isStudentChoice = studentSelected.includes(opt.label);
                      const isCorrectChoice = (question.correctOptionIds || []).includes(opt.label);

                      let style = 'bg-white border-gray-200 text-gray-700';
                      let labelStyle = 'bg-gray-100 text-gray-700';

                      if (isCorrectChoice) {
                        style = 'bg-emerald-50/80 border-emerald-300 text-emerald-950 font-semibold';
                        labelStyle = 'bg-emerald-600 text-white';
                      } else if (isStudentChoice && !isCorrectChoice) {
                        style = 'bg-red-50/80 border-red-300 text-red-950';
                        labelStyle = 'bg-acca-red text-white';
                      }

                      return (
                        <div
                          key={opt.id}
                          className={`p-2.5 rounded-xl border text-xs flex items-start space-x-2.5 ${style}`}
                        >
                          <div className={`w-6 h-6 rounded font-bold text-xs flex items-center justify-center shrink-0 ${labelStyle}`}>
                            {opt.label}
                          </div>
                          <div className="flex-1 leading-snug">
                            <span>{opt.text}</span>
                            {isCorrectChoice && (
                              <span className="ml-2 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                                Official Answer Key
                              </span>
                            )}
                            {isStudentChoice && !isCorrectChoice && (
                              <span className="ml-2 text-[10px] font-bold text-acca-red bg-red-100 px-1.5 py-0.2 rounded">
                                Your Selection
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Written Answer Comparison */}
              {(!question.options || question.options.length === 0) && (
                <div className="space-y-3 pt-1">
                  <div>
                    <span className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      Your Written Response:
                    </span>
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 font-mono text-xs text-gray-800 whitespace-pre-wrap leading-relaxed">
                      {response?.writtenAnswer?.trim() || <em className="text-gray-400">No response provided.</em>}
                    </div>
                  </div>
                </div>
              )}

              {/* Solution / Marking Guide Explanation */}
              {(scoring.explanation || question.markingGuide) && (
                <div className="p-3.5 bg-gray-50/80 border border-gray-200 rounded-xl text-xs space-y-1">
                  <div className="flex items-center space-x-1.5 font-bold text-gray-800">
                    <BookOpen className="w-3.5 h-3.5 text-acca-red" />
                    <span>Official Solution & Marking Guide:</span>
                  </div>
                  <p className="text-gray-600 leading-relaxed">
                    {question.markingGuide || scoring.explanation}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
