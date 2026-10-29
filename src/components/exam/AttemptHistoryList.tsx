import React from 'react';
import { ExamAttemptRecord, QuestionRecord } from '../../types';
import { CircularProgress } from '../common/CircularProgress';
import { EmptyState } from '../common/EmptyState';
import { Clock, Calendar, ArrowRight, Trash2, Award } from 'lucide-react';
import { db, logActivity } from '../../db';

interface AttemptHistoryListProps {
  attempts: ExamAttemptRecord[];
  allQuestions: QuestionRecord[];
  onSelectAttempt: (attempt: ExamAttemptRecord) => void;
  onNewExam: () => void;
}

export const AttemptHistoryList: React.FC<AttemptHistoryListProps> = ({
  attempts,
  allQuestions,
  onSelectAttempt,
  onNewExam,
}) => {
  const handleDeleteAttempt = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this exam attempt record?')) {
      await db.examAttempts.delete(id);
      await logActivity('Exam Attempt Deleted', `Removed exam attempt ${id}.`, 'exam');
    }
  };

  const formatTime = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m ${s}s`;
  };

  if (attempts.length === 0) {
    return (
      <EmptyState
        icon={Award}
        title="No exam simulation attempts yet"
        description="Take your first timed CBE practice exam. Your score, timing breakdown, and question responses will be safely recorded here."
        actionText="Configure Exam Simulation"
        onAction={onNewExam}
      />
    );
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between pb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
          Saved Exam Attempts ({attempts.length})
        </span>
        <button
          onClick={onNewExam}
          className="text-xs font-bold text-acca-red hover:underline"
        >
          + New Exam Simulation
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {attempts.map((att) => {
          const isPassed = att.scorePercentage >= 50;

          return (
            <div
              key={att.id}
              onClick={() => onSelectAttempt(att)}
              className="bg-white rounded-2xl border border-gray-200/80 hover:border-gray-300 p-5 shadow-xs transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
            >
              <div className="flex items-center space-x-4">
                <CircularProgress
                  percentage={att.scorePercentage}
                  size={52}
                  strokeWidth={5}
                  color={isPassed ? '#16A34A' : '#C00000'}
                />
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-black text-gray-900 text-base group-hover:text-acca-red transition-colors">
                      {att.paperId} Simulation
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isPassed ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-acca-red'
                    }`}>
                      {isPassed ? 'PASS' : 'REVISION NEEDED'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-1">
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{new Date(att.completedAt || att.startedAt).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{formatTime(att.totalTimeSeconds)}</span>
                    </span>
                    <span>•</span>
                    <span>{att.questionIds.length} Questions</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end space-x-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                <div className="text-right">
                  <span className="font-extrabold text-sm text-gray-900">
                    {att.totalMarksScored} / {att.totalMarksAvailable} Marks
                  </span>
                  <span className="block text-xs font-semibold text-gray-400">
                    {att.scorePercentage}% Score
                  </span>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={(e) => handleDeleteAttempt(att.id, e)}
                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete attempt"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="p-2 text-gray-400 group-hover:text-acca-red transition-colors">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
