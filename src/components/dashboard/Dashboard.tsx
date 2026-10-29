import React, { useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  Edit3,
  ChevronRight,
  ArrowUpRight,
  AlertCircle,
  Check,
  CheckSquare,
  TrendingUp,
  Brain,
  FileCheck,
  Target
} from 'lucide-react';
import { CircularProgress } from '../common/CircularProgress';
import {
  StudentPaperRecord,
  StudentTarget,
  StudyPlanItem,
  ActivityLog,
  QualificationVersion,
  QuestionRecord,
  ExamAttemptRecord
} from '../../types';
import { calculateProgressSummary } from '../../config/accaStructure';
import { db, logActivity } from '../../db';
import { calculateDaysRemaining, formatCalendarDate } from '../../utils/dateUtils';

interface DashboardProps {
  version: QualificationVersion;
  paperRecords: Record<string, StudentPaperRecord>;
  target: StudentTarget | null;
  studyPlans: StudyPlanItem[];
  activityLogs: ActivityLog[];
  questions?: QuestionRecord[];
  examAttempts?: ExamAttemptRecord[];
  onNavigate: (tabId: string) => void;
  onSelectPaper: (paperId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  version,
  paperRecords,
  target,
  studyPlans,
  activityLogs,
  questions = [],
  examAttempts = [],
  onNavigate,
  onSelectPaper,
}) => {
  const summary = calculateProgressSummary(version, paperRecords);

  // Today's Study Plan state
  const [newPlanText, setNewPlanText] = useState('');
  const [newPlanPaperId, setNewPlanPaperId] = useState('FR');
  const [newPlanMinutes, setNewPlanMinutes] = useState(45);

  // Next Exam edit modal
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [targetPaperId, setTargetPaperId] = useState(target?.nextExamPaperId || 'FR');
  const [targetDate, setTargetDate] = useState(target?.nextExamDate || '');
  const [targetScore, setTargetScore] = useState(target?.targetScore || 70);
  const [weeklyHours, setWeeklyHours] = useState(target?.weeklyStudyHours || 15);

  const daysRemaining = calculateDaysRemaining(target?.nextExamDate);
  const nextExamPaper = version.papers.find(p => p.id === target?.nextExamPaperId);

  // Add study plan item
  const handleAddPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanText.trim()) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const newItem: StudyPlanItem = {
      id: 'plan-' + Date.now(),
      title: newPlanText.trim(),
      paperId: newPlanPaperId,
      estimatedMinutes: Number(newPlanMinutes) || 30,
      completed: false,
      dueDate: todayStr,
      createdAt: new Date().toISOString(),
    };

    await db.studyPlans.put(newItem);
    await logActivity(
      'Study Plan Created',
      `Scheduled: ${newItem.title} for ${newItem.paperId}`,
      'plan'
    );

    setNewPlanText('');
  };

  const handleTogglePlan = async (item: StudyPlanItem) => {
    const updated = { ...item, completed: !item.completed };
    await db.studyPlans.put(updated);
    await logActivity(
      updated.completed ? 'Study Plan Completed' : 'Study Plan Reopened',
      item.title,
      'plan'
    );
  };

  const handleDeletePlan = async (id: string) => {
    await db.studyPlans.delete(id);
  };

  const handleSaveTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated: StudentTarget = {
      id: target?.id || 'default',
      nextExamPaperId: targetPaperId,
      nextExamDate: targetDate.trim() || undefined,
      targetScore: Number(targetScore) || 70,
      weeklyStudyHours: Number(weeklyHours) || 15,
      notes: target?.notes || ''
    };
    await db.targets.put(updated);
    await logActivity(
      'Target Exam Updated',
      `Next exam configured: ${updated.nextExamPaperId} (${updated.nextExamDate || 'Not scheduled'})`,
      'paper'
    );
    setIsEditingTarget(false);
  };

  // Derive genuine performance analytics from exam attempts
  const syllabusAnalytics = React.useMemo(() => {
    if (examAttempts.length === 0) return null;

    const areaStats: Record<
      string,
      { totalMarksScored: number; totalMarksAvailable: number; attempts: number }
    > = {};

    examAttempts.forEach(att => {
      att.questionIds.forEach(qId => {
        const q = questions.find(item => item.id === qId);
        const area = q?.syllabusArea || q?.topicTags?.[0] || 'General';
        const resp = att.responses[qId];
        const maxMarks = q?.availableMarks || 2;
        const scored = resp?.marksAwarded ?? 0;

        if (!areaStats[area]) {
          areaStats[area] = { totalMarksScored: 0, totalMarksAvailable: 0, attempts: 0 };
        }
        areaStats[area].totalMarksScored += scored;
        areaStats[area].totalMarksAvailable += maxMarks;
        areaStats[area].attempts += 1;
      });
    });

    const areas = Object.entries(areaStats).map(([area, data]) => {
      const pct =
        data.totalMarksAvailable > 0
          ? Math.round((data.totalMarksScored / data.totalMarksAvailable) * 100)
          : 0;
      return {
        area,
        percentage: pct,
        attempts: data.attempts,
        isHigh: pct >= 70,
        isWeak: pct < 50,
        isLowConfidence: data.attempts < 3
      };
    });

    return {
      strongAreas: areas.filter(a => a.isHigh),
      weakAreas: areas.filter(a => a.isWeak),
      allAreas: areas
    };
  }, [examAttempts, questions]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Welcome Heading */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-acca-red bg-acca-red/10 px-2.5 py-1 rounded border border-acca-red/20 inline-block">
            ACCA Study Platform · by ly77ee
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white mt-1.5 tracking-tight">
            Study Manager & Dashboard
          </h1>
          <p className="text-xs text-gray-400 mt-1 max-w-2xl leading-relaxed">
            Track your ACCA qualification journey, manage your Obsidian Markdown study checklists, and practise structured exam simulations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('checklist')}
            className="px-3.5 py-2 bg-acca-red hover:bg-acca-red-hover text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
          >
            <CheckSquare className="w-4 h-4" />
            <span>Open Study Checklist</span>
          </button>
        </div>
      </div>

      {/* Main Central Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Qualification Progress & Prominent Checklist Entry (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Single Qualification Progress Ring Card */}
          <div className="bg-[#1e1e24] rounded-2xl border border-[#2a2a34] p-6 shadow-xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="shrink-0">
                <CircularProgress
                  percentage={summary.overallPercentage}
                  size={120}
                  strokeWidth={10}
                  color="#C00000"
                  trackColor="#141419"
                  subLabel="Completed"
                />
              </div>

              <div className="space-y-2 text-center sm:text-left flex-1 min-w-0">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-acca-red bg-acca-red/10 px-2 py-0.5 rounded border border-acca-red/20">
                    Qualification Progress
                  </span>
                  <span className="text-xs text-gray-400">
                    {version.name}
                  </span>
                </div>

                <div className="text-3xl font-black text-white tracking-tight">
                  {summary.passedCount}{' '}
                  <span className="text-xl text-gray-500 font-semibold">
                    / {summary.totalRequired}
                  </span>{' '}
                  <span className="text-sm font-medium text-gray-400 block sm:inline">
                    Exams Passed
                  </span>
                </div>

                <p className="text-xs text-gray-400 leading-relaxed">
                  {summary.passedCount === 0
                    ? 'No completed papers recorded yet. Configure your exam passes or exemptions in My ACCA.'
                    : `You have completed ${summary.passedCount} out of ${summary.totalRequired} papers (${summary.overallPercentage}%).`}
                </p>

                <div className="pt-2">
                  <button
                    onClick={() => onNavigate('my-acca')}
                    className="text-xs font-semibold text-acca-red hover:underline flex items-center justify-center sm:justify-start gap-1"
                  >
                    <span>View papers and qualification stages in My ACCA</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Stages Breakdown Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-5 mt-5 border-t border-[#2a2a34] text-center text-xs">
              <div className="bg-[#141419] p-2.5 rounded-xl border border-[#2a2a34]/60">
                <span className="text-lg font-bold text-emerald-400 block">{summary.passedCount}</span>
                <span className="text-[10px] font-semibold text-gray-400 uppercase">Passed</span>
              </div>
              <div className="bg-[#141419] p-2.5 rounded-xl border border-[#2a2a34]/60">
                <span className="text-lg font-bold text-amber-400 block">{summary.inProgressCount}</span>
                <span className="text-[10px] font-semibold text-gray-400 uppercase">In Progress</span>
              </div>
              <div className="bg-[#141419] p-2.5 rounded-xl border border-[#2a2a34]/60">
                <span className="text-lg font-bold text-blue-400 block">{summary.exemptCount}</span>
                <span className="text-[10px] font-semibold text-gray-400 uppercase">Exempt</span>
              </div>
              <div className="bg-[#141419] p-2.5 rounded-xl border border-[#2a2a34]/60">
                <span className="text-lg font-bold text-gray-400 block">{summary.notStartedCount}</span>
                <span className="text-[10px] font-semibold text-gray-500 uppercase">Remaining</span>
              </div>
            </div>
          </div>

          {/* Prominent Study Checklist Entry Point Card */}
          <div className="bg-[#1e1e24] rounded-2xl border border-[#2a2a34] p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#2a2a34]">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-acca-red" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Markdown Study Checklist
                </h2>
              </div>
              <span className="text-[11px] text-gray-400">Obsidian Compatible</span>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              Paste and track your syllabus checklist using standard Markdown checkboxes (<code className="text-acca-red bg-[#141419] px-1 rounded">- [ ]</code> and <code className="text-emerald-400 bg-[#141419] px-1 rounded">- [x]</code>). Preserves syllabus hierarchy, item ordering, and progress offline.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                onClick={() => onNavigate('checklist')}
                className="px-4 py-2 bg-acca-red hover:bg-acca-red-hover text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Paste or View Checklist</span>
              </button>

              <button
                onClick={() => onNavigate('questions')}
                className="px-4 py-2 bg-[#141419] hover:bg-[#25252e] text-gray-300 hover:text-white border border-[#2a2a34] rounded-xl text-xs font-semibold transition-colors"
              >
                Question Bank ({questions.length} Questions)
              </button>
            </div>
          </div>

          {/* Strengths & Weaknesses by Syllabus Area */}
          <div className="bg-[#1e1e24] rounded-2xl border border-[#2a2a34] p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#2a2a34]">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Syllabus Strengths & Weaknesses
                </h2>
              </div>
              <span className="text-[11px] text-gray-400">Evidence-Based</span>
            </div>

            {syllabusAnalytics && syllabusAnalytics.allAreas.length > 0 ? (
              <div className="space-y-4">
                {/* Weak Areas Needing Revision */}
                {syllabusAnalytics.weakAreas.length > 0 && (
                  <div>
                    <span className="text-xs font-bold text-rose-400 uppercase tracking-wider block mb-2">
                      Priority Revision Areas (&lt; 50% Success Rate)
                    </span>
                    <div className="space-y-2">
                      {syllabusAnalytics.weakAreas.map(item => (
                        <div
                          key={item.area}
                          className="bg-[#141419] p-3 rounded-xl border border-rose-500/30 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-bold text-white block">{item.area}</span>
                            <span className="text-[10px] text-gray-400">
                              {item.attempts} question attempts
                              {item.isLowConfidence && ' • (Low sample size)'}
                            </span>
                          </div>
                          <span className="text-rose-400 font-bold text-sm">
                            {item.percentage}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Strong Areas */}
                {syllabusAnalytics.strongAreas.length > 0 && (
                  <div>
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block mb-2">
                      Mastered Syllabus Areas (≥ 70% Success Rate)
                    </span>
                    <div className="space-y-2">
                      {syllabusAnalytics.strongAreas.map(item => (
                        <div
                          key={item.area}
                          className="bg-[#141419] p-3 rounded-xl border border-emerald-500/30 flex items-center justify-between text-xs"
                        >
                          <span className="font-bold text-white">{item.area}</span>
                          <span className="text-emerald-400 font-bold text-sm">
                            {item.percentage}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-gray-500 bg-[#141419] rounded-xl border border-[#2a2a34]">
                No exam attempts recorded yet. Launch an Exam Simulator session to generate your syllabus performance breakdown.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Next Exam, Study Plan, Recent Activity (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Next Exam Widget */}
          <div className="bg-[#1e1e24] rounded-2xl border border-[#2a2a34] p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-[#2a2a34]">
              <span className="font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-acca-red" />
                <span>Next Scheduled Exam</span>
              </span>
              <button
                onClick={() => setIsEditingTarget(true)}
                className="text-xs font-semibold text-acca-red hover:underline flex items-center gap-1"
              >
                <Edit3 className="w-3 h-3" />
                <span>{target?.nextExamDate ? 'Edit Date' : 'Set Date'}</span>
              </button>
            </div>

            {target?.nextExamDate ? (
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-2xl font-black text-white tracking-tight">
                      {target.nextExamPaperId}
                    </span>
                    <h3 className="text-xs font-semibold text-gray-300">
                      {nextExamPaper?.name || 'Selected Paper'}
                    </h3>
                  </div>
                  {daysRemaining !== null && (
                    <div className="text-right">
                      <span
                        className={`text-2xl font-black ${
                          daysRemaining <= 14 ? 'text-acca-red' : 'text-emerald-400'
                        }`}
                      >
                        {daysRemaining > 0 ? daysRemaining : 0}
                      </span>
                      <span className="block text-[10px] font-semibold text-gray-400 uppercase">
                        Days Left
                      </span>
                    </div>
                  )}
                </div>

                <div className="text-xs text-gray-400 flex items-center justify-between pt-1 border-t border-[#2a2a34]">
                  <span>Exam Session Date:</span>
                  <span className="font-semibold text-white">
                    {formatCalendarDate(target.nextExamDate)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-4 text-center space-y-2">
                <p className="text-xs text-gray-500">
                  No upcoming exam session configured.
                </p>
                <button
                  onClick={() => setIsEditingTarget(true)}
                  className="px-3 py-1.5 bg-[#141419] hover:bg-[#25252e] border border-[#2a2a34] text-xs font-semibold text-white rounded-lg transition-colors"
                >
                  Configure Next Exam Date
                </button>
              </div>
            )}
          </div>

          {/* Today's Study Plan Widget */}
          <div className="bg-[#1e1e24] rounded-2xl border border-[#2a2a34] p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-[#2a2a34]">
              <span className="font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-acca-red" />
                <span>Today's Study Plan</span>
              </span>
              <button
                onClick={() => onNavigate('exam-planner')}
                className="text-xs font-semibold text-gray-400 hover:text-white flex items-center gap-1"
              >
                <span>Planner</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {studyPlans.filter(p => !p.completed).length === 0 && (
                <p className="text-xs text-gray-500 py-3 text-center">
                  All tasks completed for today. Schedule your next topic below.
                </p>
              )}

              {studyPlans.map(item => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-colors ${
                    item.completed
                      ? 'bg-[#141419]/40 border-[#22222b] text-gray-600'
                      : 'bg-[#141419] border-[#2a2a34] text-gray-300'
                  }`}
                >
                  <div
                    onClick={() => handleTogglePlan(item)}
                    className="flex items-center space-x-2.5 flex-1 min-w-0 cursor-pointer"
                  >
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center shrink-0 transition-colors ${
                        item.completed ? 'bg-acca-red text-white' : 'border border-gray-600'
                      }`}
                    >
                      {item.completed && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span
                      className={`text-xs truncate ${
                        item.completed ? 'line-through text-gray-600' : 'text-gray-200'
                      }`}
                    >
                      {item.title}
                    </span>
                  </div>

                  <button
                    onClick={() => handleDeletePlan(item.id)}
                    className="text-gray-600 hover:text-rose-400 p-1"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {/* Quick Add Plan input */}
            <form onSubmit={handleAddPlan} className="pt-2 border-t border-[#2a2a34] flex gap-2">
              <input
                type="text"
                placeholder="Add daily study goal..."
                value={newPlanText}
                onChange={e => setNewPlanText(e.target.value)}
                className="flex-1 bg-[#141419] border border-[#2a2a34] rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-acca-red"
              />
              <button
                type="submit"
                disabled={!newPlanText.trim()}
                className="px-3 py-1.5 bg-acca-red hover:bg-acca-red-hover disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
              >
                Add
              </button>
            </form>
          </div>

          {/* Recent Activity Log */}
          <div className="bg-[#1e1e24] rounded-2xl border border-[#2a2a34] p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-[#2a2a34]">
              <span className="font-bold uppercase tracking-wider text-gray-300">
                Recent Activity
              </span>
            </div>

            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
              {activityLogs && activityLogs.length > 0 ? (
                activityLogs.slice(0, 5).map(log => (
                  <div
                    key={log.id}
                    className="text-xs p-2.5 rounded-xl bg-[#141419] border border-[#2a2a34] flex items-start justify-between gap-2"
                  >
                    <div>
                      <span className="font-bold text-gray-200 block">{log.title}</span>
                      <span className="text-[11px] text-gray-400 line-clamp-1">{log.description}</span>
                    </div>
                    <span className="text-[10px] text-gray-500 whitespace-nowrap mt-0.5">
                      {new Date(log.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-500 py-3 text-center">
                  No activity recorded yet.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Next Exam Modal */}
      {isEditingTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[#1e1e24] border border-[#2a2a34] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Configure Next Exam Session</h3>
            <form onSubmit={handleSaveTarget} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-300 font-bold mb-1">
                  Target ACCA Paper
                </label>
                <select
                  value={targetPaperId}
                  onChange={e => setTargetPaperId(e.target.value)}
                  className="w-full bg-[#141419] border border-[#2a2a34] rounded-xl px-3 py-2 text-white outline-none focus:border-acca-red font-bold"
                >
                  {version.papers.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.id} — {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-300 font-bold mb-1">
                  Exam Date (YYYY-MM-DD)
                </label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={e => setTargetDate(e.target.value)}
                  className="w-full bg-[#141419] border border-[#2a2a34] rounded-xl px-3 py-2 text-white outline-none focus:border-acca-red font-mono"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#2a2a34]">
                <button
                  type="button"
                  onClick={() => setIsEditingTarget(false)}
                  className="px-4 py-2 bg-[#141419] hover:bg-[#25252e] text-gray-300 rounded-xl font-semibold border border-[#2a2a34]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-acca-red hover:bg-acca-red-hover text-white rounded-xl font-bold"
                >
                  Save Date
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
