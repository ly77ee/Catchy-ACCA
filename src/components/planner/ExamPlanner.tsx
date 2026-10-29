import React, { useState } from 'react';
import {
  QualificationVersion,
  StudyPlanItem,
  StudentTarget,
  QuestionRecord,
  StudyMaterial,
} from '../../types';
import { db, logActivity } from '../../db';
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

  // Task creation form state
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPaperId, setTaskPaperId] = useState(target?.nextExamPaperId || 'FR');
  const [taskDueDate, setTaskDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [taskMinutes, setTaskMinutes] = useState(45);
  const [taskQuestionId, setTaskQuestionId] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];

  // Filter tasks
  const filteredPlans = studyPlans.filter((item) => {
    if (selectedPaperFilter !== 'all' && item.paperId !== selectedPaperFilter) return false;
    if (activeView === 'today') return item.dueDate === todayStr;
    if (activeView === 'upcoming') return item.dueDate > todayStr;
    return true;
  });

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
    await logActivity('Task Scheduled', `${newTask.title} for ${newTask.dueDate}`, 'plan');
    setTaskTitle('');
    setIsAddingTask(false);
  };

  // Completion metrics
  const totalTasks = studyPlans.length;
  const completedTasks = studyPlans.filter((p) => p.completed).length;
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Card */}
      <div className="bg-[#1e1e24] rounded-2xl border border-[#2a2a34] p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-acca-red/10 text-acca-red flex items-center justify-center border border-acca-red/20">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-tight">
                  ACCA Exam Planner & Task Schedule
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#141419] text-gray-400 border border-[#2a2a34]">
                  Real Study Tasks
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Organize preparation around your target exam dates, question practice quotas, and revision sessions
              </p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => setIsAddingTask(true)}
          className="px-4 py-2 bg-acca-red hover:bg-acca-red-dark text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Add Study Task</span>
        </button>
      </div>

      {/* Target Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Next Exam Pacing */}
        <div className="bg-[#1e1e24] rounded-2xl border border-[#2a2a34] p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-acca-red" />
              <span>Next Exam Target</span>
            </span>
            <span className="text-white font-bold">{target?.nextExamPaperId || 'FR'}</span>
          </div>
          <div className="text-2xl font-black text-white">
            {target?.nextExamDate ? new Date(target.nextExamDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'No exam date set'}
          </div>
          <p className="text-xs text-gray-400">
            Target Score: {target?.targetScore || 70}% · Study Target: {target?.weeklyStudyHours || 15} hrs/wk
          </p>
        </div>

        {/* Task Completion Progress */}
        <div className="bg-[#1e1e24] rounded-2xl border border-[#2a2a34] p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span className="font-semibold uppercase tracking-wider">Plan Completion</span>
            <span className="text-white font-bold">{completionPercentage}%</span>
          </div>
          <div className="text-2xl font-black text-white">
            {completedTasks} <span className="text-xs text-gray-500 font-normal">/ {totalTasks} Tasks Done</span>
          </div>
          <div className="w-full bg-[#141419] h-2 rounded-full overflow-hidden border border-[#2a2a34]">
            <div
              className="bg-acca-red h-full rounded-full transition-all duration-300"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>

        {/* Today's Focus */}
        <div className="bg-[#1e1e24] rounded-2xl border border-[#2a2a34] p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span className="font-semibold uppercase tracking-wider">Scheduled for Today</span>
            <span className="text-xs text-gray-400">{todayStr}</span>
          </div>
          <div className="text-2xl font-black text-white">
            {studyPlans.filter((p) => p.dueDate === todayStr && !p.completed).length}{' '}
            <span className="text-xs text-gray-500 font-normal">Tasks Pending</span>
          </div>
          <p className="text-xs text-gray-400">
            Completed tasks automatically sync with your Home Dashboard Today's Plan.
          </p>
        </div>
      </div>

      {/* Add Task Modal / Drawer */}
      {isAddingTask && (
        <div className="bg-[#1e1e24] border border-[#2a2a34] rounded-2xl p-6 shadow-xl space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-[#2a2a34]">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-acca-red" />
              <span>Schedule New Study Task</span>
            </h2>
            <button
              onClick={() => setIsAddingTask(false)}
              className="text-xs text-gray-400 hover:text-white"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleCreateTask} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2 space-y-1">
              <label className="text-xs font-semibold text-gray-400">Task Title / Objective</label>
              <input
                type="text"
                required
                placeholder="e.g. Practise Section C Consolidation Question 1..."
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                className="w-full bg-[#141419] border border-[#2a2a34] rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-acca-red"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-400">Target Paper</label>
              <select
                value={taskPaperId}
                onChange={(e) => setTaskPaperId(e.target.value)}
                className="w-full bg-[#141419] border border-[#2a2a34] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-acca-red"
              >
                {version.papers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.id} — {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-400">Due Date</label>
              <input
                type="date"
                required
                value={taskDueDate}
                onChange={(e) => setTaskDueDate(e.target.value)}
                className="w-full bg-[#141419] border border-[#2a2a34] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-acca-red"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-400">Duration (Minutes)</label>
              <input
                type="number"
                min="10"
                step="5"
                value={taskMinutes}
                onChange={(e) => setTaskMinutes(Number(e.target.value))}
                className="w-full bg-[#141419] border border-[#2a2a34] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-acca-red"
              />
            </div>

            <div className="md:col-span-3 flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddingTask(false)}
                className="px-4 py-2 border border-[#2a2a34] hover:bg-[#141419] text-gray-400 hover:text-white rounded-xl text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-acca-red hover:bg-acca-red-dark text-white rounded-xl text-xs font-bold"
              >
                Save Task
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter and View Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveView('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeView === 'all'
                ? 'bg-acca-red text-white'
                : 'bg-[#1e1e24] text-gray-400 hover:text-white border border-[#2a2a34]'
            }`}
          >
            All Tasks ({studyPlans.length})
          </button>
          <button
            onClick={() => setActiveView('today')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeView === 'today'
                ? 'bg-acca-red text-white'
                : 'bg-[#1e1e24] text-gray-400 hover:text-white border border-[#2a2a34]'
            }`}
          >
            Today's Plan ({studyPlans.filter((p) => p.dueDate === todayStr).length})
          </button>
          <button
            onClick={() => setActiveView('upcoming')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeView === 'upcoming'
                ? 'bg-acca-red text-white'
                : 'bg-[#1e1e24] text-gray-400 hover:text-white border border-[#2a2a34]'
            }`}
          >
            Upcoming
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-gray-500" />
          <span className="text-gray-400">Filter Paper:</span>
          <select
            value={selectedPaperFilter}
            onChange={(e) => setSelectedPaperFilter(e.target.value)}
            className="bg-[#1e1e24] border border-[#2a2a34] rounded-lg px-2.5 py-1 text-xs text-white outline-none cursor-pointer"
          >
            <option value="all">All Papers</option>
            {version.papers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.id}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {filteredPlans.length === 0 ? (
          <div className="text-center py-16 bg-[#1e1e24] rounded-2xl border border-[#2a2a34] p-6 space-y-3">
            <CalendarIcon className="w-10 h-10 text-gray-600 mx-auto" />
            <h3 className="font-bold text-gray-300 text-sm">No Scheduled Study Tasks</h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              Plan out your study calendar to stay on track for your upcoming exam session.
            </p>
            <button
              onClick={() => setIsAddingTask(true)}
              className="px-4 py-2 bg-acca-red text-white text-xs font-bold rounded-xl"
            >
              Add First Task
            </button>
          </div>
        ) : (
          filteredPlans.map((item) => (
            <div
              key={item.id}
              className={`p-4 rounded-xl border transition-all flex items-center justify-between gap-4 ${
                item.completed
                  ? 'bg-[#141419]/70 border-[#2a2a34] opacity-60'
                  : 'bg-[#1e1e24] border-[#2a2a34] hover:border-[#3a3a46]'
              }`}
            >
              <div className="flex items-center gap-3.5 flex-1 min-w-0">
                <button
                  onClick={() => handleToggleTask(item.id, item.completed)}
                  className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors shrink-0 ${
                    item.completed
                      ? 'bg-acca-red border-acca-red text-white'
                      : 'border-gray-500 hover:border-acca-red'
                  }`}
                >
                  {item.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </button>

                <div className="space-y-0.5 truncate">
                  <div
                    className={`text-xs font-medium truncate ${
                      item.completed ? 'line-through text-gray-500' : 'text-white'
                    }`}
                  >
                    {item.title}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-gray-500">
                    {item.paperId && (
                      <span className="font-bold px-1.5 py-0.5 rounded bg-[#141419] text-gray-400 border border-[#2a2a34]">
                        {item.paperId}
                      </span>
                    )}
                    <span>Due: {item.dueDate}</span>
                    {item.estimatedMinutes && <span>· {item.estimatedMinutes} mins</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleDeleteTask(item.id)}
                  className="p-1.5 text-gray-500 hover:text-red-400 rounded-lg transition-colors"
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
  );
};
