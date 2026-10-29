import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  QualificationVersion,
  QuestionRecord,
  StudentPaperRecord,
  ExamAttemptRecord,
  ChapterMasteryRecord,
  ChapterMasteryStatus,
  SyllabusPaper
} from '../../types';
import {
  ACCA_SYLLABUS_PAPERS,
  TOTAL_SYLLABUS_PAPERS,
  TOTAL_SYLLABUS_CHAPTERS,
  DEFAULT_MASTERY_STATUS_CONFIGS,
  getStatusConfig,
  getPaperById
} from '../../config/accaChapterSyllabus';
import { db, setChapterStatus, resetChapterStatus } from '../../db';
import {
  BookOpen,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowLeft,
  Search,
  Filter,
  Flame,
  Award,
  ChevronRight,
  RotateCcw,
  Sparkles,
  Info,
  Clock,
  Layers,
  ChevronDown
} from 'lucide-react';
import { CircularProgress } from '../common/CircularProgress';

interface RevisionAnalyticsProps {
  version: QualificationVersion;
  allQuestions?: QuestionRecord[];
  paperRecords?: StudentPaperRecord[];
  examAttempts?: ExamAttemptRecord[];
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
  onRefreshData
}) => {
  // Live query for all chapter mastery records from Dexie
  const masteryRecords = useLiveQuery<ChapterMasteryRecord[], ChapterMasteryRecord[]>(
    () => db.chapterMastery.toArray(),
    [],
    []
  );

  // Active view: null = all papers overview; string = selected paperId
  const [selectedPaperId, setSelectedPaperId] = useState<string | null>(null);

  // Search & Filter in Overview
  const [paperSearchQuery, setPaperSearchQuery] = useState('');
  const [selectedStageFilter, setSelectedStageFilter] = useState<'all' | 'Applied Knowledge' | 'Applied Skills' | 'Strategic Professional'>('all');
  const [paperSortBy, setPaperSortBy] = useState<'code' | 'name' | 'lowest_mastery' | 'most_revision' | 'highest_coverage'>('code');

  // Search & Filter in Chapter Detail
  const [chapterSearchQuery, setChapterSearchQuery] = useState('');
  const [chapterStatusFilter, setChapterStatusFilter] = useState<'all' | 'not_assessed' | 'priority' | 'positive'>('all');

  // Expand note editor for chapter id
  const [expandedNoteChapterId, setExpandedNoteChapterId] = useState<string | null>(null);
  const [noteDraftText, setNoteDraftText] = useState<string>('');

  // Map of chapter records by id
  const masteryMap = useMemo(() => {
    const map = new Map<string, ChapterMasteryRecord>();
    (masteryRecords || []).forEach(rec => {
      map.set(rec.id, rec);
    });
    return map;
  }, [masteryRecords]);

  // Overall Global Statistics
  const globalStats = useMemo(() => {
    let assessedCount = 0;
    let positiveMasteryCount = 0;
    let priorityCount = 0;
    const countsByStatus: Record<ChapterMasteryStatus, number> = {
      not_assessed: 0,
      not_studied: 0,
      needs_substantial_work: 0,
      doubtful: 0,
      needs_revision: 0,
      good: 0,
      well_understood: 0,
      excellent: 0
    };

    const priorityChapters: Array<{
      paper: SyllabusPaper;
      chapterNumber: number;
      chapterTitle: string;
      status: ChapterMasteryStatus;
      id: string;
    }> = [];

    ACCA_SYLLABUS_PAPERS.forEach(paper => {
      paper.chapters.forEach(ch => {
        const id = `${paper.id}-ch-${ch.chapterNumber}`;
        const record = masteryMap.get(id);
        const status = record?.status || 'not_assessed';
        countsByStatus[status]++;

        if (status !== 'not_assessed') {
          assessedCount++;
        }

        const config = getStatusConfig(status);
        if (config.isPositiveMastery) {
          positiveMasteryCount++;
        }
        if (config.isPriorityRevision) {
          priorityCount++;
          priorityChapters.push({
            paper,
            chapterNumber: ch.chapterNumber,
            chapterTitle: ch.title,
            status,
            id
          });
        }
      });
    });

    const coveragePct = TOTAL_SYLLABUS_CHAPTERS > 0
      ? Math.round((assessedCount / TOTAL_SYLLABUS_CHAPTERS) * 100)
      : 0;

    const masteryPct = TOTAL_SYLLABUS_CHAPTERS > 0
      ? Math.round((positiveMasteryCount / TOTAL_SYLLABUS_CHAPTERS) * 100)
      : 0;

    return {
      assessedCount,
      positiveMasteryCount,
      priorityCount,
      coveragePct,
      masteryPct,
      countsByStatus,
      priorityChapters
    };
  }, [masteryMap]);

  // Paper-level stats computation helper
  const getPaperStats = (paper: SyllabusPaper) => {
    const totalChapters = paper.chapters.length;
    let assessedCount = 0;
    let positiveCount = 0;
    let priorityCount = 0;
    const counts: Record<ChapterMasteryStatus, number> = {
      not_assessed: 0,
      not_studied: 0,
      needs_substantial_work: 0,
      doubtful: 0,
      needs_revision: 0,
      good: 0,
      well_understood: 0,
      excellent: 0
    };

    paper.chapters.forEach(ch => {
      const id = `${paper.id}-ch-${ch.chapterNumber}`;
      const rec = masteryMap.get(id);
      const st = rec?.status || 'not_assessed';
      counts[st]++;
      if (st !== 'not_assessed') assessedCount++;
      const cfg = getStatusConfig(st);
      if (cfg.isPositiveMastery) positiveCount++;
      if (cfg.isPriorityRevision) priorityCount++;
    });

    const coveragePct = totalChapters > 0 ? Math.round((assessedCount / totalChapters) * 100) : 0;
    const masteryPct = totalChapters > 0 ? Math.round((positiveCount / totalChapters) * 100) : 0;

    return {
      totalChapters,
      assessedCount,
      positiveCount,
      priorityCount,
      coveragePct,
      masteryPct,
      counts
    };
  };

  // Filtered and sorted papers for overview
  const displayedPapers = useMemo(() => {
    let list = ACCA_SYLLABUS_PAPERS.filter(paper => {
      // Stage filter
      if (selectedStageFilter !== 'all') {
        if (!paper.stageName?.startsWith(selectedStageFilter)) return false;
      }
      // Text search: matches paper code, paper name, or any chapter in it
      if (paperSearchQuery.trim()) {
        const q = paperSearchQuery.toLowerCase();
        const codeMatch = paper.code.toLowerCase().includes(q);
        const nameMatch = paper.name.toLowerCase().includes(q);
        const chMatch = paper.chapters.some(c => c.title.toLowerCase().includes(q));
        if (!codeMatch && !nameMatch && !chMatch) return false;
      }
      return true;
    });

    // Sorting
    list = [...list].sort((a, b) => {
      if (paperSortBy === 'code') {
        return a.code.localeCompare(b.code);
      }
      if (paperSortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      const statsA = getPaperStats(a);
      const statsB = getPaperStats(b);
      if (paperSortBy === 'lowest_mastery') {
        return statsA.masteryPct - statsB.masteryPct;
      }
      if (paperSortBy === 'most_revision') {
        return statsB.priorityCount - statsA.priorityCount;
      }
      if (paperSortBy === 'highest_coverage') {
        return statsB.coveragePct - statsA.coveragePct;
      }
      return 0;
    });

    return list;
  }, [paperSearchQuery, selectedStageFilter, paperSortBy, masteryMap]);

  // Selected Paper Details View
  const selectedPaper = useMemo(() => {
    if (!selectedPaperId) return null;
    return getPaperById(selectedPaperId) || null;
  }, [selectedPaperId]);

  const selectedPaperStats = useMemo(() => {
    if (!selectedPaper) return null;
    return getPaperStats(selectedPaper);
  }, [selectedPaper, masteryMap]);

  // Filtered chapters for detailed view
  const displayedChapters = useMemo(() => {
    if (!selectedPaper) return [];
    return selectedPaper.chapters.filter(ch => {
      const id = `${selectedPaper.id}-ch-${ch.chapterNumber}`;
      const rec = masteryMap.get(id);
      const st = rec?.status || 'not_assessed';
      const cfg = getStatusConfig(st);

      if (chapterSearchQuery.trim()) {
        const q = chapterSearchQuery.toLowerCase();
        const matchTitle = ch.title.toLowerCase().includes(q);
        const matchNum = ch.chapterNumber.toString().includes(q);
        if (!matchTitle && !matchNum) return false;
      }

      if (chapterStatusFilter === 'not_assessed') {
        return st === 'not_assessed';
      }
      if (chapterStatusFilter === 'priority') {
        return cfg.isPriorityRevision;
      }
      if (chapterStatusFilter === 'positive') {
        return cfg.isPositiveMastery;
      }
      return true;
    });
  }, [selectedPaper, chapterSearchQuery, chapterStatusFilter, masteryMap]);

  // Handle changing chapter status
  const handleUpdateStatus = async (
    paper: SyllabusPaper,
    chapterNumber: number,
    chapterTitle: string,
    newStatus: ChapterMasteryStatus
  ) => {
    await setChapterStatus(paper.id, chapterNumber, chapterTitle, newStatus);
  };

  // Handle saving notes for a chapter
  const handleSaveNotes = async (paperId: string, chapterNumber: number, chapterTitle: string) => {
    const id = `${paperId}-ch-${chapterNumber}`;
    const existing = masteryMap.get(id);
    const status = existing?.status || 'not_assessed';
    await setChapterStatus(paperId, chapterNumber, chapterTitle, status, noteDraftText.trim() || undefined);
    setExpandedNoteChapterId(null);
  };

  // Reset chapter status
  const handleResetStatus = async (id: string) => {
    await resetChapterStatus(id);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Header Section */}
      <div className="bg-[#1e1e24] p-5 rounded-2xl border border-[#2a2a34] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="p-2.5 rounded-xl bg-acca-red/10 border border-acca-red/20 text-acca-red">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              Progress
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-[#25252e] text-gray-300 border border-[#2a2a34]">
                Syllabus Mastery
              </span>
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Track your syllabus coverage and understanding across all {TOTAL_SYLLABUS_PAPERS} ACCA papers and {TOTAL_SYLLABUS_CHAPTERS} chapters.
            </p>
          </div>
        </div>

        {selectedPaper && (
          <button
            onClick={() => {
              setSelectedPaperId(null);
              setChapterSearchQuery('');
              setChapterStatusFilter('all');
            }}
            className="flex items-center space-x-1.5 px-3 py-2 bg-[#141419] hover:bg-[#25252e] text-gray-300 hover:text-white rounded-xl text-xs font-semibold border border-[#2a2a34] transition-all self-start sm:self-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to All Papers</span>
          </button>
        )}
      </div>

      {/* 2. Global Progress Metrics Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Papers Count */}
        <div className="bg-[#1e1e24] p-4 rounded-xl border border-[#2a2a34]">
          <div className="flex items-center justify-between text-gray-400 text-xs mb-1 font-semibold">
            <span>Syllabus Papers</span>
            <Layers className="w-3.5 h-3.5 text-gray-500" />
          </div>
          <div className="text-2xl font-black text-white">{TOTAL_SYLLABUS_PAPERS}</div>
          <div className="text-[11px] text-gray-400 mt-0.5">
            {TOTAL_SYLLABUS_CHAPTERS} total chapters
          </div>
        </div>

        {/* Assessed Syllabus Coverage */}
        <div className="bg-[#1e1e24] p-4 rounded-xl border border-[#2a2a34]">
          <div className="flex items-center justify-between text-gray-400 text-xs mb-1 font-semibold">
            <span>Syllabus Coverage</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">{globalStats.coveragePct}%</div>
          <div className="text-[11px] text-gray-400 mt-0.5" title="Assessed coverage = chapters rated other than Not assessed ÷ total chapters">
            {globalStats.assessedCount} of {TOTAL_SYLLABUS_CHAPTERS} chapters rated
          </div>
        </div>

        {/* Positive Syllabus Mastery */}
        <div className="bg-[#1e1e24] p-4 rounded-xl border border-[#2a2a34]">
          <div className="flex items-center justify-between text-gray-400 text-xs mb-1 font-semibold">
            <span>Syllabus Mastery</span>
            <Award className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-white">{globalStats.masteryPct}%</div>
          <div className="text-[11px] text-gray-400 mt-0.5">
            {globalStats.positiveMasteryCount} good, well understood, or excellent
          </div>
        </div>

        {/* Priority Revision Count */}
        <div className="bg-[#1e1e24] p-4 rounded-xl border border-[#2a2a34]">
          <div className="flex items-center justify-between text-gray-400 text-xs mb-1 font-semibold">
            <span>Priority Revision</span>
            <Flame className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">{globalStats.priorityCount}</div>
          <div className="text-[11px] text-gray-400 mt-0.5">
            Substantial work, doubtful, or revision
          </div>
        </div>

        {/* Not Assessed Count */}
        <div className="bg-[#1e1e24] p-4 rounded-xl border border-[#2a2a34] col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-gray-400 text-xs mb-1 font-semibold">
            <span>Not Assessed</span>
            <HelpCircle className="w-3.5 h-3.5 text-gray-500" />
          </div>
          <div className="text-2xl font-black text-gray-400">
            {globalStats.countsByStatus.not_assessed}
          </div>
          <div className="text-[11px] text-gray-400 mt-0.5">
            Chapters awaiting rating
          </div>
        </div>
      </div>

      {/* 3. Priority Revision Quick Access (if any priority chapters exist) */}
      {!selectedPaper && globalStats.priorityChapters.length > 0 && (
        <div className="bg-[#1e1e24] p-4 rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-transparent space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Flame className="w-4 h-4 text-amber-400" />
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                Priority Revision Focus ({globalStats.priorityChapters.length})
              </h2>
            </div>
            <span className="text-[11px] text-gray-400">
              Chapters you flagged as needing attention
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
            {globalStats.priorityChapters.map(item => {
              const cfg = getStatusConfig(item.status);
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    setSelectedPaperId(item.paper.id);
                    setChapterSearchQuery(item.chapterTitle);
                  }}
                  className="p-2.5 rounded-xl bg-[#141419] border border-[#2a2a34] hover:border-amber-500/40 cursor-pointer flex items-center justify-between transition-all group"
                >
                  <div className="min-w-0 mr-2 truncate">
                    <div className="flex items-center space-x-1.5 mb-0.5">
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-acca-red text-white">
                        {item.paper.id}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        Ch. {item.chapterNumber}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-gray-200 truncate group-hover:text-white">
                      {item.chapterTitle}
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 border ${cfg.badgeBg} ${cfg.badgeText} ${cfg.badgeBorder}`}>
                    {cfg.shortLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. MAIN VIEW: All Papers Overview OR Detailed Paper Chapter View */}
      {!selectedPaper ? (
        /* ================= OVERVIEW MODE ================= */
        <div className="space-y-4">
          {/* Controls: Search, Stage Filter, Sort */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#1e1e24] p-3.5 rounded-2xl border border-[#2a2a34]">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-500" />
              <input
                type="text"
                value={paperSearchQuery}
                onChange={e => setPaperSearchQuery(e.target.value)}
                placeholder="Search papers or syllabus chapters..."
                className="w-full bg-[#141419] border border-[#2a2a34] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 outline-none focus:border-acca-red"
              />
            </div>

            {/* Stage Filter */}
            <div className="flex items-center space-x-2">
              <select
                value={selectedStageFilter}
                onChange={e => setSelectedStageFilter(e.target.value as any)}
                className="bg-[#141419] border border-[#2a2a34] rounded-xl px-2.5 py-1.5 text-xs text-gray-300 outline-none focus:border-acca-red"
              >
                <option value="all">All Stages (15)</option>
                <option value="Applied Knowledge">Applied Knowledge (BT, MA, FA)</option>
                <option value="Applied Skills">Applied Skills (LW, PM, TX, FR, AA, FM)</option>
                <option value="Strategic Professional">Strategic Professional</option>
              </select>

              {/* Sort By */}
              <select
                value={paperSortBy}
                onChange={e => setPaperSortBy(e.target.value as any)}
                className="bg-[#141419] border border-[#2a2a34] rounded-xl px-2.5 py-1.5 text-xs text-gray-300 outline-none focus:border-acca-red"
              >
                <option value="code">Sort by Code (A-Z)</option>
                <option value="name">Sort by Name</option>
                <option value="lowest_mastery">Lowest Mastery</option>
                <option value="most_revision">Most Needs Revision</option>
                <option value="highest_coverage">Highest Coverage</option>
              </select>
            </div>
          </div>

          {/* Papers Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedPapers.map(paper => {
              const stats = getPaperStats(paper);

              return (
                <div
                  key={paper.id}
                  onClick={() => setSelectedPaperId(paper.id)}
                  className="bg-[#1e1e24] rounded-2xl border border-[#2a2a34] hover:border-[#3d3d4e] p-5 cursor-pointer transition-all hover:shadow-lg group flex flex-col justify-between"
                >
                  <div>
                    {/* Top Row: Paper Code, Stage, Total Chapters */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-black px-2.5 py-1 rounded-xl bg-acca-red text-white shadow-xs">
                          {paper.code}
                        </span>
                        <div>
                          <span className="text-[10px] text-gray-400 font-semibold block uppercase">
                            {paper.stageName}
                          </span>
                        </div>
                      </div>

                      <span className="text-xs font-semibold text-gray-400 bg-[#141419] px-2 py-0.5 rounded-lg border border-[#2a2a34]">
                        {stats.totalChapters} chapters
                      </span>
                    </div>

                    {/* Paper Name */}
                    <h3 className="text-base font-bold text-white group-hover:text-acca-red transition-colors line-clamp-1">
                      {paper.name}
                    </h3>

                    {/* Progress Bars: Coverage & Mastery */}
                    <div className="space-y-2 my-4">
                      {/* Coverage Bar */}
                      <div>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-gray-400">Assessed Coverage</span>
                          <span className="font-bold text-white">{stats.coveragePct}% ({stats.assessedCount}/{stats.totalChapters})</span>
                        </div>
                        <div className="h-1.5 w-full bg-[#141419] rounded-full overflow-hidden border border-[#2a2a34]">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                            style={{ width: `${stats.coveragePct}%` }}
                          />
                        </div>
                      </div>

                      {/* Mastery Bar */}
                      <div>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-gray-400">Mastery (Good+)</span>
                          <span className="font-bold text-cyan-400">{stats.masteryPct}% ({stats.positiveCount}/{stats.totalChapters})</span>
                        </div>
                        <div className="h-1.5 w-full bg-[#141419] rounded-full overflow-hidden border border-[#2a2a34]">
                          <div
                            className="h-full bg-cyan-500 rounded-full transition-all duration-300"
                            style={{ width: `${stats.masteryPct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Stats & Button */}
                  <div className="pt-3 border-t border-[#2a2a34] flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2 text-[11px]">
                      {stats.priorityCount > 0 ? (
                        <span className="font-bold text-amber-400 flex items-center gap-1">
                          <Flame className="w-3 h-3" />
                          {stats.priorityCount} revision
                        </span>
                      ) : (
                        <span className="text-gray-500">No pending revision</span>
                      )}
                    </div>

                    <div className="flex items-center text-gray-400 group-hover:text-white font-semibold text-xs space-x-1">
                      <span>View Chapters</span>
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ================= DETAILED CHAPTER VIEW ================= */
        <div className="space-y-5">
          {/* Paper Banner Header */}
          {selectedPaperStats && (
            <div className="bg-[#1e1e24] p-5 rounded-2xl border border-[#2a2a34] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <span className="text-lg font-black px-3 py-1.5 rounded-xl bg-acca-red text-white">
                    {selectedPaper.code}
                  </span>
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      {selectedPaper.name}
                    </h2>
                    <span className="text-xs text-gray-400">
                      {selectedPaper.stageName} • {selectedPaper.chapters.length} Syllabus Chapters
                    </span>
                  </div>
                </div>

                {/* Circular Badges */}
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2.5">
                    <CircularProgress
                      percentage={selectedPaperStats.coveragePct}
                      size={42}
                      strokeWidth={4}
                      color="#10b981"
                      trackColor="#2a2a34"
                    />
                    <div>
                      <div className="text-xs font-bold text-white">{selectedPaperStats.coveragePct}%</div>
                      <div className="text-[10px] text-gray-400">Coverage</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2.5">
                    <CircularProgress
                      percentage={selectedPaperStats.masteryPct}
                      size={42}
                      strokeWidth={4}
                      color="#06b6d4"
                      trackColor="#2a2a34"
                    />
                    <div>
                      <div className="text-xs font-bold text-cyan-400">{selectedPaperStats.masteryPct}%</div>
                      <div className="text-[10px] text-gray-400">Mastery</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Breakdown Pills for This Paper */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 pt-3 border-t border-[#2a2a34]">
                {DEFAULT_MASTERY_STATUS_CONFIGS.map(cfg => {
                  const count = selectedPaperStats.counts[cfg.id];
                  return (
                    <div
                      key={cfg.id}
                      className={`p-2 rounded-xl border text-center ${cfg.badgeBg} ${cfg.badgeBorder}`}
                    >
                      <div className={`text-xs font-black ${cfg.badgeText}`}>
                        {count}
                      </div>
                      <div className="text-[10px] text-gray-400 truncate mt-0.5">
                        {cfg.shortLabel}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Chapter Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#1e1e24] p-3.5 rounded-2xl border border-[#2a2a34]">
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-500" />
              <input
                type="text"
                value={chapterSearchQuery}
                onChange={e => setChapterSearchQuery(e.target.value)}
                placeholder="Search chapters in this paper..."
                className="w-full bg-[#141419] border border-[#2a2a34] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 outline-none focus:border-acca-red"
              />
            </div>

            <div className="flex items-center space-x-1.5 bg-[#141419] p-1 rounded-xl border border-[#2a2a34] text-xs overflow-x-auto">
              <button
                onClick={() => setChapterStatusFilter('all')}
                className={`px-3 py-1 rounded-lg font-semibold whitespace-nowrap transition-all ${
                  chapterStatusFilter === 'all' ? 'bg-[#25252e] text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                All ({selectedPaper.chapters.length})
              </button>
              <button
                onClick={() => setChapterStatusFilter('not_assessed')}
                className={`px-3 py-1 rounded-lg font-semibold whitespace-nowrap transition-all ${
                  chapterStatusFilter === 'not_assessed' ? 'bg-[#25252e] text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Not Assessed ({selectedPaperStats?.counts.not_assessed || 0})
              </button>
              <button
                onClick={() => setChapterStatusFilter('priority')}
                className={`px-3 py-1 rounded-lg font-semibold whitespace-nowrap transition-all ${
                  chapterStatusFilter === 'priority' ? 'bg-[#25252e] text-amber-400' : 'text-gray-400 hover:text-white'
                }`}
              >
                Priority Revision ({selectedPaperStats?.priorityCount || 0})
              </button>
              <button
                onClick={() => setChapterStatusFilter('positive')}
                className={`px-3 py-1 rounded-lg font-semibold whitespace-nowrap transition-all ${
                  chapterStatusFilter === 'positive' ? 'bg-[#25252e] text-cyan-400' : 'text-gray-400 hover:text-white'
                }`}
              >
                Good or Better ({selectedPaperStats?.positiveCount || 0})
              </button>
            </div>
          </div>

          {/* Chapters List */}
          <div className="bg-[#1e1e24] p-4 rounded-2xl border border-[#2a2a34] space-y-2">
            {displayedChapters.length > 0 ? (
              displayedChapters.map(ch => {
                const id = `${selectedPaper.id}-ch-${ch.chapterNumber}`;
                const record = masteryMap.get(id);
                const currentStatus: ChapterMasteryStatus = record?.status || 'not_assessed';
                const statusCfg = getStatusConfig(currentStatus);
                const isNoteOpen = expandedNoteChapterId === id;

                return (
                  <div
                    key={id}
                    className="p-3.5 rounded-xl bg-[#141419] border border-[#2a2a34] hover:border-[#383846] transition-all space-y-2"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Left: Chapter Number & Title */}
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#1e1e24] text-gray-400 border border-[#2a2a34] shrink-0">
                          Ch. {ch.chapterNumber}
                        </span>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold text-white truncate">
                            {ch.title}
                          </h4>
                          {record?.notes && !isNoteOpen && (
                            <p className="text-[11px] text-gray-400 truncate mt-0.5 italic">
                              Note: {record.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right: Interactive Status Selector & Controls */}
                      <div className="flex items-center space-x-2 shrink-0">
                        {/* Status Dropdown */}
                        <select
                          value={currentStatus}
                          onChange={e =>
                            handleUpdateStatus(
                              selectedPaper,
                              ch.chapterNumber,
                              ch.title,
                              e.target.value as ChapterMasteryStatus
                            )
                          }
                          className={`text-xs font-bold rounded-xl px-2.5 py-1.5 outline-none border transition-all cursor-pointer ${statusCfg.badgeBg} ${statusCfg.badgeText} ${statusCfg.badgeBorder}`}
                        >
                          {DEFAULT_MASTERY_STATUS_CONFIGS.map(cfg => (
                            <option key={cfg.id} value={cfg.id} className="bg-[#1e1e24] text-white">
                              {cfg.label}
                            </option>
                          ))}
                        </select>

                        {/* Toggle Notes */}
                        <button
                          type="button"
                          onClick={() => {
                            if (isNoteOpen) {
                              setExpandedNoteChapterId(null);
                            } else {
                              setExpandedNoteChapterId(id);
                              setNoteDraftText(record?.notes || '');
                            }
                          }}
                          className={`px-2 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                            record?.notes
                              ? 'bg-acca-red/10 border-acca-red/30 text-acca-red'
                              : 'bg-[#1e1e24] border-[#2a2a34] text-gray-400 hover:text-white'
                          }`}
                          title="Add or edit study notes for this chapter"
                        >
                          {record?.notes ? 'Edit Note' : '+ Note'}
                        </button>

                        {/* Reset button if assessed */}
                        {currentStatus !== 'not_assessed' && (
                          <button
                            type="button"
                            onClick={() => handleResetStatus(id)}
                            className="p-1.5 text-gray-500 hover:text-gray-300 rounded-lg hover:bg-[#1e1e24] transition-colors"
                            title="Reset to Not assessed"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expandable Chapter Study Notes */}
                    {isNoteOpen && (
                      <div className="pt-2 border-t border-[#2a2a34] space-y-2">
                        <textarea
                          rows={2}
                          value={noteDraftText}
                          onChange={e => setNoteDraftText(e.target.value)}
                          placeholder="Add revision hints, key standards, formulas, or tricky areas for this chapter..."
                          className="w-full bg-[#1e1e24] border border-[#2a2a34] rounded-xl p-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-acca-red"
                        />
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            type="button"
                            onClick={() => setExpandedNoteChapterId(null)}
                            className="px-3 py-1 bg-[#1e1e24] hover:bg-[#25252e] text-gray-400 rounded-lg text-xs"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveNotes(selectedPaper.id, ch.chapterNumber, ch.title)}
                            className="px-3 py-1 bg-acca-red hover:bg-acca-red-hover text-white rounded-lg text-xs font-bold"
                          >
                            Save Note
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-xs text-gray-500">
                No chapters matching your current search or filter.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
