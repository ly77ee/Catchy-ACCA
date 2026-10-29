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
  Award,
  ShieldCheck
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

  const formatTime = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m ${s}s`;
    }
    return `${mins}m ${s}s`;
  };

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

  const isPassed = attempt.scorePercentage >= 50;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Hero Score Card */}
      <div className="bg-[#1e1e24] rounded-2xl border border-[#2a2a34] p-6 md:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-[#2a2a34]">
          <div className="flex items-center space-x-6">
            <CircularProgress
              percentage={attempt.scorePercentage}
              size={100}
              strokeWidth={9}
              color={isPassed ? '#10b981' : '#c00000'}
              subLabel="Score"
            />
            <div>
              <div className="flex items-center space-x-2">
                <span
                  className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                    isPassed
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  }`}
                >
                  {isPassed ? 'Pass Mark Achieved (≥ 50%)' : 'Needs Practice (< 50%)'}
                </span>
                <span className="text-xs text-gray-400 font-bold">{attempt.paperId} Exam</span>
              </div>
              <h1 className="text-2xl font-black text-white mt-1">
                {attempt.totalMarksScored} / {attempt.totalMarksAvailable} Marks
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                Completed on {new Date(attempt.completedAt || attempt.startedAt).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full md:w-auto">
            <div className="bg-[#141419] border border-[#2a2a34] rounded-xl p-3 text-center">
              <span className="text-lg font-black text-emerald-400">{correctCount}</span>
              <span className="block text-[10px] font-bold text-gray-400 uppercase mt-0.5">Correct</span>
            </div>
            <div className="bg-[#141419] border border-[#2a2a34] rounded-xl p-3 text-center">
              <span className="text-lg font-black text-rose-400">{incorrectCount}</span>
              <span className="block text-[10px] font-bold text-gray-400 uppercase mt-0.5">Incorrect</span>
            </div>
            <div className="bg-[#141419] border border-[#2a2a34] rounded-xl p-3 text-center col-span-2 sm:col-span-1">
              <span className="text-lg font-black text-gray-200">{formatTime(attempt.totalTimeSeconds)}</span>
              <span className="block text-[10px] font-bold text-gray-400 uppercase mt-0.5">Duration</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-5">
          <div className="flex items-center space-x-2">
            <button
              onClick={onRetake}
              className="px-4 py-2 text-xs font-bold rounded-xl border border-[#2a2a34] text-gray-300 hover:text-white hover:bg-[#25252e] flex items-center space-x-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retake Simulation</span>
            </button>
            <button
              onClick={onNewExam}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-acca-red hover:bg-acca-red-hover text-white flex items-center space-x-1.5 transition-colors shadow-xs"
            >
              <span>New Simulation</span>
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
          className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-colors ${
            filter === 'all'
              ? 'bg-acca-red text-white'
              : 'bg-[#1e1e24] border border-[#2a2a34] text-gray-400 hover:text-white'
          }`}
        >
          All Questions ({evaluatedQuestions.length})
        </button>
        <button
          onClick={() => setFilter('correct')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-colors ${
            filter === 'correct'
              ? 'bg-emerald-600 text-white'
              : 'bg-[#1e1e24] border border-[#2a2a34] text-emerald-400 hover:text-white'
          }`}
        >
          Correct ({correctCount})
        </button>
        <button
          onClick={() => setFilter('incorrect')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-colors ${
            filter === 'incorrect'
              ? 'bg-rose-600 text-white'
              : 'bg-[#1e1e24] border border-[#2a2a34] text-rose-400 hover:text-white'
          }`}
        >
          Incorrect ({incorrectCount})
        </button>
        {writtenCount > 0 && (
          <button
            onClick={() => setFilter('written')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-colors ${
              filter === 'written'
                ? 'bg-blue-600 text-white'
                : 'bg-[#1e1e24] border border-[#2a2a34] text-blue-400 hover:text-white'
            }`}
          >
            Constructed Responses ({writtenCount})
          </button>
        )}
      </div>

      {/* Detailed Breakdown List */}
      <div className="space-y-4">
        {filteredItems.map(({ question, response, scoring }) => {
          const isObjective = scoring.isAutoMarked;
          const studentSelected = response?.selectedOptionIds || [];

          return (
            <div
              key={question.id}
              className={`bg-[#1e1e24] rounded-2xl border p-5 space-y-4 transition-all ${
                isObjective
                  ? scoring.isCorrect
                    ? 'border-emerald-500/30'
                    : 'border-rose-500/30'
                  : 'border-[#2a2a34]'
              }`}
            >
              {/* Question Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#2a2a34]">
                <div className="flex items-center space-x-2.5">
                  <span className="font-mono font-bold text-white text-sm">
                    {question.questionNumber}
                  </span>
                  <span className="text-xs font-semibold text-gray-400">
                    • {question.title}
                  </span>
                </div>

                <div className="flex items-center space-x-2 text-xs font-bold">
                  {isObjective ? (
                    scoring.isCorrect ? (
                      <span className="text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg flex items-center space-x-1 border border-emerald-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Awarded {scoring.marksAwarded}/{scoring.maxMarks} Marks</span>
                      </span>
                    ) : (
                      <span className="text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-lg flex items-center space-x-1 border border-rose-500/20">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>0 / {scoring.maxMarks} Marks</span>
                      </span>
                    )
                  ) : (
                    <span className="text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20">
                      Constructed Response ({scoring.maxMarks} Marks)
                    </span>
                  )}
                </div>
              </div>

              {/* Objective Options Evaluation */}
              {question.options && question.options.length > 0 && (
                <div className="space-y-2 pt-1">
                  <span className="block text-[11px] font-bold text-gray-400 uppercase">
                    Answer Evaluation:
                  </span>
                  <div className="space-y-1.5">
                    {question.options.map(opt => {
                      const isStudentChoice = studentSelected.includes(opt.label);
                      const isCorrectChoice = (question.correctOptionIds || []).includes(opt.label);

                      let style = 'bg-[#141419] border-[#2a2a34] text-gray-400';
                      let labelStyle = 'bg-[#1e1e24] text-gray-400 border border-[#2a2a34]';

                      if (isCorrectChoice) {
                        style = 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200 font-semibold';
                        labelStyle = 'bg-emerald-500 text-white';
                      } else if (isStudentChoice && !isCorrectChoice) {
                        style = 'bg-rose-500/10 border-rose-500/40 text-rose-200';
                        labelStyle = 'bg-acca-red text-white';
                      }

                      return (
                        <div
                          key={opt.id}
                          className={`p-2.5 rounded-xl border text-xs flex items-start space-x-2.5 ${style}`}
                        >
                          <div className={`w-5 h-5 rounded font-bold text-xs flex items-center justify-center shrink-0 ${labelStyle}`}>
                            {opt.label}
                          </div>
                          <div className="flex-1 leading-snug">
                            <span>{opt.text}</span>
                            {isCorrectChoice && (
                              <span className="ml-2 text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded">
                                Official Answer Key
                              </span>
                            )}
                            {isStudentChoice && !isCorrectChoice && (
                              <span className="ml-2 text-[10px] font-bold text-rose-400 bg-rose-500/20 px-1.5 py-0.5 rounded">
                                Your Answer
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Written Response Display */}
              {(!question.options || question.options.length === 0) && (
                <div className="space-y-2 pt-1">
                  <span className="block text-[11px] font-bold text-gray-400 uppercase">
                    Your Response:
                  </span>
                  <div className="bg-[#141419] p-3.5 rounded-xl border border-[#2a2a34] font-mono text-xs text-gray-200 whitespace-pre-wrap leading-relaxed">
                    {response?.writtenAnswer?.trim() || <em className="text-gray-500">No response entered.</em>}
                  </div>
                </div>
              )}

              {/* Model Answer & Rubric Revealed Here at Results Review Stage */}
              {(question.modelAnswer || question.rubric || question.markingGuide || scoring.explanation) && (
                <div className="p-4 bg-[#141419] border border-[#2a2a34] rounded-xl text-xs space-y-2">
                  <div className="flex items-center space-x-1.5 font-bold text-emerald-400">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Author Model Answer & Marking Scheme:</span>
                  </div>
                  {question.modelAnswer && (
                    <div className="text-gray-200 leading-relaxed whitespace-pre-wrap pt-1 font-sans">
                      {question.modelAnswer}
                    </div>
                  )}
                  {(question.rubric || question.markingGuide || scoring.explanation) && (
                    <div className="text-gray-400 text-[11px] leading-relaxed pt-2 border-t border-[#2a2a34]">
                      <strong>Marking Criteria:</strong> {question.rubric || question.markingGuide || scoring.explanation}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
