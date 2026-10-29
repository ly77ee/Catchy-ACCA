import React, { useState, useMemo } from 'react';
import {
  QualificationVersion,
  QuestionRecord,
  ExamAttemptRecord,
} from '../../types';
import { ACCA_SYLLABUS_TOPICS } from '../../config/syllabusTopics';
import {
  Layers,
  BookOpen,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Play,
  FileEdit,
  Sparkles,
  ChevronRight,
  FolderTree,
  Tag,
  Star,
} from 'lucide-react';

interface TopicGroupingProps {
  version: QualificationVersion;
  allQuestions: QuestionRecord[];
  examAttempts: ExamAttemptRecord[];
  onOpenQuestionInWriter?: (questionId: string) => void;
  onLaunchPractice?: (paperId: string, questionIds: string[]) => void;
}

export const TopicGrouping: React.FC<TopicGroupingProps> = ({
  version,
  allQuestions,
  examAttempts,
  onOpenQuestionInWriter,
  onLaunchPractice,
}) => {
  const [selectedPaperId, setSelectedPaperId] = useState<string>('FR');
  const [selectedTopicName, setSelectedTopicName] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Syllabus topic definitions for the selected paper
  const paperTopics = useMemo(() => {
    const list = ACCA_SYLLABUS_TOPICS.filter((t) => t.paperId === selectedPaperId);
    if (list.length > 0) return list;
    return [
      {
        paperId: selectedPaperId,
        topicName: 'Core Framework & Conceptual Principles',
        keywords: ['framework', 'conceptual', 'objective', 'characteristics'],
      },
      {
        paperId: selectedPaperId,
        topicName: 'Technical Standards & Accounting Treatments',
        keywords: ['standard', 'treatment', 'measurement', 'recognition'],
      },
      {
        paperId: selectedPaperId,
        topicName: 'Financial Workings & Complex Computations',
        keywords: ['working', 'calculation', 'schedule', 'npv', 'variance'],
      },
      {
        paperId: selectedPaperId,
        topicName: 'Disclosures, Ethics & Case Study Analysis',
        keywords: ['disclosure', 'notes', 'ethics', 'governance', 'report'],
      },
    ];
  }, [selectedPaperId]);

  // Set active topic if not set or invalid for selected paper
  const activeTopic = useMemo(() => {
    const found = paperTopics.find((t) => t.topicName === selectedTopicName);
    return found || paperTopics[0];
  }, [paperTopics, selectedTopicName]);

  // Questions for current paper
  const paperQuestions = useMemo(() => {
    return allQuestions.filter((q) => q.paperId === selectedPaperId);
  }, [allQuestions, selectedPaperId]);

  // Questions matching active topic
  const topicQuestions = useMemo(() => {
    if (!activeTopic) return [];
    const tName = activeTopic.topicName.toLowerCase();
    const keywords = activeTopic.keywords || [];

    return paperQuestions.filter((q) => {
      // Matches if tag explicitly matches topic name
      const hasDirectTag = (q.topicTags || []).some(
        (t) => t.toLowerCase().includes(tName) || tName.includes(t.toLowerCase())
      );
      // Or if title/notes hits topic keywords
      const textToSearch = `${q.title} ${q.notes || ''} ${(q.topicTags || []).join(' ')}`.toLowerCase();
      const hasKeyword = keywords.some((kw) => textToSearch.includes(kw.toLowerCase()));

      const matchesTopic = hasDirectTag || hasKeyword;
      if (!matchesTopic) return false;

      if (!searchQuery.trim()) return true;
      const qLower = searchQuery.toLowerCase();
      return (
        q.title.toLowerCase().includes(qLower) ||
        q.questionNumber.toLowerCase().includes(qLower) ||
        (q.notes || '').toLowerCase().includes(qLower)
      );
    });
  }, [paperQuestions, activeTopic, searchQuery]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Card */}
      <div className="bg-[#1e1e24] rounded-2xl border border-[#2a2a34] p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-acca-red/10 text-acca-red flex items-center justify-center border border-acca-red/20">
              <FolderTree className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-tight">
                  Topic Grouping & Standard Organization
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#141419] text-gray-400 border border-[#2a2a34]">
                  Paper → Topic → Standard
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Organize and practice exam questions by accounting standards and syllabus topics rather than publisher book order
              </p>
            </div>
          </div>
        </div>

        {/* Paper Selector */}
        <div className="flex items-center gap-2 bg-[#141419] border border-[#2a2a34] rounded-xl px-3 py-1.5">
          <span className="text-xs font-semibold text-gray-400">Paper:</span>
          <select
            value={selectedPaperId}
            onChange={(e) => {
              setSelectedPaperId(e.target.value);
              setSelectedTopicName('');
            }}
            className="text-xs font-bold bg-transparent text-white outline-none cursor-pointer"
          >
            {version.papers.map((p) => (
              <option key={p.id} value={p.id} className="bg-[#1e1e24] text-white">
                {p.id} — {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Two-Column Structure: Topic List on Left, Questions on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Topics Navigation (4 cols) */}
        <div className="lg:col-span-4 space-y-2">
          <div className="bg-[#1e1e24] rounded-2xl border border-[#2a2a34] p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#2a2a34]">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-acca-red" />
                <span>Syllabus Topics ({paperTopics.length})</span>
              </span>
              <span className="text-[10px] font-medium text-gray-500">
                {paperQuestions.length} Total Questions
              </span>
            </div>

            <div className="space-y-1.5 max-h-[600px] overflow-y-auto">
              {paperTopics.map((topic, idx) => {
                const isSelected = activeTopic?.topicName === topic.topicName;
                const matchCount = paperQuestions.filter((q) => {
                  const tName = topic.topicName.toLowerCase();
                  return (
                    (q.topicTags || []).some((t) => t.toLowerCase().includes(tName) || tName.includes(t.toLowerCase())) ||
                    (topic.keywords || []).some((kw) => (q.title + ' ' + (q.notes || '')).toLowerCase().includes(kw.toLowerCase()))
                  );
                }).length;

                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedTopicName(topic.topicName)}
                    className={`w-full text-left p-3 rounded-xl text-xs transition-all flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-acca-red text-white shadow-xs font-bold'
                        : 'bg-[#141419]/60 hover:bg-[#141419] text-gray-300 hover:text-white border border-[#2a2a34]/60'
                    }`}
                  >
                    <div className="space-y-0.5 truncate">
                      <div className="truncate">{topic.topicName}</div>
                      {topic.standardReference && (
                        <div
                          className={`text-[10px] font-mono truncate ${
                            isSelected ? 'text-white/80' : 'text-gray-500'
                          }`}
                        >
                          {topic.standardReference}
                        </div>
                      )}
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        isSelected ? 'bg-black/30 text-white' : 'bg-[#2a2a34] text-gray-400'
                      }`}
                    >
                      {matchCount}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Questions in Active Topic (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Active Topic Banner */}
          <div className="bg-[#1e1e24] rounded-2xl border border-[#2a2a34] p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-acca-red bg-acca-red/10 px-2 py-0.5 rounded border border-acca-red/20">
                  {selectedPaperId} Topic
                </span>
                {activeTopic?.standardReference && (
                  <span className="text-xs font-mono text-gray-400">
                    {activeTopic.standardReference}
                  </span>
                )}
              </div>
              <h2 className="text-base font-bold text-white mt-1">
                {activeTopic?.topicName}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              {topicQuestions.length > 0 && onLaunchPractice && (
                <button
                  onClick={() =>
                    onLaunchPractice(
                      selectedPaperId,
                      topicQuestions.map((q) => q.id)
                    )
                  }
                  className="px-3.5 py-2 bg-acca-red hover:bg-acca-red-dark text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Practise All ({topicQuestions.length})</span>
                </button>
              )}
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search questions in this topic..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#1e1e24] border border-[#2a2a34] rounded-xl px-4 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-acca-red transition-all"
              />
            </div>
            <span className="text-xs text-gray-400">
              Showing {topicQuestions.length} question(s)
            </span>
          </div>

          {/* Questions Stream */}
          {topicQuestions.length === 0 ? (
            <div className="text-center py-16 bg-[#1e1e24] rounded-2xl border border-[#2a2a34] p-6 space-y-3">
              <BookOpen className="w-10 h-10 text-gray-600 mx-auto" />
              <h3 className="font-bold text-gray-300 text-sm">
                No Questions Associated with This Topic Yet
              </h3>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                Import study materials in Study Materials or add topic tags to questions in the Question Manager to group questions here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {topicQuestions.map((q) => (
                <div
                  key={q.id}
                  className="bg-[#1e1e24] border border-[#2a2a34] hover:border-[#3a3a46] rounded-xl p-4 shadow-2xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-white">
                        {q.questionNumber}: {q.title}
                      </span>
                      <span className="text-[10px] font-semibold text-gray-400 px-2 py-0.5 rounded bg-[#141419] border border-[#2a2a34]">
                        {q.availableMarks || 2} Marks
                      </span>
                      {q.isDoubt && (
                        <span className="text-[10px] font-bold text-amber-400 bg-amber-950/40 border border-amber-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Doubt</span>
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                      {q.notes || q.title}
                    </p>

                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {(q.topicTags || []).map((t, tIdx) => (
                        <span
                          key={tIdx}
                          className="px-2 py-0.5 bg-[#141419] text-gray-400 rounded text-[10px] border border-[#2a2a34]"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {onOpenQuestionInWriter && (
                      <button
                        onClick={() => onOpenQuestionInWriter(q.id)}
                        className="px-3 py-1.5 rounded-lg bg-[#141419] hover:bg-[#25252e] border border-[#2a2a34] text-xs font-semibold text-white transition-colors flex items-center gap-1.5"
                      >
                        <FileEdit className="w-3.5 h-3.5 text-acca-red" />
                        <span>Open in Word</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
