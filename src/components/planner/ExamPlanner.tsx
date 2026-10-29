import React, { useState } from 'react';
import {
  QualificationVersion,
  StudyPlanItem,
  StudentTarget,
  QuestionRecord,
  StudyMaterial,
} from '../../types';
import { db, logActivity } from '../../db';
import { calculateDaysRemaining, formatCalendarDate } from '../../utils/dateUtils';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  Target,
  Filter,
  Check,
  ArrowRight,
  BookOpen,
  FileEdit,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Edit2
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

export const ExamPlanner: React.FC<ExamPlannerProps> = ({
  version,
  target,
  studyPlans,
  allQuestions,
  studyMaterials,
  onOpenQuestionInWriter,
  onOpenMaterial,
}) => {
  const [selectedPaperFilter, setSelectedPaperFilter] = useState<string>('all');
  const [activeView, setActiveView] = useState<'all' | 'today' | 'upcoming'>('all');

  // Exam Target Config Modal State
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [targetPaperId, setTargetPaperId] = useState(target?.nextExamPaperId || 'FR');
  const [targetDate, setTargetDate] = useState(target?.nextExamDate || '');
  const [targetScore, setTargetScore] = useState(target?.targetScore || 70);
  const [weeklyHours, setWeeklyHours] = useState(target?.weeklyStudyHours || 15);
  const [targetNotes, setTargetNotes] = useState(target?.notes || '');

  // Task creation form state
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPaperId, setTaskPaperId] = useState(target?.nextExamPaperId || 'FR');
  const [taskDueDate, setTaskDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [taskMinutes, setTaskMinutes] = useState(45);

  const todayStr = new Date().toISOString().split('T')[0];
  const daysRemaining = calculateDaysRemaining(target?.nextExamDate);

  // Filter tasks
  const filteredPlans = studyPlans.filter((item) => {
    if (selectedPaperFilter !== 'all' && item.paperId !== selectedPaperFilter) return false;
    if (activeView === 'today') return item.dueDate === todayStr;
    if (activeView === 'upcoming') return item.dueDate > todayStr;
    return true;
  });

  const totalTasks = studyPlans.length;
  const completedTasks = studyPlans.filter(p => p.completed).length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Toggle complete
  const handleToggleTask = async (id: string, current: boolean) => {
    const item = studyPlans.find((p) => p.id === id);
    if (!item) return;
    const updated: StudyPlanItem = {
      ...item,
      completed: !current,
    };
    await db.studyPlans.put(updated);
    await logActivity(
      updated.completed ? 'Task Completed' : 'Task Reopened',
      item.title,
      'plan'
    );
  };

  // Reorder Tasks (Move Up/Down)
  const handleMoveTask = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= filteredPlans.length) return;

    const currentItem = filteredPlans[index];
    const targetItem = filteredPlans[targetIndex];

    // Swap creation timestamps to enforce ordering in IndexedDB queries
    const currentCreated = currentItem.createdAt;
    const targetCreated = targetItem.createdAt;

    await db.studyPlans.update(currentItem.id, { createdAt: targetCreated });
    await db.studyPlans.update(targetItem.id, { createdAt: currentCreated });
  };

  // Delete task
  const handleDeleteTask = async (id: string) => {
    await db.studyPlans.delete(id);
    await logActivity('Task Deleted', `Removed planner task`, 'plan');
  };

  // Create new planner task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    const newTask: StudyPlanItem = {
      id: 'plan-' + Date.now(),
      title: taskTitle.trim(),
      paperId: taskPaperId,
      estimatedMinutes: Number(taskMinutes) || 45,
      completed: false,
      dueDate: taskDueDate,
      createdAt: new Date().toISOString(),
    };

    await db.studyPlans.put(newTask);
    await logActivity('Study Session Scheduled', `${newTask.title} (${newTask.paperId})`, 'plan');

    setTaskTitle('');
    setIsAddingTask(false);
  };

  // Save Target Exam Date & Study Goals
  const handleSaveTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    const updatedTarget: StudentTarget = {
      id: target?.id || 'default',
      nextExamPaperId: targetPaperId,
      nextExamDate: targetDate.trim() || undefined,
      targetScore: Number(targetScore) || 70,
      weeklyStudyHours: Number(weeklyHours) || 15,
      notes: targetNotes.trim()
    };

    await db.targets.put(updatedTarget);
    await logActivity(
      'Exam Date Updated',
      `Next exam set to ${targetPaperId} on ${targetDate || 'Unscheduled'}.`,
      'plan'
    );
    setIsEditingTarget(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Target Header */}
      <div className="bg-[#1e1e24] p-6 rounded-2xl border border-[#2a2a34] flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-acca-red bg-acca-red/10 border border-acca-red/20 px-2.5 py-0.5 rounded-full">
              Exam Planner
            </span>
            <span className="text-xs text-gray-400">
              {version.name}
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-white">
            ACCA Exam Planner & Task Schedule
          </h1>
          <p className="text-xs text-gray-400 max-w-xl">
            Configure your official exam session dates and plan daily study sessions to ensure full syllabus coverage.
          </p>
        </div>

        {/* Next Exam Pill */}
        <div className="bg-[#141419] p-4 rounded-xl border border-[#2a2a34] flex items-center space-x-5 min-w-[240px]">
          <div>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
              Target Paper
            </span>
            <span className="text-xl font-black text-white">
              {target?.nextExamPaperId || 'FR'}
            </span>
            <span className="text-[11px] text-gray-400 block">
              {formatCalendarDate(target?.nextExamDate)}
            </span>
          </div>

          <div className="border-l border-[#2a2a34] pl-5 text-right flex-1">
            {daysRemaining !== null ? (
              <>
                <span
                  className={`text-2xl font-black block ${
                    daysRemaining <= 14 ? 'text-acca-red' : 'text-emerald-400'
                  }`}
                >
                  {daysRemaining > 0 ? daysRemaining : 0}
                </span>
                <span className="text-[10px] font-bold text-gray-500 uppercase block">
                  Days Left
                </span>
              </>
            ) : (
              <span className="text-xs font-semibold text-amber-400 block">
                No date set
              </span>
            )}

            <button
              onClick={() => setIsEditingTarget(true)}
              className="text-[11px] text-acca-red hover:underline font-bold mt-1 inline-flex items-center space-x-1"
            >
              <Edit2 className="w-3 h-3" />
              <span>{target?.nextExamDate ? 'Edit Date' : 'Set Date'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Progress & Quick Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#1e1e24] p-4 rounded-xl border border-[#2a2a34] flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-gray-400 block">Planned Sessions</span>
            <span className="text-xl font-black text-white">{totalTasks}</span>
          </div>
          <Clock className="w-5 h-5 text-gray-500" />
        </div>

        <div className="bg-[#1e1e24] p-4 rounded-xl border border-[#2a2a34] flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-gray-400 block">Completed</span>
            <span className="text-xl font-black text-emerald-400">{completedTasks}</span>
          </div>
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
        </div>

        <div className="bg-[#1e1e24] p-4 rounded-xl border border-[#2a2a34] flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-gray-400 block">Schedule Completion</span>
            <span className="text-xl font-black text-white">{progressPercent}%</span>
          </div>
          <Target className="w-5 h-5 text-acca-red" />
        </div>
      </div>

      {/* Main Task List & Controls */}
      <div className="bg-[#1e1e24] p-5 rounded-2xl border border-[#2a2a34] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#2a2a34]">
          <div className="flex items-center space-x-2">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Study Schedule ({filteredPlans.length} Tasks)
            </h2>
          </div>

          <div className="flex items-center space-x-2">
            {/* View Filter */}
            <div className="flex items-center space-x-1 bg-[#141419] p-1 rounded-xl border border-[#2a2a34] text-xs">
              <button
                onClick={() => setActiveView('all')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  activeView === 'all' ? 'bg-[#25252e] text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveView('today')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  activeView === 'today' ? 'bg-[#25252e] text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setActiveView('upcoming')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  activeView === 'upcoming' ? 'bg-[#25252e] text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Upcoming
              </button>
            </div>

            <button
              onClick={() => setIsAddingTask(true)}
              className="px-3 py-1.5 bg-acca-red hover:bg-acca-red-hover text-white rounded-xl text-xs font-bold flex items-center space-x-1 transition-all shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Session</span>
            </button>
          </div>
        </div>

        {/* Task List */}
        <div className="space-y-2">
          {filteredPlans.length > 0 ? (
            filteredPlans.map((item, index) => (
              <div
                key={item.id}
                className={`group flex items-center justify-between p-3 rounded-xl border transition-all ${
                  item.completed
                    ? 'bg-[#141419]/50 border-[#22222b] text-gray-500'
                    : 'bg-[#141419] border-[#2a2a34] text-gray-200 hover:border-[#383846]'
                }`}
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0 mr-2">
                  <button
                    type="button"
                    onClick={() => handleToggleTask(item.id, item.completed)}
                    className={`w-4 h-4 rounded flex items-center justify-center transition-colors shrink-0 ${
                      item.completed
                        ? 'bg-acca-red text-white'
                        : 'border border-gray-500 hover:border-acca-red'
                    }`}
                  >
                    {item.completed && <Check className="w-3 h-3 stroke-[3]" />}
                  </button>

                  <div className="truncate">
                    <span
                      className={`text-xs select-none block truncate ${
                        item.completed ? 'line-through text-gray-500' : 'text-gray-200'
                      }`}
                    >
                      {item.title}
                    </span>
                    <span className="text-[10px] text-gray-500 flex items-center space-x-2 mt-0.5">
                      <span>Due: {item.dueDate}</span>
                      <span>•</span>
                      <span>{item.estimatedMinutes || 45} mins</span>
                      {item.paperId && (
                        <>
                          <span>•</span>
                          <span className="text-acca-red font-semibold">{item.paperId}</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleMoveTask(index, 'up')}
                    disabled={index === 0}
                    className="p-1 text-gray-400 hover:text-white disabled:opacity-20 rounded"
                    title="Move Up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleMoveTask(index, 'down')}
                    disabled={index === filteredPlans.length - 1}
                    className="p-1 text-gray-400 hover:text-white disabled:opacity-20 rounded"
                    title="Move Down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteTask(item.id)}
                    className="p-1 text-gray-400 hover:text-rose-400 rounded"
                    title="Delete Session"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-xs text-gray-500">
              No study sessions scheduled for this view. Click "Add Session" to schedule tasks.
            </div>
          )}
        </div>
      </div>

      {/* Edit Target Exam Date Modal */}
      {isEditingTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[#1e1e24] border border-[#2a2a34] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#2a2a34]">
              <h3 className="text-base font-bold text-white">Configure Next ACCA Exam</h3>
              <button
                onClick={() => setIsEditingTarget(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

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
                <span className="text-[10px] text-gray-500 mt-1 block">
                  Date is strictly user-configured. No dates are hardcoded.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-bold mb-1">
                    Target Score (%)
                  </label>
                  <input
                    type="number"
                    min={50}
                    max={100}
                    value={targetScore}
                    onChange={e => setTargetScore(Number(e.target.value))}
                    className="w-full bg-[#141419] border border-[#2a2a34] rounded-xl px-3 py-2 text-white outline-none focus:border-acca-red font-mono"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-bold mb-1">
                    Weekly Study Hours
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={80}
                    value={weeklyHours}
                    onChange={e => setWeeklyHours(Number(e.target.value))}
                    className="w-full bg-[#141419] border border-[#2a2a34] rounded-xl px-3 py-2 text-white outline-none focus:border-acca-red font-mono"
                  />
                </div>
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
                  Save Exam Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {isAddingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[#1e1e24] border border-[#2a2a34] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#2a2a34]">
              <h3 className="text-base font-bold text-white">Schedule Study Session</h3>
              <button
                onClick={() => setIsAddingTask(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-300 font-bold mb-1">
                  Session Goal / Requirement *
                </label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={e => setTaskTitle(e.target.value)}
                  placeholder="e.g. Review IFRS 16 Leases & complete 2 Section C consolidation questions"
                  required
                  className="w-full bg-[#141419] border border-[#2a2a34] rounded-xl px-3 py-2 text-white outline-none focus:border-acca-red"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-bold mb-1">
                    ACCA Paper
                  </label>
                  <select
                    value={taskPaperId}
                    onChange={e => setTaskPaperId(e.target.value)}
                    className="w-full bg-[#141419] border border-[#2a2a34] rounded-xl px-3 py-2 text-white outline-none focus:border-acca-red"
                  >
                    {version.papers.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.id}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-300 font-bold mb-1">
                    Scheduled Date
                  </label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={e => setTaskDueDate(e.target.value)}
                    required
                    className="w-full bg-[#141419] border border-[#2a2a34] rounded-xl px-3 py-2 text-white outline-none focus:border-acca-red font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-300 font-bold mb-1">
                  Estimated Minutes
                </label>
                <input
                  type="number"
                  min={15}
                  max={240}
                  step={15}
                  value={taskMinutes}
                  onChange={e => setTaskMinutes(Number(e.target.value))}
                  className="w-full bg-[#141419] border border-[#2a2a34] rounded-xl px-3 py-2 text-white outline-none focus:border-acca-red font-mono"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#2a2a34]">
                <button
                  type="button"
                  onClick={() => setIsAddingTask(false)}
                  className="px-4 py-2 bg-[#141419] hover:bg-[#25252e] text-gray-300 rounded-xl font-semibold border border-[#2a2a34]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-acca-red hover:bg-acca-red-hover text-white rounded-xl font-bold"
                >
                  Add Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
