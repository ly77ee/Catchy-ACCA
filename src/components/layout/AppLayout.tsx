import React, { useState } from 'react';
import {
  Home,
  GraduationCap,
  CheckSquare,
  BookOpen,
  FileCheck,
  HelpCircle,
  Table2,
  PenTool,
  TrendingUp,
  Calendar,
  Layers,
  Newspaper,
  Bot,
  Settings as SettingsIcon,
  LifeBuoy,
  Search,
  Menu,
  X,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { CircularProgress } from '../common/CircularProgress';
import {
  QuestionRecord,
  StudyMaterial,
  QualificationVersion,
  StudentPaperRecord,
} from '../../types';
import { calculateProgressSummary } from '../../config/accaStructure';

interface AppLayoutProps {
  activeTab: string;
  onNavigate: (tabId: string) => void;
  version: QualificationVersion;
  paperRecords: Record<string, StudentPaperRecord>;
  questions: QuestionRecord[];
  materials: StudyMaterial[];
  onOpenPdfAtPage: (materialId: string, page: number) => void;
  onSelectPaper: (paperId: string) => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  activeTab,
  onNavigate,
  version,
  paperRecords,
  questions,
  materials,
  onOpenPdfAtPage,
  onSelectPaper,
  children,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');

  const summary = calculateProgressSummary(version, paperRecords);

  // Exact 15 Navigation Items Specified in Section 14
  const navItems = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'my-acca', label: 'My ACCA', icon: GraduationCap },
    { id: 'checklist', label: 'Study Checklist', icon: CheckSquare },
    { id: 'study-materials', label: 'Study Materials', icon: BookOpen },
    { id: 'exam-environment', label: 'Exam Environment', icon: FileCheck },
    { id: 'questions', label: 'Questions', icon: HelpCircle },
    { id: 'excel', label: 'Excel', icon: Table2 },
    { id: 'word', label: 'Word', icon: PenTool },
    { id: 'revision-progress', label: 'Revision & Progress', icon: TrendingUp },
    { id: 'exam-planner', label: 'Exam Planner', icon: Calendar },
    { id: 'topic-grouping', label: 'Topic Grouping', icon: Layers },
    { id: 'acca-news', label: 'ACCA News', icon: Newspaper },
    { id: 'ai-assistant', label: 'AI Assistant', icon: Bot },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
    { id: 'help', label: 'Help', icon: LifeBuoy },
  ];

  // Global search filtering
  const searchResults = globalSearchQuery.trim()
    ? {
        papers: version.papers.filter(
          (p) =>
            p.id.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
            p.name.toLowerCase().includes(globalSearchQuery.toLowerCase())
        ),
        questions: questions.filter(
          (q) =>
            q.title.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
            q.questionNumber.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
            (q.topicTags || []).some((t) =>
              t.toLowerCase().includes(globalSearchQuery.toLowerCase())
            )
        ),
        materials: materials.filter(
          (m) =>
            m.title.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
            m.fileName.toLowerCase().includes(globalSearchQuery.toLowerCase())
        ),
      }
    : null;

  return (
    <div className="min-h-screen bg-[#141419] text-gray-100 flex flex-col font-sans selection:bg-acca-red selection:text-white">
      {/* Top Application Header */}
      <header className="sticky top-0 z-40 bg-[#1e1e24] border-b border-[#2a2a34] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Wordmark and Creator Credit */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#25252e]"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div
              onClick={() => onNavigate('dashboard')}
              className="cursor-pointer select-none flex items-baseline space-x-2"
            >
              <span className="text-xl font-black tracking-tight text-white hover:text-acca-red transition-colors">
                CATCHY <span className="text-acca-red">ACCA</span>
              </span>
              <span className="text-[11px] font-medium text-gray-400 tracking-wide">
                by ly77ee
              </span>
            </div>
          </div>

          {/* Global Search Field */}
          <div className="relative flex-1 max-w-md hidden md:block">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-500" />
            <input
              type="text"
              placeholder="Search papers, questions, topics, materials..."
              value={globalSearchQuery}
              onChange={(e) => {
                setGlobalSearchQuery(e.target.value);
                setGlobalSearchOpen(true);
              }}
              onFocus={() => setGlobalSearchOpen(true)}
              className="w-full bg-[#141419] border border-[#2a2a34] rounded-xl pl-9 pr-4 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-acca-red transition-all"
            />

            {/* Global Search Results Dropdown */}
            {globalSearchOpen && searchResults && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setGlobalSearchOpen(false)}
                />
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#1e1e24] text-gray-100 rounded-xl shadow-2xl border border-[#2a2a34] overflow-hidden z-50 max-h-96 overflow-y-auto">
                  <div className="p-3 bg-[#141419] border-b border-[#2a2a34] flex items-center justify-between text-xs text-gray-400">
                    <span>
                      Search results for: <strong>"{globalSearchQuery}"</strong>
                    </span>
                    <button
                      onClick={() => {
                        setGlobalSearchOpen(false);
                        setGlobalSearchQuery('');
                      }}
                      className="text-gray-400 hover:text-white"
                    >
                      Clear
                    </button>
                  </div>

                  {/* Papers Results */}
                  {searchResults.papers.length > 0 && (
                    <div className="p-2 border-b border-[#2a2a34]">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-2">
                        ACCA Papers ({searchResults.papers.length})
                      </span>
                      {searchResults.papers.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => {
                            onNavigate('my-acca');
                            setGlobalSearchOpen(false);
                          }}
                          className="p-2 hover:bg-[#25252e] rounded-lg cursor-pointer flex items-center justify-between text-xs"
                        >
                          <span className="font-bold text-white">
                            {p.id} — {p.name}
                          </span>
                          <span className="text-[10px] text-acca-red font-semibold">View</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Questions Results */}
                  {searchResults.questions.length > 0 && (
                    <div className="p-2 border-b border-[#2a2a34]">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-2">
                        Questions ({searchResults.questions.length})
                      </span>
                      {searchResults.questions.map((q) => (
                        <div
                          key={q.id}
                          onClick={() => {
                            onNavigate('questions');
                            setGlobalSearchOpen(false);
                          }}
                          className="p-2 hover:bg-[#25252e] rounded-lg cursor-pointer flex items-center justify-between text-xs"
                        >
                          <div className="truncate max-w-[280px]">
                            <span className="font-bold text-white mr-2">
                              {q.questionNumber}:
                            </span>
                            <span className="text-gray-300">{q.title}</span>
                          </div>
                          <span className="text-[10px] bg-[#141419] text-gray-400 font-bold px-1.5 py-0.5 rounded border border-[#2a2a34]">
                            {q.paperId}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Study Materials Results */}
                  {searchResults.materials.length > 0 && (
                    <div className="p-2">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-2">
                        Study Materials ({searchResults.materials.length})
                      </span>
                      {searchResults.materials.map((m) => (
                        <div
                          key={m.id}
                          onClick={() => {
                            onOpenPdfAtPage(m.id, 1);
                            setGlobalSearchOpen(false);
                          }}
                          className="p-2 hover:bg-[#25252e] rounded-lg cursor-pointer flex items-center justify-between text-xs"
                        >
                          <div className="font-bold text-white">{m.title}</div>
                          <span className="text-[10px] bg-[#141419] text-gray-400 px-1.5 py-0.5 rounded border border-[#2a2a34]">
                            {m.totalPages} pages
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {searchResults.papers.length === 0 &&
                    searchResults.questions.length === 0 &&
                    searchResults.materials.length === 0 && (
                      <div className="p-4 text-center text-xs text-gray-500">
                        No matches found for "{globalSearchQuery}".
                      </div>
                    )}
                </div>
              </>
            )}
          </div>

          {/* Qualification Progress Pill in Header */}
          <div className="flex items-center space-x-4">
            <div
              onClick={() => onNavigate('my-acca')}
              className="flex items-center space-x-2.5 bg-[#141419] hover:bg-[#25252e] px-3 py-1.5 rounded-xl border border-[#2a2a34] cursor-pointer transition-colors"
              title="Click to view full qualification journey"
            >
              <CircularProgress
                percentage={summary.overallPercentage}
                size={26}
                strokeWidth={3.5}
                color="#C00000"
                trackColor="#2a2a34"
                showText={false}
              />
              <div className="text-right leading-tight">
                <span className="text-xs font-bold text-white block">
                  {summary.overallPercentage}%
                </span>
                <span className="text-[10px] text-gray-400">
                  {summary.totalCompletedOrExempt}/13 Exams
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout with Left Sidebar */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 gap-6">
        {/* Left Sidebar Navigation */}
        <aside
          className={`lg:block w-60 shrink-0 ${
            mobileMenuOpen
              ? 'fixed inset-y-0 left-0 z-50 bg-[#1e1e24] p-6 shadow-2xl block overflow-y-auto border-r border-[#2a2a34]'
              : 'hidden'
          }`}
        >
          {mobileMenuOpen && (
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#2a2a34] lg:hidden">
              <span className="font-bold text-white text-sm">Navigation</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          <div className="flex flex-col h-full justify-between">
            {/* Navigation Links in Exact Required Order */}
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  activeTab === item.id ||
                  (item.id === 'excel' && activeTab === 'excel-workspace') ||
                  (item.id === 'word' && activeTab === 'answer-writer');

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-acca-red text-white shadow-xs'
                        : 'text-gray-400 hover:bg-[#25252e] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <Icon
                        className={`w-4 h-4 ${
                          isActive ? 'text-white' : 'text-gray-400'
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>
                  </button>
                );
              })}
            </nav>

            {/* Resources / Community Section */}
            <div className="pt-3 mt-3 border-t border-[#2a2a34]">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-3 block mb-1">
                Community
              </span>
              <a
                href="https://www.reddit.com/r/ACCA/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:bg-[#25252e] hover:text-white transition-all group"
                title="Open r/ACCA subreddit community in external browser (Third-party student forum)"
              >
                <div className="flex items-center space-x-2.5">
                  <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-acca-red" />
                  <span>r/ACCA Reddit</span>
                </div>
                <span className="text-[10px] text-gray-500 bg-[#141419] px-1.5 py-0.5 rounded border border-[#2a2a34]">
                  External
                </span>
              </a>
            </div>

            {/* Creator Credit Unobtrusively at the Bottom */}
            <div className="pt-4 mt-4 border-t border-[#2a2a34] text-center select-none">
              <div className="text-[11px] font-bold text-gray-300 tracking-tight">
                Catchy ACCA <span className="text-gray-500 font-normal">· by ly77ee</span>
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5">
                Local-First ACCA Study Manager
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
};
