import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Shield,
  FileText,
  Table2,
  TrendingUp,
  Calendar,
  Bell,
  ExternalLink,
  BookOpen,
  User,
  GraduationCap,
  Globe,
  HelpCircle,
  FolderOpen
} from 'lucide-react';
import { db } from '../../db';
import { QualificationVersion, StudentTarget, StudyPlanItem } from '../../types';

interface FirstLaunchWizardProps {
  version: QualificationVersion;
  onFinish: () => void;
  onOpenStudyMaterials?: () => void;
}

export const FirstLaunchWizard: React.FC<FirstLaunchWizardProps> = ({
  version,
  onFinish,
  onOpenStudyMaterials,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Screen 2: Profile state
  const [displayName, setDisplayName] = useState<string>(() => {
    return localStorage.getItem('catchy_student_name') || '';
  });
  const [studyStage, setStudyStage] = useState<string>(() => {
    return localStorage.getItem('catchy_study_stage') || 'applied_skills';
  });
  const [selectedPapers, setSelectedPapers] = useState<string[]>(() => {
    const saved = localStorage.getItem('catchy_selected_papers');
    return saved ? JSON.parse(saved) : ['FR'];
  });
  const [countryRegion, setCountryRegion] = useState<string>(() => {
    return localStorage.getItem('catchy_country_region') || 'India';
  });

  // Screen 3: Exam Planner state
  const [nextPaperId, setNextPaperId] = useState<string>('FR');
  const [intendedExamDate, setIntendedExamDate] = useState<string>('2026-12-07');
  const [examSession, setExamSession] = useState<string>('December 2026');
  const [targetScore, setTargetScore] = useState<number>(65);
  const [weeklyStudyHours, setWeeklyStudyHours] = useState<number>(15);

  const totalSteps = 8;

  // Toggle paper selection
  const handleTogglePaper = (paperId: string) => {
    if (selectedPapers.includes(paperId)) {
      if (selectedPapers.length > 1) {
        setSelectedPapers(selectedPapers.filter((p) => p !== paperId));
      }
    } else {
      setSelectedPapers([...selectedPapers, paperId]);
    }
  };

  // Complete and persist setup
  const handleCompleteSetup = async () => {
    try {
      // 1. Persist profile info to localStorage
      localStorage.setItem('catchy_onboarding_completed', 'true');
      localStorage.setItem('catchy_student_name', displayName.trim());
      localStorage.setItem('catchy_study_stage', studyStage);
      localStorage.setItem('catchy_selected_papers', JSON.stringify(selectedPapers));
      localStorage.setItem('catchy_country_region', countryRegion);

      // 2. Persist Target to IndexedDB
      const existingTarget = await db.targets.toCollection().first();
      const updatedTarget: StudentTarget = {
        id: existingTarget?.id || 'target-primary',
        paperId: nextPaperId,
        nextExamPaperId: nextPaperId,
        examDate: intendedExamDate || undefined,
        nextExamDate: intendedExamDate || undefined,
        sessionLabel: examSession,
        targetScore: targetScore,
        weeklyStudyHours: weeklyStudyHours,
        notes: `Configured via Setup Wizard for ${displayName || 'Student'}`,
        updatedAt: new Date().toISOString(),
      };
      await db.targets.put(updatedTarget);

      // 3. If exam date is provided, create a study plan milestone
      if (intendedExamDate) {
        const planItem: StudyPlanItem = {
          id: 'plan-target-' + Date.now(),
          title: `Intended Exam Sitting: ${nextPaperId} (${examSession})`,
          paperId: nextPaperId,
          dueDate: intendedExamDate,
          completed: false,
          notes: `Target Score: ${targetScore}% · Planned weekly study: ${weeklyStudyHours} hrs`,
          createdAt: new Date().toISOString(),
        };
        await db.studyPlans.put(planItem);
      }
    } catch (e) {
      console.error('Error saving onboarding target:', e);
    }

    onFinish();
  };

  const handleSkipSetup = () => {
    localStorage.setItem('catchy_onboarding_completed', 'true');
    onFinish();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0d0d12]/95 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-3xl bg-[#16161d] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header with Step Progress */}
        <div className="px-6 py-4 border-b border-gray-800 bg-[#121217] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="w-2.5 h-2.5 rounded-full bg-acca-red" />
            <h1 className="text-sm font-semibold text-white tracking-wide">
              Catchy ACCA <span className="text-gray-400 font-normal">· Workspace Setup</span>
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-xs font-mono text-gray-400">
              Step {currentStep} of {totalSteps}
            </span>
            <button
              onClick={handleSkipSetup}
              className="text-xs text-gray-400 hover:text-white transition-colors"
            >
              Skip setup
            </button>
          </div>
        </div>

        {/* Progress Bar Indicator */}
        <div className="w-full bg-gray-800 h-1">
          <div
            className="bg-acca-red h-1 transition-all duration-300 ease-out"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>

        {/* Wizard Step Body */}
        <div className="p-6 sm:p-8 flex-1 overflow-y-auto space-y-6">
          {/* ==================== SCREEN 1: WELCOME ==================== */}
          {currentStep === 1 && (
            <div className="space-y-6 text-center sm:text-left">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-red-950/40 text-acca-red border border-red-800/50 mb-2">
                <Sparkles className="w-6 h-6" />
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  Welcome to Catchy ACCA
                </h2>
                <p className="text-sm text-gray-300 mt-2 leading-relaxed">
                  Your personal ACCA study workspace. Plan exams, organise your study materials,
                  practise answers and track your preparation, all from your own computer.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
                <div className="bg-[#1a1a23] border border-gray-800 p-4 rounded-xl space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-gray-800/80 flex items-center justify-center text-emerald-400">
                    <Shield className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-bold text-white">No Account Required</h3>
                  <p className="text-xs text-gray-400 leading-normal">
                    Zero signups or logins. Launch and start studying immediately.
                  </p>
                </div>

                <div className="bg-[#1a1a23] border border-gray-800 p-4 rounded-xl space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-gray-800/80 flex items-center justify-center text-blue-400">
                    <User className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-bold text-white">100% Local-First</h3>
                  <p className="text-xs text-gray-400 leading-normal">
                    All study notes, mock answers, and plans stay stored securely on your device.
                  </p>
                </div>

                <div className="bg-[#1a1a23] border border-gray-800 p-4 rounded-xl space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-gray-800/80 flex items-center justify-center text-purple-400">
                    <Globe className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-bold text-white">Offline Operational</h3>
                  <p className="text-xs text-gray-400 leading-normal">
                    Spreadsheet, Word editor, and notes work with zero internet connection.
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-gray-900/60 border border-gray-800/80 rounded-xl text-xs text-gray-400 flex items-start space-x-2.5">
                <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  Internet access is only needed for retrieving official ACCA announcements or
                  opening external ACCA portal links in your browser.
                </span>
              </div>
            </div>
          )}

          {/* ==================== SCREEN 2: STUDENT PROFILE ==================== */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white">Personalise Your Workspace</h2>
                <p className="text-xs text-gray-400 mt-1">
                  Optional details to tailor syllabus chapter tracking and deadline reminders to your stage.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                    Preferred Display Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Alex"
                    className="w-full bg-[#121217] border border-gray-700 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-acca-red"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                    Current Study Stage
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {[
                      { id: 'applied_knowledge', label: 'Applied Knowledge', sub: 'BT, MA, FA' },
                      { id: 'applied_skills', label: 'Applied Skills', sub: 'LW, PM, TX, FR, AA, FM' },
                      { id: 'strategic_professional', label: 'Strategic Professional', sub: 'SBL, SBR & Options' },
                    ].map((stage) => (
                      <button
                        key={stage.id}
                        type="button"
                        onClick={() => setStudyStage(stage.id)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          studyStage === stage.id
                            ? 'bg-red-950/30 border-acca-red text-white'
                            : 'bg-[#121217] border-gray-800 text-gray-400 hover:border-gray-700'
                        }`}
                      >
                        <div className="text-xs font-bold text-white">{stage.label}</div>
                        <div className="text-[11px] text-gray-400 mt-0.5">{stage.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                    Papers Currently Preparing (Select all that apply)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {version.papers.map((p) => {
                      const isSelected = selectedPapers.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleTogglePaper(p.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                            isSelected
                              ? 'bg-acca-red border-acca-red text-white font-bold'
                              : 'bg-[#121217] border-gray-800 text-gray-300 hover:border-gray-700'
                          }`}
                        >
                          {p.id}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                    Region / Country (For localized fee schedules)
                  </label>
                  <select
                    value={countryRegion}
                    onChange={(e) => setCountryRegion(e.target.value)}
                    className="w-full bg-[#121217] border border-gray-700 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-acca-red"
                  >
                    <option value="India">India (£134 Annual Subscription tier)</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="Malaysia">Malaysia</option>
                    <option value="Pakistan">Pakistan</option>
                    <option value="Singapore">Singapore</option>
                    <option value="Global">Other / Global</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-gray-900/40 border border-gray-800 rounded-lg text-xs text-gray-400 flex items-center space-x-2">
                <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Catchy ACCA never requests or stores MyACCA login credentials.</span>
              </div>
            </div>
          )}

          {/* ==================== SCREEN 3: EXAM PLANNER ==================== */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white">Establish Your Next Exam Target</h2>
                <p className="text-xs text-gray-400 mt-1">
                  Set your upcoming examination target to activate countdown timers and study milestones.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                    Target Paper
                  </label>
                  <select
                    value={nextPaperId}
                    onChange={(e) => setNextPaperId(e.target.value)}
                    className="w-full bg-[#121217] border border-gray-700 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-acca-red"
                  >
                    {version.papers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} - {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                    Exam Session
                  </label>
                  <select
                    value={examSession}
                    onChange={(e) => setExamSession(e.target.value)}
                    className="w-full bg-[#121217] border border-gray-700 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-acca-red"
                  >
                    <option value="December 2026">December 2026 (7–11 Dec 2026)</option>
                    <option value="March 2027">March 2027 (1–5 Mar 2027)</option>
                    <option value="June 2027">June 2027</option>
                    <option value="September 2027">September 2027</option>
                    <option value="On-Demand CBE">On-Demand CBE (Flexible)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                    Intended Exam Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={intendedExamDate}
                    onChange={(e) => setIntendedExamDate(e.target.value)}
                    className="w-full bg-[#121217] border border-gray-700 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-acca-red"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                    Target Score (%)
                  </label>
                  <input
                    type="number"
                    min="50"
                    max="100"
                    value={targetScore}
                    onChange={(e) => setTargetScore(Number(e.target.value))}
                    className="w-full bg-[#121217] border border-gray-700 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-acca-red"
                  />
                </div>
              </div>

              <div className="p-3.5 bg-gray-900/60 border border-gray-800 rounded-xl text-xs text-gray-400 space-y-1">
                <p className="text-gray-300 font-semibold">Important clarification:</p>
                <p>
                  This date represents your personal study target. Entering a date here does not
                  automatically book an exam with ACCA. Official exam registration must be completed via MyACCA.
                </p>
              </div>
            </div>
          )}

          {/* ==================== SCREEN 4: STUDY MATERIALS ==================== */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white">Your Study Materials Library</h2>
                <p className="text-xs text-gray-400 mt-1">
                  Catchy ACCA provides a local document manager for your own approved PDFs and study notes.
                </p>
              </div>

              <div className="space-y-3.5">
                <div className="p-4 bg-[#121217] border border-gray-800 rounded-xl space-y-2">
                  <div className="flex items-center space-x-2 text-white font-semibold text-sm">
                    <BookOpen className="w-4 h-4 text-acca-red" />
                    <span>Supported Document Formats</span>
                  </div>
                  <ul className="text-xs text-gray-400 list-disc pl-5 space-y-1">
                    <li>Standard PDF documents (.pdf) up to 4 concurrent shared study documents.</li>
                    <li>Built-in split-screen view: Read your PDF alongside Excel or Word.</li>
                    <li>Persistent annotations, page bookmarks, and text highlighting saved to local storage.</li>
                  </ul>
                </div>

                <div className="p-4 bg-gray-900/40 border border-amber-900/30 rounded-xl text-xs text-gray-400 space-y-1.5">
                  <div className="text-amber-400 font-bold flex items-center space-x-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    <span>Copyright & Materials Policy</span>
                  </div>
                  <p>
                    Catchy ACCA does not bundle proprietary exam kits (Kaplan, BPP) without permission.
                    You can import your own licensed PDFs, tutor slides, or official notes at any time.
                  </p>
                </div>
              </div>

              {onOpenStudyMaterials && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      onOpenStudyMaterials();
                      onFinish();
                    }}
                    className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-xs font-semibold transition-colors"
                  >
                    <FolderOpen className="w-4 h-4 text-acca-red" />
                    <span>Open Study Materials Importer Now</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ==================== SCREEN 5: STUDY WORKFLOWS ==================== */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white">Dedicated Study Workflows</h2>
                <p className="text-xs text-gray-400 mt-1">
                  Everything you need to master calculation and narrative requirements in one unified desktop app.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 bg-[#121217] border border-gray-800 rounded-xl space-y-1.5">
                  <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold">
                    <Table2 className="w-4 h-4" />
                    <span>Excel Workspace</span>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Full-featured spreadsheet with FortuneSheet engine. Practise consolidation workings,
                    ratios, and NPV tables with keyboard formula navigation.
                  </p>
                </div>

                <div className="p-3.5 bg-[#121217] border border-gray-800 rounded-xl space-y-1.5">
                  <div className="flex items-center space-x-2 text-blue-400 text-xs font-bold">
                    <FileText className="w-4 h-4" />
                    <span>Word Editor</span>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    CBE-styled document editor. Draft narrative essays, audit risk responses, and
                    strategic memos with real-time non-freezing word and character counters.
                  </p>
                </div>

                <div className="p-3.5 bg-[#121217] border border-gray-800 rounded-xl space-y-1.5">
                  <div className="flex items-center space-x-2 text-purple-400 text-xs font-bold">
                    <TrendingUp className="w-4 h-4" />
                    <span>Progress Tracker</span>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Track syllabus chapter mastery across all ACCA papers. Mark chapters as Not Started,
                    In Progress, or Mastered.
                  </p>
                </div>

                <div className="p-3.5 bg-[#121217] border border-gray-800 rounded-xl space-y-1.5">
                  <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold">
                    <Calendar className="w-4 h-4" />
                    <span>Exam Planner</span>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Monitor exam targets, study milestones, and countdown timers to keep your revision on schedule.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ==================== SCREEN 6: OFFICIAL RESOURCES ==================== */}
          {currentStep === 6 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white">Official ACCA Resource Links</h2>
                <p className="text-xs text-gray-400 mt-1">
                  Direct quick-launch shortcuts to official portals. These links open in your system default browser.
                </p>
              </div>

              <div className="space-y-2.5">
                {[
                  {
                    name: 'MyACCA Portal',
                    url: 'https://accaportal.accaglobal.com/',
                    desc: 'Official exam entry, results release, and annual subscription fee payments.',
                  },
                  {
                    name: 'ACCA Study Hub',
                    url: 'https://studymaterials.accaglobal.com/account/learning-hub/my-learning/dashboard',
                    desc: 'Official digital learning platform, quizzes, and technical articles.',
                  },
                  {
                    name: 'ACCA Global Website',
                    url: 'https://www.accaglobal.com/',
                    desc: 'Syllabus specifications, past papers, examiner reports, and qualification updates.',
                  },
                  {
                    name: 'ACCA Reddit Community',
                    url: 'https://www.reddit.com/r/ACCA/',
                    desc: 'Student peer discussions, exam feedback, and study group tips.',
                  },
                ].map((res) => (
                  <div
                    key={res.name}
                    className="p-3.5 bg-[#121217] border border-gray-800 rounded-xl flex items-center justify-between"
                  >
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-white">{res.name}</div>
                      <div className="text-[11px] text-gray-400">{res.desc}</div>
                    </div>
                    <a
                      href={res.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-400 hover:text-acca-red rounded-lg transition-colors"
                      title={`Open ${res.name}`}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-gray-500">
                Note: Official ACCA portals require your own MyACCA login credentials entered securely in your web browser.
              </p>
            </div>
          )}

          {/* ==================== SCREEN 7: ACCA NEWS & REMINDERS ==================== */}
          {currentStep === 7 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white">Verified ACCA Deadlines & News</h2>
                <p className="text-xs text-gray-400 mt-1">
                  Stay updated with official deadlines, fee timetables, and announcements.
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 bg-[#121217] border border-gray-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">December 2026 Exam Entry</span>
                    <span className="text-[10px] px-2 py-0.5 bg-red-950/60 text-red-400 border border-red-800/40 rounded-full font-mono">
                      23:59 UK Time
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    Standard entry closes 2 Nov 2026. Late entry closes 9 Nov 2026.
                  </p>
                </div>

                <div className="p-3.5 bg-[#121217] border border-gray-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">2027 Student Annual Subscription</span>
                    <span className="text-[10px] px-2 py-0.5 bg-blue-950/60 text-blue-400 border border-blue-800/40 rounded-full font-mono">
                      £134 (India)
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    Due by 1 January 2027. Regionally calibrated fees are verified against official ACCA fee schedules.
                  </p>
                </div>

                <div className="p-3.5 bg-gray-900/60 border border-gray-800 rounded-xl text-xs text-gray-400 flex items-start space-x-2.5">
                  <Bell className="w-4 h-4 text-acca-red shrink-0 mt-0.5" />
                  <span>
                    The ACCA News tab operates local-first: verified schedules are stored locally so you
                    never miss a deadline even without an active internet connection.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ==================== SCREEN 8: COMPLETION ==================== */}
          {currentStep === 8 && (
            <div className="space-y-6 text-center sm:text-left">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-950/40 text-emerald-400 border border-emerald-800/50 mb-2">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  Setup Complete! Your Workspace is Ready
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Here is a summary of your workspace configuration:
                </p>
              </div>

              <div className="bg-[#121217] border border-gray-800 rounded-xl p-4 text-xs space-y-2.5">
                <div className="flex justify-between">
                  <span className="text-gray-400">Student:</span>
                  <span className="font-semibold text-white">{displayName || 'Default Profile'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Target Paper:</span>
                  <span className="font-semibold text-acca-red font-mono">{nextPaperId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Target Session:</span>
                  <span className="font-semibold text-white">{examSession}</span>
                </div>
                {intendedExamDate && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Intended Date:</span>
                    <span className="font-semibold text-white font-mono">{intendedExamDate}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-400">Region:</span>
                  <span className="font-semibold text-white">{countryRegion}</span>
                </div>
                <div className="flex justify-between border-t border-gray-800 pt-2">
                  <span className="text-gray-400">Data Storage:</span>
                  <span className="font-semibold text-emerald-400">100% Local (IndexedDB)</span>
                </div>
              </div>

              <p className="text-xs text-gray-500">
                You can revisit or update these details at any time in Settings &gt; Setup Wizard.
              </p>
            </div>
          )}
        </div>

        {/* Footer Navigation Buttons */}
        <div className="px-6 py-4 border-t border-gray-800 bg-[#121217] flex items-center justify-between">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {currentStep < totalSteps ? (
            <button
              type="button"
              onClick={() => setCurrentStep((s) => Math.min(totalSteps, s + 1))}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-lg text-xs font-bold text-white bg-acca-red hover:bg-red-700 transition-colors shadow-lg shadow-red-900/30"
            >
              <span>{currentStep === 1 ? 'Get Started' : 'Continue'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCompleteSetup}
              className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-900/30"
            >
              <span>Finish setup and open Catchy ACCA</span>
              <CheckCircle2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
