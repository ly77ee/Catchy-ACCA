import React, { useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  Edit3,
  Award,
  ChevronRight,
  BookOpen,
  ArrowUpRight
} from 'lucide-react';
import { CircularProgress } from '../common/CircularProgress';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import {
  StudentPaperRecord,
  StudentTarget,
  StudyPlanItem,
  ActivityLog,
  QualificationVersion
} from '../../types';
import { calculateProgressSummary } from '../../config/accaStructure';
import { db, logActivity } from '../../db';

interface DashboardProps {
  version: QualificationVersion;
  paperRecords: Record<string, StudentPaperRecord>;
  target: StudentTarget | null;
  studyPlans: StudyPlanItem[];
  activityLogs: ActivityLog[];
  onNavigate: (tabId: string) => void;
  onSelectPaper: (paperId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  version,
  paperRecords,
  target,
  studyPlans,
  activityLogs,
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

  // Quick paper status update modal
  const [editingPaperId, setEditingPaperId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<StudentPaperRecord['status']>('in_progress');
  const [editScore, setEditScore] = useState<number | undefined>(undefined);
  const [editSession, setEditSession] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Calculate days remaining to next exam
  const calculateDaysRemaining = (examDateStr?: string) => {
    if (!examDateStr) return null;
    const examDate = new Date(examDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = examDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const daysRemaining = calculateDaysRemaining(target?.nextExamDate);

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
      createdAt: new Date().toISOString()
    };

    await db.studyPlans.put(newItem);
    await logActivity('Task Added', `Added to study plan: ${newItem.title}`, 'plan');
    setNewPlanText('');
  };

  // Toggle study plan item
  const handleTogglePlan = async (item: StudyPlanItem) => {
    const updated = { ...item, completed: !item.completed };
    await db.studyPlans.put(updated);
    if (updated.completed) {
      await logActivity('Task Completed', `Completed study task: ${item.title}`, 'plan');
    }
  };

  // Delete study plan item
  const handleDeletePlan = async (id: string) => {
    await db.studyPlans.delete(id);
  };

  // Save student target
  const handleSaveTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    const updatedTarget: StudentTarget = {
      id: 'default',
      nextExamPaperId: targetPaperId,
      nextExamDate: targetDate,
      targetScore: Number(targetScore),
      weeklyStudyHours: Number(weeklyHours)
    };
    await db.targets.put(updatedTarget);
    await logActivity('Target Updated', `Next exam updated to ${targetPaperId} on ${targetDate}`, 'paper');
    setIsEditingTarget(false);
  };

  // Open paper edit modal
  const handleOpenPaperModal = (paperId: string) => {
    const existing = paperRecords[paperId];
    setEditingPaperId(paperId);
    setEditStatus(existing ? existing.status : 'not_started');
    setEditScore(existing?.score);
    setEditSession(existing?.examSession || '');
    setEditNotes(existing?.notes || '');
  };

  // Save paper update
  const handleSavePaper = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPaperId) return;

    const record: StudentPaperRecord = {
      paperId: editingPaperId,
      status: editStatus,
      score: editScore,
      examSession: editSession,
      notes: editNotes,
      updatedAt: new Date().toISOString()
    };

