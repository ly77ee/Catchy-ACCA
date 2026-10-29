import React, { useState, useRef } from 'react';
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
  ArrowUpRight,
  Upload,
  FileText,
  AlertCircle,
  Check,
  Sparkles,
  Layers,
} from 'lucide-react';
import { CircularProgress } from '../common/CircularProgress';
import { Modal } from '../common/Modal';
import {
  StudentPaperRecord,
  StudentTarget,
  StudyPlanItem,
  ActivityLog,
  QualificationVersion,
  StudyMaterial,
} from '../../types';
import { calculateProgressSummary } from '../../config/accaStructure';
import { db, logActivity } from '../../db';
import * as pdfjsLib from 'pdfjs-dist';

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

  // Study Material Quick Upload state
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Calculate days remaining to next exam (strictly derived from real target date)
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
      createdAt: new Date().toISOString(),
    };

    await db.studyPlans.put(newItem);
    await logActivity('Task Added', `Added to study plan: ${newItem.title}`, 'plan');
    setNewPlanText('');
  };

  // Toggle study plan item
  const handleTogglePlan = async (id: string, currentStatus: boolean) => {
    const item = studyPlans.find((p) => p.id === id);
    if (!item) return;

    const updated: StudyPlanItem = {
      ...item,
      completed: !currentStatus,
    };

    await db.studyPlans.put(updated);
    await logActivity(
      updated.completed ? 'Task Completed' : 'Task Reopened',
      item.title,
      'plan'
    );
  };

  // Delete study plan item
  const handleDeletePlan = async (id: string) => {
    await db.studyPlans.delete(id);
    await logActivity('Task Deleted', `Removed from daily plan`, 'plan');
  };

  // Save student exam target
  const handleSaveTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    const updatedTarget: StudentTarget = {
      id: target?.id || 'default',
      nextExamPaperId: targetPaperId,
      nextExamDate: targetDate,
      targetScore: Number(targetScore) || 70,
      weeklyStudyHours: Number(weeklyHours) || 15,
    };

    await db.targets.put(updatedTarget);
    await logActivity(
      'Exam Target Updated',
      `Target paper: ${targetPaperId} on ${targetDate || 'Unspecified date'}`,
      'paper'
    );
    setIsEditingTarget(false);
  };

  // Handle PDF Material Upload
  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setUploadError('Only PDF documents are supported for study material extraction.');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setUploadError('File exceeds 50MB limit. Please upload a chapter or kit under 50MB.');
      return;
    }

    setIsUploadingPdf(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      let totalPages = 1;
      try {
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer.slice(0) });
        const doc = await loadingTask.promise;
        totalPages = doc.numPages;
      } catch {
        // Fallback page count
      }

      const cleanTitle = file.name.replace(/\.pdf$/i, '');
      const newMaterial: StudyMaterial = {
        id: 'mat-' + Date.now(),
        title: cleanTitle,
        fileName: file.name,
        fileSize: file.size,
        totalPages,
        paperId: target?.nextExamPaperId || 'FR',
        tags: ['Study Material', 'Uploaded PDF'],
        addedAt: new Date().toISOString(),
        pdfData: arrayBuffer,
      };

      await db.studyMaterials.put(newMaterial);
      await logActivity('Material Imported', `Imported ${cleanTitle} (${totalPages} pages)`, 'document');

      setUploadSuccess(`Successfully imported "${cleanTitle}" (${totalPages} pages).`);
      setTimeout(() => setUploadSuccess(null), 4000);
    } catch (err: any) {
      setUploadError('Failed to process PDF: ' + (err.message || 'Unknown error'));
    } finally {
      setIsUploadingPdf(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const nextExamPaper = version.papers.find((p) => p.id === target?.nextExamPaperId);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Welcome Heading */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-acca-red bg-acca-red/10 px-2.5 py-1 rounded border border-acca-red/20 inline-block">
            ACCA Study Companion
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white mt-1.5 tracking-tight">
            Study Workspace & Progress
          </h1>
          <p className="text-xs text-gray-400 mt-1 max-w-2xl leading-relaxed">
            Welcome to Catchy ACCA. Track your qualification, import revision kits, practice CBE questions, and manage your daily study plan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('my-acca')}
            className="px-3.5 py-2 bg-[#1e1e24] hover:bg-[#25252e] border border-[#2a2a34] rounded-xl text-xs font-semibold text-gray-200 transition-colors flex items-center gap-1.5"
          >
            <span>My ACCA Qualification</span>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Main Central Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left / Central Column: Qualification Card & Import Area (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Central Qualification-Progress Card (PART 3.3 MANDATE) */}
          <div className="bg-[#1e1e24] rounded-2xl border border-[#2a2a34] p-6 shadow-xs relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Single Large Circular Progress Indicator */}
              <div className="shrink-0">
                <CircularProgress
                  percentage={summary.overallPercentage}
                  size={130}
                  strokeWidth={11}
                  color="#C00000"
                  trackColor="#141419"
                  subLabel="Completed"
                />
              </div>

              {/* Numerical Representation and Details */}
              <div className="space-y-2 text-center sm:text-left flex-1 min-w-0">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-acca-red bg-acca-red/10 px-2 py-0.5 rounded border border-acca-red/20">
                    ACCA Qualification
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
                    Exams Completed
                  </span>
                </div>

                <p className="text-xs text-gray-400 leading-relaxed">
                  {summary.passedCount === 0
                    ? 'No exams recorded as passed yet. Record your passed exams or exemptions in My ACCA.'
                    : `You have completed ${summary.passedCount} out of ${summary.totalRequired} exams (${summary.overallPercentage}%).`}
                </p>

                <div className="pt-2">
                  <button
                    onClick={() => onNavigate('my-acca')}
                    className="text-xs font-semibold text-acca-red hover:underline flex items-center justify-center sm:justify-start gap-1"
                  >
                    <span>View all qualification stages & paper details in My ACCA</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Stages Breakdown Bar */}
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

          {/* Prominent Study-Material Import Area (PART 3.3 MANDATE) */}
          <div className="bg-[#1e1e24] rounded-2xl border border-[#2a2a34] p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#2a2a34]">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-acca-red" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Import Study Materials & Exam Kits
                </h2>
              </div>
              <span className="text-[11px] text-gray-400">PDF up to 50MB</span>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed">
              Import study texts, question kits, and mock exams directly from your computer. All documents remain 100% on your device in private local storage.
            </p>

            {uploadError && (
              <div className="p-3 bg-red-950/40 border border-red-800 rounded-xl text-xs text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {uploadSuccess && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-800 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{uploadSuccess}</span>
              </div>
            )}

            {/* Dropzone / Upload Area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#2a2a34] hover:border-acca-red/60 bg-[#141419]/70 rounded-xl p-6 text-center cursor-pointer transition-colors group space-y-2 select-none"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                onChange={handleUploadFile}
                disabled={isUploadingPdf}
                className="hidden"
              />
              <div className="w-10 h-10 rounded-full bg-[#1e1e24] text-gray-400 group-hover:text-acca-red flex items-center justify-center mx-auto border border-[#2a2a34]">
                {isUploadingPdf ? (
                  <div className="w-5 h-5 border-2 border-acca-red border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Upload className="w-5 h-5" />
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-white">
                  {isUploadingPdf ? 'Reading and storing document...' : 'Click or drop PDF exam kit to import'}
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Supports BPP, Kaplan, and student study notes
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right-Hand Column: Next Exam, Today's Plan, Recent Activity (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Widget 1: Next Exam */}
          <div className="bg-[#1e1e24] rounded-2xl border border-[#2a2a34] p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-[#2a2a34]">
              <span className="font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-acca-red" />
                <span>Next Scheduled Exam</span>
              </span>
              <button
                onClick={() => setIsEditingTarget(true)}
                className="text-xs font-semibold text-acca-red hover:underline flex items-center gap-1"
              >
                <Edit3 className="w-3 h-3" />
                <span>{target?.nextExamDate ? 'Edit' : 'Set Date'}</span>
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
                      <span className="text-2xl font-black text-acca-red">
                        {daysRemaining > 0 ? daysRemaining : 0}
                      </span>
                      <span className="block text-[10px] font-semibold text-gray-400 uppercase">
                        Days Left
                      </span>
                    </div>
                  )}
                </div>

                <div className="text-xs text-gray-400 flex items-center justify-between pt-1">
                  <span>Session Date:</span>
                  <span className="font-semibold text-white">
                    {new Date(target.nextExamDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
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

          {/* Widget 2: Today's Study Plan */}
          <div className="bg-[#1e1e24] rounded-2xl border border-[#2a2a34] p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-[#2a2a34]">
              <span className="font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
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

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {studyPlans.length === 0 ? (
                <p className="text-xs text-gray-500 py-3 text-center">
                  No study tasks scheduled for today.
                </p>
              ) : (
                studyPlans.slice(0, 4).map((item) => (
                  <div
                    key={item.id}
                    className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 transition-all ${
                      item.completed
                        ? 'bg-[#141419]/60 border-[#2a2a34] opacity-50'
                        : 'bg-[#141419] border-[#2a2a34]'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <button
                        onClick={() => handleTogglePlan(item.id, item.completed)}
                        className={`w-4 h-4 rounded flex items-center justify-center border transition-colors shrink-0 ${
                          item.completed
                            ? 'bg-acca-red border-acca-red text-white'
                            : 'border-gray-500 hover:border-acca-red'
                        }`}
                      >
                        {item.completed && <Check className="w-3 h-3 stroke-[3]" />}
                      </button>
                      <span
                        className={`truncate ${
                          item.completed ? 'line-through text-gray-500' : 'text-gray-200'
                        }`}
                      >
                        {item.title}
                      </span>
                    </div>

                    <button
                      onClick={() => handleDeletePlan(item.id)}
                      className="text-gray-600 hover:text-red-400 p-1 shrink-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Quick add inline form */}
            <form onSubmit={handleAddPlan} className="pt-2 flex items-center gap-2">
              <input
                type="text"
                placeholder="What will you study today?..."
                value={newPlanText}
                onChange={(e) => setNewPlanText(e.target.value)}
                className="flex-1 bg-[#141419] border border-[#2a2a34] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-500 outline-none focus:border-acca-red"
              />
              <button
                type="submit"
                disabled={!newPlanText.trim()}
                className="px-2.5 py-1.5 bg-acca-red hover:bg-acca-red-dark disabled:opacity-40 text-white rounded-lg text-xs font-bold transition-colors"
              >
                Add
              </button>
            </form>
          </div>

          {/* Widget 3: Recent Activity (Real events only, clean empty state for new users) */}
          <div className="bg-[#1e1e24] rounded-2xl border border-[#2a2a34] p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-[#2a2a34]">
              <span className="font-bold uppercase tracking-wider text-gray-400">
                Recent Activity
              </span>
              <span className="text-[10px] text-gray-500">Local Journal</span>
            </div>

            {activityLogs.length === 0 ? (
              <div className="py-4 text-center">
                <p className="text-xs text-gray-500">No activity recorded yet.</p>
                <p className="text-[11px] text-gray-600 mt-0.5">
                  Import a study kit or take an exam practice session to log events.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-48 overflow-y-auto">
                {activityLogs.slice(0, 4).map((log) => (
                  <div key={log.id} className="flex items-start gap-2.5 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-acca-red mt-1.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-200 truncate">{log.title}</span>
                        <span className="text-[10px] text-gray-500 shrink-0">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 truncate mt-0.5">{log.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Target Edit Modal */}
      <Modal
        isOpen={isEditingTarget}
        onClose={() => setIsEditingTarget(false)}
        title="Edit Next Exam Target"
      >
        <form onSubmit={handleSaveTarget} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-gray-300 mb-1">Target ACCA Paper</label>
            <select
              value={targetPaperId}
              onChange={(e) => setTargetPaperId(e.target.value)}
              className="w-full bg-[#141419] border border-[#2a2a34] rounded-xl px-3 py-2 text-white outline-none focus:border-acca-red"
            >
              {version.papers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.id} — {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-gray-300 mb-1">Target Exam Date</label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full bg-[#141419] border border-[#2a2a34] rounded-xl px-3 py-2 text-white outline-none focus:border-acca-red"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-gray-300 mb-1">Target Score (%)</label>
              <input
                type="number"
                min="50"
                max="100"
                value={targetScore}
                onChange={(e) => setTargetScore(Number(e.target.value))}
                className="w-full bg-[#141419] border border-[#2a2a34] rounded-xl px-3 py-2 text-white outline-none focus:border-acca-red"
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-300 mb-1">Weekly Hours</label>
              <input
                type="number"
                min="1"
                max="60"
                value={weeklyHours}
                onChange={(e) => setWeeklyHours(Number(e.target.value))}
                className="w-full bg-[#141419] border border-[#2a2a34] rounded-xl px-3 py-2 text-white outline-none focus:border-acca-red"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-[#2a2a34]">
            <button
              type="button"
              onClick={() => setIsEditingTarget(false)}
              className="px-4 py-2 border border-[#2a2a34] rounded-xl text-gray-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-acca-red hover:bg-acca-red-dark text-white rounded-xl font-bold"
            >
              Save Target
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
