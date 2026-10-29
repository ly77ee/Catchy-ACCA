import React, { useState, useMemo } from 'react';
import {
  QualificationVersion,
  QuestionRecord,
  StudentPaperRecord,
  ExamAttemptRecord,
  RevisionTopicStat,
} from '../../types';
import { ACCA_SYLLABUS_TOPICS } from '../../config/syllabusTopics';
import { db, logActivity } from '../../db';
import {
  Brain,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Target,
  Play,
  FileEdit,
  Sparkles,
  BookOpen,
  Filter,
  BarChart3,
  Calendar,
  Check,
  RotateCcw,
} from 'lucide-react';

interface RevisionAnalyticsProps {
  version: QualificationVersion;
  allQuestions: QuestionRecord[];
  paperRecords: StudentPaperRecord[];
  examAttempts: ExamAttemptRecord[];
  onLaunchPracticeExam?: (paperId: string, questionIds: string[]) => void;
  onOpenQuestionInWriter?: (questionId: string) => void;
  onRefreshData?: () => void;
}

export const RevisionAnalytics: React.FC<RevisionAnalyticsProps> = ({
  version,
  allQuestions,
  paperRecords,
  examAttempts,
  onLaunchPracticeExam,
  onOpenQuestionInWriter,
  onRefreshData,
}) => {
  const [selectedPaperId, setSelectedPaperId] = useState<string>('FR');
  const [activeTab, setActiveTab] = useState<'mistakes' | 'topics' | 'planner'>('mistakes');
  const [statusFilter, setStatusFilter] = useState<'all' | 'doubtful' | 'failed'>('all');

  // Compute Weak-Topic Analysis for the selected paper
  const topicStats: RevisionTopicStat[] = useMemo(() => {
    const paperTopicDefs = ACCA_SYLLABUS_TOPICS.filter((t) => t.paperId === selectedPaperId);
    const paperTopics: string[] = paperTopicDefs.length > 0
      ? paperTopicDefs.map((t) => t.topicName)
      : [
          'Core Principles & Framework',
          'Standards Application & Accounting Treatments',
          'Calculations & Practical Workings',
          'Reporting, Disclosures & Professional Case Study',
        ];

    const paperQuestions = allQuestions.filter((q) => q.paperId === selectedPaperId);
    const paperAttempts = examAttempts.filter((a) => a.paperId === selectedPaperId);

    return paperTopics.map((topicName: string) => {
      // Questions matching this topic
      const matchingQuestions = paperQuestions.filter((q) =>
        (q.topicTags || []).some((t: string) =>
          t.toLowerCase().includes(topicName.toLowerCase()) || topicName.toLowerCase().includes(t.toLowerCase())
        )
      );

      const matchingQuestionIds = new Set(matchingQuestions.map((q) => q.id));

      // Doubts count
      const doubtsCount = matchingQuestions.filter((q) => q.isDoubt).length;

      // Calculate score across completed attempts that included these questions
      let totalMarksAwarded = 0;
      let totalMarksAvailable = 0;
      let attemptCount = 0;

      paperAttempts.forEach((att) => {
        let hasTopicQuestion = false;
        att.questionIds.forEach((qId) => {
          if (matchingQuestionIds.has(qId)) {
            hasTopicQuestion = true;
            const resp = att.responses[qId];
            if (resp && resp.marksAwarded !== undefined) {
              const qObj = paperQuestions.find((q) => q.id === qId);
              const maxMarks = qObj?.availableMarks || 2;
              totalMarksAwarded += resp.marksAwarded;
              totalMarksAvailable += maxMarks;
            }
          }
        });
        if (hasTopicQuestion) attemptCount++;
      });

      let averageScorePercent = 0;
      if (totalMarksAvailable > 0) {
        averageScorePercent = Math.round((totalMarksAwarded / totalMarksAvailable) * 100);
      } else if (matchingQuestions.length > 0 && doubtsCount === 0) {
        averageScorePercent = 70; // baseline if no exams taken yet but questions exist
      }

      let status: 'mastered' | 'solid' | 'needs_revision' = 'solid';
      if (doubtsCount > 0 || (attemptCount > 0 && averageScorePercent < 50)) {
        status = 'needs_revision';
      } else if (attemptCount > 0 && averageScorePercent >= 75 && doubtsCount === 0) {
        status = 'mastered';
      } else if (attemptCount === 0 && doubtsCount === 0) {
        status = 'solid';
      }

      return {
        topicName,
        paperId: selectedPaperId,
        totalAttempts: attemptCount,
        averageScorePercent,
        doubtsCount,
        status,
      };
    });
  }, [selectedPaperId, allQuestions, examAttempts]);

  // Compute Mistake & Doubt Journal
  const mistakeJournalQuestions = useMemo(() => {
    return allQuestions.filter((q) => {
      if (q.paperId !== selectedPaperId) return false;

      // Check if marked doubtful
      const isDoubtful = Boolean(q.isDoubt);

      // Check if scored < 50% in any past attempt
      let failedInExam = false;
      examAttempts.forEach((att) => {
        if (att.paperId === q.paperId && att.questionIds.includes(q.id)) {
          const resp = att.responses[q.id];
          if (resp && resp.marksAwarded !== undefined) {
            const maxMarks = q.availableMarks || 2;
            if (resp.marksAwarded / maxMarks < 0.5) {
              failedInExam = true;
            }
          }
        }
      });

      if (statusFilter === 'doubtful') return isDoubtful;
      if (statusFilter === 'failed') return failedInExam;
      return isDoubtful || failedInExam;
    });
  }, [selectedPaperId, allQuestions, examAttempts, statusFilter]);

  // Toggle question doubt status
  const handleToggleDoubt = async (q: QuestionRecord) => {
    const updated: QuestionRecord = {
      ...q,
      isDoubt: !q.isDoubt,
    };
    await db.questions.put(updated);
    await logActivity(
      q.isDoubt ? 'Resolved Doubt' : 'Flagged Doubt',
      `${q.questionNumber}: ${q.title}`,
      'question'
    );
    if (onRefreshData) onRefreshData();
  };

  // Launch revision practice exam for weak topics
  const handleLaunchWeakTopicExam = () => {
    const weakTopics = topicStats
      .filter((t) => t.status === 'needs_revision')
      .map((t) => t.topicName.toLowerCase());

    const eligible = allQuestions.filter((q) => {
      if (q.paperId !== selectedPaperId) return false;
      if (q.isDoubt) return true;
      return (q.topicTags || []).some((t: string) =>
        weakTopics.some((wt) => wt.includes(t.toLowerCase()) || t.toLowerCase().includes(wt))
      );
    });

    const targetIds = (eligible.length > 0 ? eligible : allQuestions.filter((q) => q.paperId === selectedPaperId))
      .slice(0, 10)
      .map((q) => q.id);

    if (onLaunchPracticeExam && targetIds.length > 0) {
      onLaunchPracticeExam(selectedPaperId, targetIds);
    }
  };

  // Student Next-Exam Pacing Target
  const targetPaperRecord = paperRecords.find((p) => p.paperId === selectedPaperId);
  const plannedSession = targetPaperRecord?.examSession || 'Dec 2026';
  const weakCount = topicStats.filter((t) => t.status === 'needs_revision').length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-charcoal-900 rounded-2xl border border-charcoal-200 dark:border-charcoal-700/80 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-acca-50 dark:bg-acca-950/40 text-acca-600 dark:text-acca-400 flex items-center justify-center border border-acca-200 dark:border-acca-900">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-charcoal-900 dark:text-charcoal-100">
                  Progress
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-charcoal-100 dark:bg-charcoal-800 text-charcoal-700 dark:text-charcoal-300">
                  Catchy ACCA · by ly77ee
                </span>
              </div>
              <p className="text-xs text-charcoal-500 dark:text-charcoal-400">
                Identify knowledge gaps, track doubtful questions, and target weak syllabus topics
              </p>
            </div>
          </div>
        </div>

        {/* Paper Selector & Quick Action */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedPaperId}
            onChange={(e) => setSelectedPaperId(e.target.value)}
            className="text-xs font-bold bg-white dark:bg-charcoal-800 border border-charcoal-200 dark:border-charcoal-700 rounded-xl px-3 py-2 text-charcoal-900 dark:text-charcoal-100 outline-none focus:border-acca-600"
          >
            {version.papers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.id} — {p.name}
              </option>
            ))}
          </select>

          <button
            onClick={handleLaunchWeakTopicExam}
            className="text-xs font-bold bg-acca-600 hover:bg-acca-700 text-white px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Practice Weak Topics ({weakCount})
          </button>
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="flex border-b border-charcoal-200 dark:border-charcoal-700 gap-4 text-xs font-semibold select-none">
        <button
          onClick={() => setActiveTab('mistakes')}
          className={`pb-3 px-1 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'mistakes'
              ? 'border-acca-600 text-acca-600 dark:text-acca-400'
              : 'border-transparent text-charcoal-500 hover:text-charcoal-900 dark:hover:text-charcoal-200'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Mistake & Doubt Journal ({mistakeJournalQuestions.length})
        </button>
        <button
          onClick={() => setActiveTab('topics')}
          className={`pb-3 px-1 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'topics'
              ? 'border-acca-600 text-acca-600 dark:text-acca-400'
              : 'border-transparent text-charcoal-500 hover:text-charcoal-900 dark:hover:text-charcoal-200'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Topic Mastery Matrix
        </button>
        <button
          onClick={() => setActiveTab('planner')}
          className={`pb-3 px-1 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'planner'
              ? 'border-acca-600 text-acca-600 dark:text-acca-400'
              : 'border-transparent text-charcoal-500 hover:text-charcoal-900 dark:hover:text-charcoal-200'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Exam Target & Recommendations
        </button>
      </div>

      {/* Tab 1: Mistake & Doubt Journal */}
      {activeTab === 'mistakes' && (
        <div className="space-y-4">
          {/* Sub-filter pills */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-charcoal-400" />
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === 'all'
                    ? 'bg-charcoal-900 text-white dark:bg-charcoal-100 dark:text-charcoal-900'
                    : 'bg-charcoal-100 dark:bg-charcoal-800 text-charcoal-600 hover:bg-charcoal-200'
                }`}
              >
                All Issues
              </button>
              <button
                onClick={() => setStatusFilter('doubtful')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === 'doubtful'
                    ? 'bg-amber-600 text-white'
                    : 'bg-charcoal-100 dark:bg-charcoal-800 text-charcoal-600 hover:bg-charcoal-200'
                }`}
              >
                Flagged Doubts
              </button>
              <button
                onClick={() => setStatusFilter('failed')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === 'failed'
                    ? 'bg-red-600 text-white'
                    : 'bg-charcoal-100 dark:bg-charcoal-800 text-charcoal-600 hover:bg-charcoal-200'
                }`}
              >
                Low Exam Scores (&lt;50%)
              </button>
            </div>
            <span className="text-charcoal-400 text-[11px]">
              Showing {mistakeJournalQuestions.length} flagged item(s) for {selectedPaperId}
            </span>
          </div>

          {mistakeJournalQuestions.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-charcoal-900 rounded-2xl border border-charcoal-200 dark:border-charcoal-700/80 p-6 space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <h3 className="font-bold text-charcoal-800 dark:text-charcoal-200 text-sm">
                No Active Doubts or Failed Attempts!
              </h3>
              <p className="text-xs text-charcoal-500 max-w-md mx-auto">
                You have resolved all flagged doubts for {selectedPaperId}. Keep up the great work or run a mock CBE exam to test yourself under timed conditions.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {mistakeJournalQuestions.map((q) => (
                <div
                  key={q.id}
                  className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-700/80 rounded-xl p-4 shadow-2xs hover:border-acca-500/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-charcoal-900 dark:text-charcoal-100">
                        {q.questionNumber}: {q.title}
                      </span>
                      {q.isDoubt && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-300 text-[10px] font-bold">
                          Flagged Doubt
                        </span>
                      )}
                      <span className="text-[10px] font-semibold text-charcoal-400">
                        {q.availableMarks || 2} Marks
                      </span>
                    </div>

                    <p className="text-xs text-charcoal-600 dark:text-charcoal-400 line-clamp-2">
                      {q.notes || q.title}
                    </p>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {(q.topicTags || []).map((t: string, idx: number) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded bg-charcoal-100 dark:bg-charcoal-800 text-charcoal-600 dark:text-charcoal-400 text-[10px]"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleToggleDoubt(q)}
                      className="px-3 py-1.5 rounded-lg border border-charcoal-200 dark:border-charcoal-700 text-xs font-semibold text-charcoal-700 dark:text-charcoal-300 hover:bg-charcoal-50 dark:hover:bg-charcoal-800 transition-colors flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{q.isDoubt ? 'Mark Resolved' : 'Mark Doubt'}</span>
                    </button>

                    {onOpenQuestionInWriter && (
                      <button
                        onClick={() => onOpenQuestionInWriter(q.id)}
                        className="px-3 py-1.5 rounded-lg bg-charcoal-900 hover:bg-black dark:bg-charcoal-100 dark:hover:bg-white text-white dark:text-charcoal-900 text-xs font-semibold transition-colors flex items-center gap-1.5"
                      >
                        <FileEdit className="w-3.5 h-3.5" />
                        <span>Draft Answer</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Topic Mastery Matrix */}
      {activeTab === 'topics' && (
        <div className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-700 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-sm text-charcoal-900 dark:text-charcoal-100">
                Syllabus Topic Performance for {selectedPaperId}
              </h2>
              <p className="text-xs text-charcoal-500 mt-0.5">
                Aggregated from your CBE exam attempts and active doubtful flags
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Mastered (≥75%)
              </span>
              <span className="flex items-center gap-1.5 text-blue-600 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Solid (50-74%)
              </span>
              <span className="flex items-center gap-1.5 text-amber-600 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Needs Revision (&lt;50% or doubts)
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {topicStats.map((topic, idx) => (
              <div
                key={idx}
                className="p-4 bg-charcoal-50 dark:bg-charcoal-800/50 rounded-xl border border-charcoal-200 dark:border-charcoal-700 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="font-bold text-xs text-charcoal-900 dark:text-charcoal-100">
                      {topic.topicName}
                    </span>
                    <div className="text-[11px] text-charcoal-500">
                      {topic.totalAttempts} exam attempt(s) · {topic.doubtsCount} active doubt(s)
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                        topic.status === 'mastered'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : topic.status === 'solid'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}
                    >
                      {topic.status === 'mastered'
                        ? 'Mastered'
                        : topic.status === 'solid'
                        ? 'Solid'
                        : 'Needs Revision'}
                    </span>
                    <span className="text-xs font-mono font-bold text-charcoal-700 dark:text-charcoal-300 w-12 text-right">
                      {topic.averageScorePercent}%
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-charcoal-200 dark:bg-charcoal-700 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      topic.status === 'mastered'
                        ? 'bg-emerald-500'
                        : topic.status === 'solid'
                        ? 'bg-blue-500'
                        : 'bg-amber-500'
                    }`}
                    style={{ width: `${Math.max(5, topic.averageScorePercent)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Exam Target & Recommendations */}
      {activeTab === 'planner' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-700 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-acca-50 dark:bg-acca-950/40 text-acca-600 flex items-center justify-center">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-charcoal-900 dark:text-charcoal-100">
                  Target Exam Pacing
                </h3>
                <p className="text-xs text-charcoal-500">
                  Syllabus completion target for {selectedPaperId}
                </p>
              </div>
            </div>

            <div className="p-4 bg-charcoal-50 dark:bg-charcoal-800 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between text-charcoal-600 dark:text-charcoal-400">
                <span>Planned Exam Session:</span>
                <span className="font-bold text-charcoal-900 dark:text-charcoal-100">
                  {plannedSession}
                </span>
              </div>
              <div className="flex justify-between text-charcoal-600 dark:text-charcoal-400">
                <span>Total Questions in Bank:</span>
                <span className="font-bold text-charcoal-900 dark:text-charcoal-100">
                  {allQuestions.filter((q) => q.paperId === selectedPaperId).length}
                </span>
              </div>
              <div className="flex justify-between text-charcoal-600 dark:text-charcoal-400">
                <span>Completed Exam Mocks:</span>
                <span className="font-bold text-charcoal-900 dark:text-charcoal-100">
                  {examAttempts.filter((a) => a.paperId === selectedPaperId).length}
                </span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <p className="font-bold text-charcoal-800 dark:text-charcoal-200">
                Recommended Weekly Schedule:
              </p>
              <ul className="space-y-1.5 text-charcoal-600 dark:text-charcoal-400">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Aim for 4–6 practice questions per week in your weakest topics.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Complete at least 1 full timed CBE practice exam every 2 weeks.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Draft at least one 20-mark essay answer per week in Answer Writer.</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="bg-white dark:bg-charcoal-900 border border-charcoal-200 dark:border-charcoal-700 rounded-2xl p-6 shadow-xs space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-charcoal-900 dark:text-charcoal-100">
                    High-Priority Knowledge Areas
                  </h3>
                  <p className="text-xs text-charcoal-500">
                    Topics requiring immediate review before the exam
                  </p>
                </div>
              </div>

              {weakCount === 0 ? (
                <p className="text-xs text-charcoal-500 italic py-4">
                  No critical weak topics flagged right now. Keep reinforcing your strong subjects!
                </p>
              ) : (
                <div className="space-y-2">
                  {topicStats
                    .filter((t) => t.status === 'needs_revision')
                    .map((t, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl text-xs flex items-center justify-between"
                      >
                        <span className="font-semibold text-amber-900 dark:text-amber-200">
                          {t.topicName}
                        </span>
                        <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                          {t.doubtsCount} doubt(s)
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <button
              onClick={handleLaunchWeakTopicExam}
              className="w-full py-2.5 bg-neutral-900 hover:bg-black dark:bg-neutral-100 dark:hover:bg-white text-white dark:text-neutral-900 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-acca-500" />
              <span>Launch Targeted Revision Exam</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
