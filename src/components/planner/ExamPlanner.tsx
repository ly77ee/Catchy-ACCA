import React, { useState, useMemo } from 'react';
import {
  QualificationVersion,
  StudyPlanItem,
  StudentTarget,
  QuestionRecord,
  StudyMaterial,
} from '../../types';
import { db, logActivity } from '../../db';
import {
  calculateDaysRemaining,
  formatCalendarDate,
  toLocalDateString,
  getStartOfWeek,
  getWeekDates,
  formatWeekRange,
} from '../../utils/dateUtils';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  Target,
  Filter,
  Check,
  ChevronLeft,
  ChevronRight,
  Edit2,
  List,
  Grid3X3,
  BookOpen,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Sparkles,
  X,
  Flame
} from 'lucide-react';

interface ExamPlannerProps {
  version: QualificationVersion;
  target: StudentTarget | null;
  studyPlans: StudyPlanItem[];
  allQuestions: QuestionRecord[];
  studyMaterials: StudyMaterial[];
  onOpenQuestionInWriter?: (questionId: string) => void;
  onOpenMaterial?: (materialId: string, page: number) => void;
}

const HOURS_GRID = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];

export const ExamPlanner: React.FC<ExamPlannerProps> = ({
  version,
  target,
  studyPlans,
  allQuestions,
  studyMaterials,
  onOpenQuestionInWriter,
  onOpenMaterial,
}) => {
  // View mode: 'timetable' (default) vs 'list'
  const [viewMode, setViewMode] = useState<'timetable' | 'list'>('timetable');

  // Timetable week navigation: state holds Monday date of current view week
  const [currentStartOfWeek, setCurrentStartOfWeek] = useState<Date>(() => getStartOfWeek(new Date()));

  // Filter for paper in list view
  const [selectedPaperFilter, setSelectedPaperFilter] = useState<string>('all');
  const [listStatusFilter, setListStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');

  // Session Modal State (Create or Edit)
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<StudyPlanItem | null>(null);
  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionPaperId, setSessionPaperId] = useState(target?.nextExamPaperId || 'FR');
  const [sessionDueDate, setSessionDueDate] = useState(() => toLocalDateString(new Date()));
  const [sessionStartTime, setSessionStartTime] = useState('');
  const [sessionEndTime, setSessionEndTime] = useState('');
  const [sessionMinutes, setSessionMinutes] = useState(60);
  const [sessionTopic, setSessionTopic] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);

  // Exam Target Modal State
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [targetPaperId, setTargetPaperId] = useState(target?.nextExamPaperId || 'FR');
  const [targetDate, setTargetDate] = useState(target?.nextExamDate || '');
  const [targetScore, setTargetScore] = useState(target?.targetScore || 70);
  const [weeklyHoursGoal, setWeeklyHoursGoal] = useState(target?.weeklyStudyHours || 15);
  const [targetNotes, setTargetNotes] = useState(target?.notes || '');

  // Today local string for comparison
  const todayStr = useMemo(() => toLocalDateString(new Date()), []);

  // 7 days of current week
  const weekDays = useMemo(() => getWeekDates(currentStartOfWeek), [currentStartOfWeek]);
  const weekDatesSet = useMemo(() => new Set(weekDays.map((d) => d.dateStr)), [weekDays]);

  // Navigate week
  const handlePrevWeek = () => {
    setCurrentStartOfWeek((prev) => {
      const d = new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() - 7);
      return getStartOfWeek(d);
    });
  };

  const handleNextWeek = () => {
    setCurrentStartOfWeek((prev) => {
      const d = new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 7);
      return getStartOfWeek(d);
    });
  };

  const handleTodayWeek = () => {
    setCurrentStartOfWeek(getStartOfWeek(new Date()));
  };

  // Workload summary for current week
  const weekWorkload = useMemo(() => {
    const sessionsInWeek = studyPlans.filter((p) => weekDatesSet.has(p.dueDate));
    const totalMinutes = sessionsInWeek.reduce((sum, p) => sum + (p.estimatedMinutes || 0), 0);
    const completedMinutes = sessionsInWeek
      .filter((p) => p.completed)
      .reduce((sum, p) => sum + (p.estimatedMinutes || 0), 0);

    const plannedHours = Math.round((totalMinutes / 60) * 10) / 10;
    const completedHours = Math.round((completedMinutes / 60) * 10) / 10;
    const completedCount = sessionsInWeek.filter((p) => p.completed).length;

    return {
      totalSessions: sessionsInWeek.length,
      completedSessions: completedCount,
      plannedHours,
      completedHours,
      goalHours: target?.weeklyStudyHours || 15,
      percentComplete: sessionsInWeek.length > 0 ? Math.round((completedCount / sessionsInWeek.length) * 100) : 0,
    };
  }, [studyPlans, weekDatesSet, target?.weeklyStudyHours]);

  // Open modal to create session at specific date & hour
  const handleOpenCreateSession = (dateStr?: string, hour?: number) => {
    setEditingSession(null);
    setSessionTitle('');
    setSessionPaperId(target?.nextExamPaperId || 'FR');
    setSessionDueDate(dateStr || todayStr);
    if (hour !== undefined) {
      const startH = String(hour).padStart(2, '0');
      const endH = String(hour + 1).padStart(2, '0');
      setSessionStartTime(`${startH}:00`);
      setSessionEndTime(`${endH}:00`);
      setSessionMinutes(60);
      setIsAllDay(false);
    } else {
      setSessionStartTime('');
      setSessionEndTime('');
      setSessionMinutes(45);
      setIsAllDay(true);
    }
    setSessionTopic('');
    setSessionNotes('');
    setIsSessionModalOpen(true);
  };

  // Open modal to edit existing session
  const handleOpenEditSession = (session: StudyPlanItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingSession(session);
    setSessionTitle(session.title);
    setSessionPaperId(session.paperId || 'FR');
    setSessionDueDate(session.dueDate);
    setSessionStartTime(session.startTime || '');
    setSessionEndTime(session.endTime || '');
    setSessionMinutes(session.estimatedMinutes || 45);
    setSessionTopic(session.topic || '');
    setSessionNotes(session.notes || '');
    setIsAllDay(!session.startTime);
    setIsSessionModalOpen(true);
  };

  // Save Session (Create or Update)
  const handleSaveSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionTitle.trim()) return;

    // Calculate duration in minutes if start and end time are provided
    let calculatedMinutes = sessionMinutes;
    if (!isAllDay && sessionStartTime && sessionEndTime) {
      const [sh, sm] = sessionStartTime.split(':').map(Number);
      const [eh, em] = sessionEndTime.split(':').map(Number);
      const diff = (eh * 60 + em) - (sh * 60 + sm);
      if (diff > 0) calculatedMinutes = diff;
    }

    const payload: StudyPlanItem = {
      id: editingSession ? editingSession.id : 'plan-' + Date.now(),
      title: sessionTitle.trim(),
      paperId: sessionPaperId,
      estimatedMinutes: calculatedMinutes > 0 ? calculatedMinutes : 45,
      completed: editingSession ? editingSession.completed : false,
      dueDate: sessionDueDate,
      createdAt: editingSession ? editingSession.createdAt : new Date().toISOString(),
      startTime: !isAllDay && sessionStartTime ? sessionStartTime : undefined,
      endTime: !isAllDay && sessionEndTime ? sessionEndTime : undefined,
      topic: sessionTopic.trim() || undefined,
      notes: sessionNotes.trim() || undefined,
    };

    await db.studyPlans.put(payload);
    await logActivity(
      editingSession ? 'Study Session Updated' : 'Study Session Scheduled',
      `${payload.title} (${payload.paperId})`,
      'plan'
    );

    setIsSessionModalOpen(false);
  };

  // Toggle completion of session
  const handleToggleSession = async (session: StudyPlanItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const updated: StudyPlanItem = {
      ...session,
      completed: !session.completed,
    };
    await db.studyPlans.put(updated);
    await logActivity(
      updated.completed ? 'Session Completed' : 'Session Reopened',
      session.title,
      'plan'
    );
  };

  // Delete session
  const handleDeleteSession = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    await db.studyPlans.delete(id);
    await logActivity('Session Deleted', 'Removed study session', 'plan');
    if (editingSession?.id === id) {
      setIsSessionModalOpen(false);
    }
  };

  // Save Target Exam
  const handleSaveTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    const updatedTarget: StudentTarget = {
      id: target?.id || 'default',
      nextExamPaperId: targetPaperId,
      nextExamDate: targetDate.trim() || undefined,
      targetScore: Number(targetScore) || 70,
      weeklyStudyHours: Number(weeklyHoursGoal) || 15,
      notes: targetNotes.trim(),
    };

    await db.targets.put(updatedTarget);
    await logActivity(
      'Exam Target Updated',
      `Target set to ${targetPaperId} on ${targetDate || 'Unscheduled'}`,
      'plan'
    );
    setIsTargetModalOpen(false);
  };

  // Remove Exam Target
  const handleRemoveTarget = async () => {
    if (!target) return;
    const cleared: StudentTarget = {
      ...target,
      nextExamDate: undefined,
    };
    await db.targets.put(cleared);
    setIsTargetModalOpen(false);
  };

  // List view filtered items
  const filteredListPlans = useMemo(() => {
    return studyPlans
      .filter((item) => {
        if (selectedPaperFilter !== 'all' && item.paperId !== selectedPaperFilter) return false;
        if (listStatusFilter === 'pending') return !item.completed;
        if (listStatusFilter === 'completed') return item.completed;
        return true;
      })
      .sort((a, b) => {
        // Sort chronologically by dueDate then startTime
        const dateComp = a.dueDate.localeCompare(b.dueDate);
        if (dateComp !== 0) return dateComp;
        return (a.startTime || '').localeCompare(b.startTime || '');
      });
  }, [studyPlans, selectedPaperFilter, listStatusFilter]);

  // Days remaining for target
  const daysRemaining = calculateDaysRemaining(target?.nextExamDate);

  return (
    <div className="space-y-6">
      {/* Top Banner & Exam Planner Header */}
      <div className="bg-[#1e1e24] p-5 sm:p-6 rounded-2xl border border-[#2a2a34] flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-acca-red bg-acca-red/10 border border-acca-red/20 px-2.5 py-0.5 rounded-full">
              Exam Planner
            </span>
            <span className="text-xs text-gray-400">
              {version.name}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            ACCA Exam Planner & Task Schedule
          </h1>
          <p className="text-xs text-gray-400 max-w-xl">
            Schedule weekly study sessions, manage paper exam dates, and track target hours across your ACCA syllabus.
          </p>
        </div>

        {/* View Toggle and Primary Actions */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* View Mode Toggle Button */}
          <div className="bg-[#141419] p-1 rounded-xl border border-[#2a2a34] flex items-center space-x-1">
            <button
              onClick={() => setViewMode('timetable')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'timetable'
                  ? 'bg-[#25252e] text-white shadow-xs'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Grid3X3 className="w-3.5 h-3.5" />
              <span>Timetable</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'list'
                  ? 'bg-[#25252e] text-white shadow-xs'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>List View</span>
            </button>
          </div>

          {/* Add Study Session Button */}
          <button
            onClick={() => handleOpenCreateSession()}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-acca-red hover:bg-acca-red-hover text-white rounded-xl text-xs font-bold transition-all shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Study Session</span>
          </button>
        </div>
      </div>

      {/* Upcoming Exams Section (Compact and Clean) */}
      <div className="bg-[#1e1e24] p-5 rounded-2xl border border-[#2a2a34] space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#2a2a34]">
          <div className="flex items-center space-x-2">
            <Target className="w-4 h-4 text-acca-red" />
            <h2 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
              Upcoming Exam Targets
            </h2>
          </div>
          <button
            onClick={() => setIsTargetModalOpen(true)}
            className="text-xs text-acca-red hover:underline font-bold flex items-center space-x-1"
          >
            <Edit2 className="w-3 h-3" />
            <span>{target?.nextExamDate ? 'Edit Exam Target' : '+ Set Exam Target'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Target Card */}
          {target && target.nextExamPaperId ? (
            <div className="bg-[#141419] p-4 rounded-xl border border-acca-red/30 relative flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-acca-red text-white">
                    {target.nextExamPaperId}
                  </span>
                  <span className="text-xs font-bold text-white truncate">
                    {version.papers.find((p) => p.id === target.nextExamPaperId)?.name || 'ACCA Paper'}
                  </span>
                </div>
                <div className="text-[11px] text-gray-400">
                  Exam Date: <span className="text-gray-200 font-semibold">{formatCalendarDate(target.nextExamDate)}</span>
                </div>
                {target.targetScore && (
                  <div className="text-[10px] text-gray-500 mt-0.5">
                    Target Score: {target.targetScore}% • {target.weeklyStudyHours || 15}h/wk
                  </div>
                )}
              </div>

              <div className="text-right pl-3 border-l border-[#2a2a34]">
                {daysRemaining !== null ? (
                  <>
                    <span
                      className={`text-xl font-black block ${
                        daysRemaining <= 14 ? 'text-acca-red' : 'text-emerald-400'
                      }`}
                    >
                      {daysRemaining > 0 ? `${daysRemaining}d` : 'Today'}
                    </span>
                    <span className="text-[9px] font-bold text-gray-500 uppercase block">
                      Remaining
                    </span>
                  </>
                ) : (
                  <span className="text-[11px] text-amber-400 font-semibold block">
                    No date set
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-[#141419] border border-[#2a2a34] text-xs text-gray-400 flex items-center justify-between col-span-full">
              <span>No active exam targets configured yet.</span>
              <button
                onClick={() => setIsTargetModalOpen(true)}
                className="text-xs font-bold text-acca-red hover:underline"
              >
                + Configure Target Date
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Weekly Workload Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Planned Hours */}
        <div className="bg-[#1e1e24] p-4 rounded-xl border border-[#2a2a34] flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-400 block uppercase">Planned This Week</span>
            <span className="text-lg sm:text-xl font-black text-white">{weekWorkload.plannedHours} hrs</span>
            <span className="text-[10px] text-gray-500 block">Goal: {weekWorkload.goalHours} hrs</span>
          </div>
          <Clock className="w-5 h-5 text-gray-500" />
        </div>

        {/* Completed Hours */}
        <div className="bg-[#1e1e24] p-4 rounded-xl border border-[#2a2a34] flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-400 block uppercase">Completed Hours</span>
            <span className="text-lg sm:text-xl font-black text-emerald-400">{weekWorkload.completedHours} hrs</span>
            <span className="text-[10px] text-gray-500 block">
              {weekWorkload.goalHours > 0 ? Math.round((weekWorkload.completedHours / weekWorkload.goalHours) * 100) : 0}% of goal
            </span>
          </div>
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        </div>

        {/* Scheduled Sessions */}
        <div className="bg-[#1e1e24] p-4 rounded-xl border border-[#2a2a34] flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-400 block uppercase">Sessions in Week</span>
            <span className="text-lg sm:text-xl font-black text-white">{weekWorkload.totalSessions}</span>
            <span className="text-[10px] text-gray-500 block">{weekWorkload.completedSessions} completed</span>
          </div>
          <CalendarIcon className="w-5 h-5 text-gray-500" />
        </div>

        {/* Total Tasks All Time */}
        <div className="bg-[#1e1e24] p-4 rounded-xl border border-[#2a2a34] flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-400 block uppercase">All-Time Progress</span>
            <span className="text-lg sm:text-xl font-black text-white">
              {studyPlans.filter((p) => p.completed).length} / {studyPlans.length}
            </span>
            <span className="text-[10px] text-gray-500 block">
              {studyPlans.length > 0 ? Math.round((studyPlans.filter((p) => p.completed).length / studyPlans.length) * 100) : 0}% completed
            </span>
          </div>
          <Flame className="w-5 h-5 text-amber-400" />
        </div>
      </div>

      {/* Main View: Timetable vs List */}
      {viewMode === 'timetable' ? (
        <div className="bg-[#1e1e24] p-4 sm:p-5 rounded-2xl border border-[#2a2a34] space-y-4">
          {/* Week Navigation Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#2a2a34]">
            <div className="flex items-center space-x-2">
              <button
                onClick={handlePrevWeek}
                title="Previous Week"
                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-[#25252e] border border-[#2a2a34] transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleTodayWeek}
                className="px-3 py-1.5 text-xs font-bold text-gray-300 hover:text-white rounded-lg hover:bg-[#25252e] border border-[#2a2a34] transition-colors"
              >
                Today
              </button>
              <button
                onClick={handleNextWeek}
                title="Next Week"
                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-[#25252e] border border-[#2a2a34] transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <span className="text-sm font-bold text-white pl-2">
                {formatWeekRange(currentStartOfWeek)}
              </span>
            </div>

            <span className="text-xs text-gray-500">
              Click any slot to schedule a session
            </span>
          </div>

          {/* Timetable Scroll Container */}
          <div className="overflow-x-auto">
            <div className="min-w-[760px]">
              {/* Day Headers (7 Columns) */}
              <div className="grid grid-cols-8 gap-1.5 mb-2 text-center text-xs">
                {/* Time Scale Label */}
                <div className="p-2 text-gray-500 font-bold uppercase text-[10px] flex items-center justify-center">
                  Time
                </div>

                {weekDays.map((day) => {
                  const isToday = day.dateStr === todayStr;
                  return (
                    <div
                      key={day.dateStr}
                      className={`p-2 rounded-xl border text-center transition-all ${
                        isToday
                          ? 'bg-acca-red/15 border-acca-red/40 text-white font-bold'
                          : 'bg-[#141419] border-[#2a2a34] text-gray-300'
                      }`}
                    >
                      <div className="text-[10px] font-bold uppercase text-gray-400">{day.dayName}</div>
                      <div className="text-sm font-black">{day.dayNumber}</div>
                    </div>
                  );
                })}
              </div>

              {/* Unscheduled / All-Day Sessions Row */}
              <div className="grid grid-cols-8 gap-1.5 mb-3">
                <div className="p-2 text-[10px] text-gray-400 font-bold uppercase flex items-center justify-center bg-[#141419]/60 rounded-xl border border-[#2a2a34]">
                  All-Day
                </div>

                {weekDays.map((day) => {
                  const allDaySessions = studyPlans.filter(
                    (p) => p.dueDate === day.dateStr && !p.startTime
                  );

                  return (
                    <div
                      key={'allday-' + day.dateStr}
                      onClick={() => handleOpenCreateSession(day.dateStr)}
                      className="min-h-[44px] p-1.5 rounded-xl bg-[#141419]/40 border border-[#2a2a34] space-y-1 hover:border-[#3a3a48] transition-colors cursor-pointer"
                    >
                      {allDaySessions.map((session) => (
                        <div
                          key={session.id}
                          onClick={(e) => handleOpenEditSession(session, e)}
                          className={`p-1.5 rounded-lg border text-[11px] transition-all flex items-center justify-between ${
                            session.completed
                              ? 'bg-[#1e1e24]/60 border-[#2a2a34] text-gray-500 line-through'
                              : 'bg-acca-red/10 border-acca-red/30 text-white font-semibold'
                          }`}
                        >
                          <div className="truncate mr-1">
                            <span className="text-[9px] font-bold px-1 rounded bg-acca-red text-white mr-1">
                              {session.paperId}
                            </span>
                            <span>{session.title}</span>
                          </div>
                          <button
                            onClick={(e) => handleToggleSession(session, e)}
                            className="text-gray-400 hover:text-emerald-400 shrink-0"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>

              {/* Timetable Hourly Grid */}
              <div className="space-y-1">
                {HOURS_GRID.map((hour) => {
                  const hourLabel = `${String(hour).padStart(2, '0')}:00`;

                  return (
                    <div key={hour} className="grid grid-cols-8 gap-1.5 min-h-[48px]">
                      {/* Hour Axis Label */}
                      <div className="p-1 text-[11px] text-gray-500 font-mono flex items-center justify-center">
                        {hourLabel}
                      </div>

                      {/* 7 Days Grid Cells */}
                      {weekDays.map((day) => {
                        // Find sessions matching this day and hour
                        const cellSessions = studyPlans.filter((p) => {
                          if (p.dueDate !== day.dateStr || !p.startTime) return false;
                          const startH = parseInt(p.startTime.split(':')[0], 10);
                          return startH === hour;
                        });

                        return (
                          <div
                            key={day.dateStr + '-' + hour}
                            onClick={() => handleOpenCreateSession(day.dateStr, hour)}
                            className="p-1 rounded-lg bg-[#141419]/30 border border-[#22222b] hover:border-[#383846] hover:bg-[#141419]/60 transition-colors cursor-pointer space-y-1"
                          >
                            {cellSessions.map((session) => (
                              <div
                                key={session.id}
                                onClick={(e) => handleOpenEditSession(session, e)}
                                className={`p-1.5 rounded-lg border text-[10px] leading-tight transition-all shadow-xs ${
                                  session.completed
                                    ? 'bg-[#1e1e24] border-[#2a2a34] text-gray-500 line-through'
                                    : 'bg-[#25252e] border-acca-red/40 text-white font-medium'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-1 mb-0.5">
                                  <span className="font-bold px-1 rounded bg-acca-red text-white text-[9px]">
                                    {session.paperId}
                                  </span>
                                  <span className="text-[9px] text-gray-400 font-mono">
                                    {session.startTime}
                                  </span>
                                </div>
                                <div className="truncate font-semibold text-gray-100">
                                  {session.title}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Upcoming Study Sessions (Later Weeks) */}
          <div className="pt-4 border-t border-[#2a2a34]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center space-x-1.5">
                <CalendarIcon className="w-4 h-4 text-acca-red" />
                <span>Upcoming Study Sessions (Other Weeks)</span>
              </span>
              <button
                onClick={() => setViewMode('list')}
                className="text-xs text-acca-red hover:underline font-semibold"
              >
                Switch to Full List View →
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {studyPlans
                .filter((p) => !weekDatesSet.has(p.dueDate))
                .map((session) => (
                  <div
                    key={'sched-' + session.id}
                    onClick={() => handleOpenEditSession(session)}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      session.completed
                        ? 'bg-[#141419]/40 border-[#22222b] text-gray-500'
                        : 'bg-[#141419] border-[#2a2a34] text-white hover:border-[#383846]'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 truncate mr-2">
                      <button
                        onClick={(e) => handleToggleSession(session, e)}
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                          session.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-[#3a3a48]'
                        }`}
                      >
                        {session.completed && <Check className="w-3 h-3" />}
                      </button>
                      <div className="truncate">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-[9px] font-bold px-1 rounded bg-acca-red text-white">
                            {session.paperId}
                          </span>
                          <span className={`text-xs font-semibold truncate ${session.completed ? 'line-through text-gray-500' : 'text-gray-200'}`}>
                            {session.title}
                          </span>
                        </div>
                        <div className="text-[10px] text-gray-400">
                          {formatCalendarDate(session.dueDate)}
                          {session.startTime && ` • ${session.startTime}`}
                          {` • ${session.estimatedMinutes}m`}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              {studyPlans.filter((p) => !weekDatesSet.has(p.dueDate)).length === 0 && (
                <div className="text-xs text-gray-500 italic col-span-full py-2">
                  All scheduled study sessions fall within the current week.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* List View */
        <div className="bg-[#1e1e24] p-5 rounded-2xl border border-[#2a2a34] space-y-4">
          {/* List View Filter Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#2a2a34]">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedPaperFilter}
                onChange={(e) => setSelectedPaperFilter(e.target.value)}
                className="text-xs font-semibold bg-[#141419] border border-[#2a2a34] rounded-xl px-3 py-1.5 text-white outline-none"
              >
                <option value="all">All Papers</option>
                {version.papers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.id} — {p.name}
                  </option>
                ))}
              </select>

              <div className="flex items-center space-x-1 bg-[#141419] p-1 rounded-xl border border-[#2a2a34] text-xs">
                <button
                  onClick={() => setListStatusFilter('all')}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                    listStatusFilter === 'all' ? 'bg-[#25252e] text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  All ({studyPlans.length})
                </button>
                <button
                  onClick={() => setListStatusFilter('pending')}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                    listStatusFilter === 'pending' ? 'bg-[#25252e] text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Pending ({studyPlans.filter((p) => !p.completed).length})
                </button>
                <button
                  onClick={() => setListStatusFilter('completed')}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                    listStatusFilter === 'completed' ? 'bg-[#25252e] text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Completed ({studyPlans.filter((p) => p.completed).length})
                </button>
              </div>
            </div>

            <span className="text-xs text-gray-500">
              Showing {filteredListPlans.length} study sessions
            </span>
          </div>

          {/* Sessions List */}
          <div className="space-y-2">
            {filteredListPlans.map((session) => (
              <div
                key={session.id}
                onClick={() => handleOpenEditSession(session)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  session.completed
                    ? 'bg-[#141419]/50 border-[#22222b] text-gray-500'
                    : 'bg-[#141419] border-[#2a2a34] text-white hover:border-[#383846]'
                }`}
              >
                <div className="flex items-center space-x-3 min-w-0 mr-3">
                  <button
                    onClick={(e) => handleToggleSession(session, e)}
                    className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                      session.completed
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'border-[#3a3a48] hover:border-acca-red'
                    }`}
                  >
                    {session.completed && <Check className="w-3.5 h-3.5" />}
                  </button>

                  <div className="truncate">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-acca-red text-white">
                        {session.paperId}
                      </span>
                      <h4 className={`text-xs font-bold truncate ${session.completed ? 'line-through text-gray-500' : 'text-white'}`}>
                        {session.title}
                      </h4>
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5">
                      {formatCalendarDate(session.dueDate)}
                      {session.startTime && ` • ${session.startTime}${session.endTime ? ` - ${session.endTime}` : ''}`}
                      {` • ${session.estimatedMinutes} mins`}
                      {session.topic && ` • ${session.topic}`}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-1 shrink-0">
                  <button
                    onClick={(e) => handleDeleteSession(session.id, e)}
                    className="p-1.5 text-gray-500 hover:text-rose-400 rounded-lg hover:bg-[#25252e] transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {filteredListPlans.length === 0 && (
              <div className="p-8 text-center text-xs text-gray-500">
                No study sessions match your filter. Click "+ Add Study Session" above to create one.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Add or Edit Study Session */}
      {isSessionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#1e1e24] border border-[#2a2a34] rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#2a2a34]">
              <h3 className="text-base font-bold text-white">
                {editingSession ? 'Edit Study Session' : 'Schedule Study Session'}
              </h3>
              <button
                onClick={() => setIsSessionModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSession} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-1">
                  Session Title *
                </label>
                <input
                  type="text"
                  value={sessionTitle}
                  onChange={(e) => setSessionTitle(e.target.value)}
                  placeholder="e.g. IAS 36 Impairment of Assets revision"
                  className="w-full bg-[#141419] border border-[#2a2a34] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-acca-red"
                  required
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-400 block mb-1">
                    ACCA Paper
                  </label>
                  <select
                    value={sessionPaperId}
                    onChange={(e) => setSessionPaperId(e.target.value)}
                    className="w-full bg-[#141419] border border-[#2a2a34] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-acca-red"
                  >
                    {version.papers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.id} — {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-400 block mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={sessionDueDate}
                    onChange={(e) => setSessionDueDate(e.target.value)}
                    className="w-full bg-[#141419] border border-[#2a2a34] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-acca-red"
                    required
                  />
                </div>
              </div>

              {/* Time Configuration */}
              <div className="p-3 bg-[#141419] rounded-xl border border-[#2a2a34] space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-300">
                    Timed Session (Timetable Grid)
                  </label>
                  <label className="flex items-center space-x-1.5 text-xs text-gray-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isAllDay}
                      onChange={(e) => setIsAllDay(e.target.checked)}
                      className="text-acca-red focus:ring-0"
                    />
                    <span>All-Day / Unscheduled</span>
                  </label>
                </div>

                {!isAllDay && (
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-gray-400 block mb-0.5">Start Time</label>
                      <input
                        type="time"
                        value={sessionStartTime}
                        onChange={(e) => setSessionStartTime(e.target.value)}
                        className="w-full bg-[#1e1e24] border border-[#2a2a34] rounded-lg px-2 py-1.5 text-xs text-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 block mb-0.5">End Time</label>
                      <input
                        type="time"
                        value={sessionEndTime}
                        onChange={(e) => setSessionEndTime(e.target.value)}
                        className="w-full bg-[#1e1e24] border border-[#2a2a34] rounded-lg px-2 py-1.5 text-xs text-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 block mb-0.5">Minutes</label>
                      <input
                        type="number"
                        min="10"
                        step="5"
                        value={sessionMinutes}
                        onChange={(e) => setSessionMinutes(Number(e.target.value))}
                        className="w-full bg-[#1e1e24] border border-[#2a2a34] rounded-lg px-2 py-1.5 text-xs text-white outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-1">
                  Topic / Syllabus Focus (Optional)
                </label>
                <input
                  type="text"
                  value={sessionTopic}
                  onChange={(e) => setSessionTopic(e.target.value)}
                  placeholder="e.g. Section C constructed response practice"
                  className="w-full bg-[#141419] border border-[#2a2a34] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-acca-red"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-1">
                  Notes
                </label>
                <textarea
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  rows={2}
                  placeholder="Additional notes, specific question references..."
                  className="w-full bg-[#141419] border border-[#2a2a34] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-acca-red resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                {editingSession ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteSession(editingSession.id)}
                    className="text-xs text-rose-400 hover:underline flex items-center space-x-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Session</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsSessionModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-[#25252e]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-acca-red hover:bg-acca-red-hover text-white transition-all shadow-xs"
                  >
                    {editingSession ? 'Save Changes' : 'Schedule Session'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add or Edit Exam Target */}
      {isTargetModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#1e1e24] border border-[#2a2a34] rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#2a2a34]">
              <h3 className="text-base font-bold text-white">
                Configure Exam Target
              </h3>
              <button
                onClick={() => setIsTargetModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTarget} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-1">
                  Target Paper
                </label>
                <select
                  value={targetPaperId}
                  onChange={(e) => setTargetPaperId(e.target.value)}
                  className="w-full bg-[#141419] border border-[#2a2a34] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-acca-red"
                >
                  {version.papers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.id} — {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-1">
                  Official Exam Date
                </label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full bg-[#141419] border border-[#2a2a34] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-acca-red"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-400 block mb-1">
                    Target Score (%)
                  </label>
                  <input
                    type="number"
                    min="50"
                    max="100"
                    value={targetScore}
                    onChange={(e) => setTargetScore(Number(e.target.value))}
                    className="w-full bg-[#141419] border border-[#2a2a34] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-acca-red"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-400 block mb-1">
                    Weekly Study Hours
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={weeklyHoursGoal}
                    onChange={(e) => setWeeklyHoursGoal(Number(e.target.value))}
                    className="w-full bg-[#141419] border border-[#2a2a34] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-acca-red"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-1">
                  Notes
                </label>
                <textarea
                  value={targetNotes}
                  onChange={(e) => setTargetNotes(e.target.value)}
                  rows={2}
                  placeholder="Exam sitting (e.g. December 2026), goals..."
                  className="w-full bg-[#141419] border border-[#2a2a34] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-acca-red resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                {target?.nextExamDate ? (
                  <button
                    type="button"
                    onClick={handleRemoveTarget}
                    className="text-xs text-rose-400 hover:underline"
                  >
                    Remove Target Date
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsTargetModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-[#25252e]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-acca-red hover:bg-acca-red-hover text-white transition-all shadow-xs"
                  >
                    Save Target
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