    await db.paperRecords.put(record);
    await logActivity(
      'Paper Progress Updated',
      `Updated ${editingPaperId} status to ${editStatus.replace('_', ' ').toUpperCase()}`,
      'paper'
    );
    setEditingPaperId(null);
  };

  const nextExamPaper = version.papers.find(p => p.id === target?.nextExamPaperId);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Top Banner / Hero */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-6 md:p-8 shadow-xs">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
          {/* Circular Progress & Overall Stat */}
          <div className="flex items-center space-x-6">
            <CircularProgress
              percentage={summary.overallPercentage}
              size={120}
              strokeWidth={10}
              color="#C00000"
              subLabel="Overall"
            />
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider text-acca-red bg-red-50 px-2.5 py-0.5 rounded-full">
                  Qualification Progress
                </span>
                <span className="text-xs text-gray-400">
                  {summary.totalCompletedOrExempt} of {summary.totalRequired} Exams Completed
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 mt-1 tracking-tight">
                {summary.overallPercentage === 100
                  ? 'All ACCA Exams Completed!'
                  : `${summary.overallPercentage}% Completed Towards ACCA Affiliate`}
              </h1>
              <p className="text-sm text-gray-600 mt-1.5 max-w-xl leading-relaxed">
                {version.name}. Track your papers, organize questions, and prepare systematically for your upcoming sessions.
              </p>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto">
            <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-3.5 text-center min-w-[100px]">
              <span className="text-2xl font-bold text-emerald-800">{summary.passedCount}</span>
              <span className="block text-xs font-semibold text-emerald-700 uppercase mt-0.5">Passed</span>
            </div>
            <div className="bg-amber-50/70 border border-amber-100 rounded-xl p-3.5 text-center min-w-[100px]">
              <span className="text-2xl font-bold text-amber-800">{summary.inProgressCount}</span>
              <span className="block text-xs font-semibold text-amber-700 uppercase mt-0.5">In Progress</span>
            </div>
            <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3.5 text-center min-w-[100px]">
              <span className="text-2xl font-bold text-blue-800">{summary.exemptCount}</span>
              <span className="block text-xs font-semibold text-blue-700 uppercase mt-0.5">Exempt</span>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-center min-w-[100px]">
              <span className="text-2xl font-bold text-gray-700">{summary.notStartedCount}</span>
              <span className="block text-xs font-semibold text-gray-500 uppercase mt-0.5">Remaining</span>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Grid: Next Exam & Today's Study Plan */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Next Exam Card (1 col) */}
        <div className="bg-white rounded-2xl border border-gray-200/80 p-6 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center space-x-1.5">
                <Calendar className="w-4 h-4 text-acca-red" />
                <span>Next Scheduled Exam</span>
              </span>
              <button
                onClick={() => setIsEditingTarget(true)}
                className="text-xs font-medium text-gray-600 hover:text-acca-red flex items-center space-x-1"
                title="Edit Target"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            </div>

            {target?.nextExamPaperId ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-2xl font-black text-gray-900 tracking-tight">
                      {target.nextExamPaperId}
                    </span>
                    <h3 className="text-sm font-semibold text-gray-700 leading-snug">
                      {nextExamPaper?.name}
                    </h3>
                  </div>
                  {daysRemaining !== null && (
                    <div className="text-right">
                      <span className={`text-2xl font-black ${daysRemaining < 30 ? 'text-acca-red' : 'text-gray-900'}`}>
                        {daysRemaining > 0 ? daysRemaining : '0'}
                      </span>
                      <span className="block text-xs font-medium text-gray-500 uppercase">
                        {daysRemaining === 1 ? 'Day Left' : 'Days Left'}
                      </span>
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 rounded-xl p-3.5 space-y-2 border border-gray-100 text-xs">
                  <div className="flex justify-between text-gray-600">
                    <span>Exam Date:</span>
                    <span className="font-semibold text-gray-900">
                      {target.nextExamDate ? new Date(target.nextExamDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not set'}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Target Score:</span>
                    <span className="font-semibold text-emerald-700">{target.targetScore || 65}%</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Target Study Pace:</span>
                    <span className="font-semibold text-gray-900">{target.weeklyStudyHours || 15} hrs/week</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500 text-sm">
                <p>No target exam selected.</p>
                <button
                  onClick={() => setIsEditingTarget(true)}
                  className="mt-2 text-xs font-semibold text-acca-red hover:underline"
                >
                  Set your next exam
                </button>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-gray-100 mt-4 space-y-2">
            <button
              onClick={() => onNavigate('exam-environment')}
              className="w-full text-xs font-bold text-white bg-neutral-900 hover:bg-black py-2 rounded-xl flex items-center justify-center space-x-1.5 transition-colors shadow-xs"
            >
              <Award className="w-3.5 h-3.5 text-acca-red" />
              <span>Practise in CBE Simulator</span>
            </button>
            <button
              onClick={() => onNavigate('my-acca')}
              className="w-full text-xs font-semibold text-gray-500 hover:text-acca-red flex items-center justify-center space-x-1 py-1"
            >
              <span>Manage all 13 papers in My ACCA</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Today's Study Plan (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200/80 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center space-x-1.5">
                <Clock className="w-4 h-4 text-acca-red" />
                <span>Today's Study Plan</span>
              </span>
              <span className="text-xs text-gray-400">
                {studyPlans.filter(p => p.completed).length} of {studyPlans.length} tasks completed
              </span>
            </div>

            {/* Task list */}
            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
              {studyPlans.length === 0 ? (
                <p className="text-sm text-gray-400 italic py-4 text-center">
                  No tasks set for today. Add a study session below!
                </p>
              ) : (
                studyPlans.map(item => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                      item.completed
                        ? 'bg-gray-50/80 border-gray-100 text-gray-400 line-through'
                        : 'bg-white border-gray-200 text-gray-800 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <button
                        onClick={() => handleTogglePlan(item)}
                        className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                          item.completed
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-gray-300 hover:border-acca-red'
                        }`}
                      >
                        {item.completed && <CheckCircle2 className="w-4 h-4" />}
                      </button>
                      <div className="truncate">
                        <span className="text-sm font-medium">{item.title}</span>
                        {item.paperId && (
                          <span className="ml-2 text-xs font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                            {item.paperId}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 shrink-0">
                      {item.estimatedMinutes && (
                        <span className="text-xs text-gray-400">
                          {item.estimatedMinutes}m
                        </span>
                      )}
                      <button
                        onClick={() => handleDeletePlan(item.id)}
                        className="text-gray-300 hover:text-red-500 p-1"
                        title="Delete task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Add task inline form */}
          <form onSubmit={handleAddPlan} className="pt-4 border-t border-gray-100 mt-4 flex items-center gap-2">
            <input
              type="text"
              placeholder="What will you study today? (e.g. Practise IFRS 15 question)..."
              value={newPlanText}
              onChange={(e) => setNewPlanText(e.target.value)}
              className="flex-1 text-xs border border-gray-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-acca-red focus:border-acca-red outline-none"
            />
            <select
              value={newPlanPaperId}
              onChange={(e) => setNewPlanPaperId(e.target.value)}
              className="text-xs border border-gray-300 rounded-lg px-2 py-2 bg-white text-gray-700 outline-none"
            >
              {version.papers.map(p => (
                <option key={p.id} value={p.id}>{p.id}</option>
              ))}
            </select>
            <input
              type="number"
              min="5"
              step="5"
              value={newPlanMinutes}
              onChange={(e) => setNewPlanMinutes(Number(e.target.value))}
              className="w-16 text-xs border border-gray-300 rounded-lg px-2 py-2 text-center outline-none"
              title="Estimated minutes"
            />
            <button
              type="submit"
              className="bg-acca-red hover:bg-acca-red-dark text-white rounded-lg px-3 py-2 text-xs font-medium flex items-center space-x-1 shrink-0 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </form>
        </div>
      </div>

      {/* Qualification Stages Overview */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 tracking-tight">
            ACCA Qualification Stages
          </h2>
          <span className="text-xs text-gray-500 font-medium">
            Stage-wise completion breakdown
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {summary.stageProgress.map(({ stage, completed, required, percentage }) => (
            <div
              key={stage.id}
              className="bg-white rounded-xl border border-gray-200/80 p-4 shadow-xs flex items-center space-x-4"
            >
              <CircularProgress
                percentage={percentage}
                size={54}
                strokeWidth={5}
                color={percentage === 100 ? '#16A34A' : '#C00000'}
              />
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block truncate">
                  {stage.name}
                </span>
                <span className="text-base font-bold text-gray-900">
                  {completed} / {required} <span className="text-xs font-normal text-gray-500">Completed</span>
                </span>
                <p className="text-xs text-gray-400 truncate mt-0.5">
                  {stage.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Subject-Wise Grid of Papers */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900 tracking-tight">
              Subject Papers Grid
            </h2>
            <p className="text-xs text-gray-500">
              Click any paper to record exam results, update your progress, or launch questions.
            </p>
          </div>
          <button
            onClick={() => onNavigate('my-acca')}
            className="text-xs font-semibold text-acca-red hover:underline flex items-center space-x-1"
          >
            <span>Detailed Table View</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {version.papers.map((paper) => {
            const record = paperRecords[paper.id];
            const status = record ? record.status : 'not_started';
            const isCompleted = status === 'passed' || status === 'exempt';
            const paperPercentage = isCompleted ? 100 : status === 'in_progress' ? 50 : 0;

            return (
              <div
                key={paper.id}
                onClick={() => handleOpenPaperModal(paper.id)}
                className="bg-white rounded-xl border border-gray-200/80 hover:border-gray-300 p-4 shadow-xs transition-all cursor-pointer hover:shadow-sm flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-lg font-black text-gray-900 group-hover:text-acca-red transition-colors">
                      {paper.id}
                    </span>
                    <CircularProgress
                      percentage={paperPercentage}
                      size={32}
                      strokeWidth={4}
                      color={isCompleted ? '#16A34A' : status === 'in_progress' ? '#D97706' : '#9CA3AF'}
                      showText={false}
                    />
                  </div>
                  <h4 className="text-sm font-semibold text-gray-800 line-clamp-1 mb-1">
                    {paper.name}
                  </h4>
                  <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                    {paper.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-gray-100 mt-3 flex items-center justify-between">
                  <Badge status={status} />
                  {record?.score !== undefined && (
                    <span className="text-xs font-bold text-gray-700">
                      {record.score} marks
                    </span>
                  )}
                  {record?.examSession && (
                    <span className="text-xs text-gray-400">
                      {record.examSession}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-gray-900">Recent Activity</h3>
          <span className="text-xs text-gray-400">Real-time local event log</span>
        </div>

        {activityLogs.length === 0 ? (
          <p className="text-sm text-gray-400 italic py-3">No activity logged yet.</p>
        ) : (
          <div className="space-y-3">
            {activityLogs.slice(0, 5).map((log) => (
              <div key={log.id} className="flex items-start space-x-3 text-xs">
                <span className="w-2 h-2 rounded-full bg-acca-red mt-1.5 shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-900">{log.title}</span>
                    <span className="text-gray-400">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-gray-600 mt-0.5">{log.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Target Edit Modal */}
      <Modal
        isOpen={isEditingTarget}
        onClose={() => setIsEditingTarget(false)}
        title="Edit Target Exam"
      >
        <form onSubmit={handleSaveTarget} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
              Next ACCA Paper
            </label>
            <select
              value={targetPaperId}
              onChange={(e) => setTargetPaperId(e.target.value)}
              className="w-full text-sm border border-gray-300 rounded-lg p-2.5 outline-none focus:border-acca-red"
            >
              {version.papers.map(p => (
                <option key={p.id} value={p.id}>{p.id} — {p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
              Exam Date
            </label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full text-sm border border-gray-300 rounded-lg p-2.5 outline-none focus:border-acca-red"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Target Score (%)
              </label>
              <input
                type="number"
                min="50"
                max="100"
                value={targetScore}
                onChange={(e) => setTargetScore(Number(e.target.value))}
                className="w-full text-sm border border-gray-300 rounded-lg p-2.5 outline-none focus:border-acca-red"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Weekly Study Hours
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={weeklyHours}
                onChange={(e) => setWeeklyHours(Number(e.target.value))}
                className="w-full text-sm border border-gray-300 rounded-lg p-2.5 outline-none focus:border-acca-red"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsEditingTarget(false)}
              className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold text-white bg-acca-red hover:bg-acca-red-dark rounded-lg"
            >
              Save Target
            </button>
          </div>
        </form>
      </Modal>

      {/* Quick Paper Status Modal */}
      {editingPaperId && (
        <Modal
          isOpen={!!editingPaperId}
          onClose={() => setEditingPaperId(null)}
          title={`Update Progress: ${editingPaperId}`}
        >
          <form onSubmit={handleSavePaper} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Exam Status
              </label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as any)}
                className="w-full text-sm border border-gray-300 rounded-lg p-2.5 outline-none focus:border-acca-red"
              >
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="passed">Passed</option>
                <option value="exempt">Exempt</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Exam Session
                </label>
                <input
                  type="text"
                  placeholder="e.g. March 2027"
                  value={editSession}
                  onChange={(e) => setEditSession(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-lg p-2.5 outline-none focus:border-acca-red"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Score / Mark Achieved
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="e.g. 75"
                  value={editScore ?? ''}
                  onChange={(e) => setEditScore(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full text-sm border border-gray-300 rounded-lg p-2.5 outline-none focus:border-acca-red"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Personal Study Notes
              </label>
              <textarea
                rows={3}
                placeholder="Key focus areas, exam techniques, syllabus thoughts..."
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg p-2.5 outline-none focus:border-acca-red"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setEditingPaperId(null)}
                className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-acca-red hover:bg-acca-red-dark rounded-lg"
              >
                Save Progress
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
