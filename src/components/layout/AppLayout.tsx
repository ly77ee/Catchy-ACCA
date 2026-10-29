import React, { useState } from 'react';
import {
  Home,
  GraduationCap,
  BookOpen,
  HelpCircle,
  FileCheck,
  Table2,
  PenTool,
  TrendingUp,
  Bot,
  Settings as SettingsIcon,
  LifeBuoy,
  Search,
  Download,
  Menu,
  X,
  ExternalLink
} from 'lucide-react';
import { CircularProgress } from '../common/CircularProgress';
import { QuestionRecord, StudyMaterial, QualificationVersion, StudentPaperRecord } from '../../types';
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

  const navItems = [
    { id: 'dashboard', label: 'Home', icon: Home, isFuture: false },
    { id: 'my-acca', label: 'My ACCA', icon: GraduationCap, isFuture: false },
    { id: 'study-materials', label: 'Study Materials', icon: BookOpen, isFuture: false },
    { id: 'questions', label: 'Questions', icon: HelpCircle, isFuture: false },
    { id: 'exam-environment', label: 'Exam Environment', icon: FileCheck, isFuture: false },
    { id: 'excel-workspace', label: 'Excel Workspace', icon: Table2, isFuture: true, phase: 'Phase 2' },
    { id: 'answer-writer', label: 'Answer Writer', icon: PenTool, isFuture: true, phase: 'Phase 3' },
    { id: 'revision-progress', label: 'Revision & Progress', icon: TrendingUp, isFuture: true, phase: 'Phase 3' },
    { id: 'ai-assistant', label: 'AI Assistant', icon: Bot, isFuture: true, phase: 'Phase 4' },
    { id: 'settings', label: 'Settings', icon: SettingsIcon, isFuture: false },
    { id: 'help', label: 'Help', icon: LifeBuoy, isFuture: false },
  ];

  // Global search filtering
  const searchResults = globalSearchQuery.trim()
    ? {
        papers: version.papers.filter(p =>
          p.id.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
          p.name.toLowerCase().includes(globalSearchQuery.toLowerCase())
        ),
        questions: questions.filter(q =>
          q.title.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
          q.questionNumber.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
          q.topicTags.some(t => t.toLowerCase().includes(globalSearchQuery.toLowerCase()))
        ),
        materials: materials.filter(m =>
          m.title.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
          m.fileName.toLowerCase().includes(globalSearchQuery.toLowerCase())
        )
      }
    : null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Top Application Header */}
      <header className="sticky top-0 z-40 bg-neutral-900 text-white border-b border-neutral-800 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Typographic Wordmark & Creator Credit */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-neutral-800"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div
              onClick={() => onNavigate('dashboard')}
              className="cursor-pointer select-none flex items-baseline space-x-2"
            >
              <span className="text-xl font-black tracking-tight text-white hover:text-acca-red-light transition-colors">
                CATCHY <span className="text-acca-red">ACCA</span>
              </span>
              <span className="text-[11px] font-medium text-neutral-400 tracking-wide">
                by ly77ee
              </span>
            </div>
          </div>

          {/* Global Search Bar */}
          <div className="relative flex-1 max-w-md hidden md:block">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
            <input
              type="text"
              placeholder="Search papers, questions, topics, materials..."
              value={globalSearchQuery}
              onChange={(e) => {
                setGlobalSearchQuery(e.target.value);
                setGlobalSearchOpen(true);
              }}
              onFocus={() => setGlobalSearchOpen(true)}
              className="w-full bg-neutral-800/90 hover:bg-neutral-800 border border-neutral-700 rounded-xl pl-9 pr-4 py-1.5 text-xs text-white placeholder-neutral-400 focus:outline-none focus:border-acca-red transition-all"
            />

            {/* Global Search Results Dropdown */}
            {globalSearchOpen && searchResults && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setGlobalSearchOpen(false)}
                />
                <div className="absolute top-full left-0 right-0 mt-2 bg-white text-gray-900 rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50 max-h-96 overflow-y-auto">
                  <div className="p-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between text-xs text-gray-500">
                    <span>Search results for: <strong>"{globalSearchQuery}"</strong></span>
                    <button
                      onClick={() => {
                        setGlobalSearchOpen(false);
                        setGlobalSearchQuery('');
                      }}
                      className="text-gray-400 hover:text-gray-700"
                    >
                      Clear
                    </button>
                  </div>

                  {/* Papers Results */}
                  {searchResults.papers.length > 0 && (
                    <div className="p-2 border-b border-gray-100">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2">
                        ACCA Papers ({searchResults.papers.length})
                      </span>
                      {searchResults.papers.map(p => (
                        <div
                          key={p.id}
                          onClick={() => {
                            onNavigate('my-acca');
                            setGlobalSearchOpen(false);
                          }}
                          className="p-2 hover:bg-gray-50 rounded-lg cursor-pointer flex items-center justify-between text-xs"
                        >
                          <div className="font-bold text-gray-900">{p.id} — {p.name}</div>
                          <span className="text-[10px] bg-red-50 text-acca-red font-bold px-1.5 py-0.5 rounded">
                            {p.stageId.replace('_', ' ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Questions Results */}
                  {searchResults.questions.length > 0 && (
                    <div className="p-2 border-b border-gray-100">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2">
                        Questions ({searchResults.questions.length})
                      </span>
                      {searchResults.questions.map(q => (
                        <div
                          key={q.id}
                          onClick={() => {
                            onNavigate('questions');
                            setGlobalSearchOpen(false);
                          }}
                          className="p-2 hover:bg-gray-50 rounded-lg cursor-pointer flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-bold text-gray-900 mr-2">{q.questionNumber}</span>
                            <span className="text-gray-700">{q.title}</span>
                          </div>
                          <span className="text-[10px] bg-gray-100 text-gray-600 font-bold px-1.5 py-0.5 rounded">
                            {q.paperId}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Study Materials Results */}
                  {searchResults.materials.length > 0 && (
                    <div className="p-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2">
                        Study Materials ({searchResults.materials.length})
                      </span>
                      {searchResults.materials.map(m => (
                        <div
                          key={m.id}
                          onClick={() => {
                            onOpenPdfAtPage(m.id, 1);
                            setGlobalSearchOpen(false);
                          }}
                          className="p-2 hover:bg-gray-50 rounded-lg cursor-pointer flex items-center justify-between text-xs"
                        >
                          <div className="font-bold text-gray-900">{m.title}</div>
                          <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                            {m.totalPages} pages
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {searchResults.papers.length === 0 &&
                    searchResults.questions.length === 0 &&
                    searchResults.materials.length === 0 && (
                      <div className="p-4 text-center text-xs text-gray-400">
                        No matches found for "{globalSearchQuery}".
                      </div>
                    )}
                </div>
              </>
            )}
          </div>

          {/* Quick Overall Progress Pill */}
          <div className="flex items-center space-x-4">
            <div
              onClick={() => onNavigate('my-acca')}
              className="flex items-center space-x-2.5 bg-neutral-800/80 hover:bg-neutral-800 px-3 py-1.5 rounded-xl border border-neutral-700/60 cursor-pointer transition-colors"
              title="Click to view full qualification journey"
            >
              <CircularProgress
                percentage={summary.overallPercentage}
                size={26}
                strokeWidth={3.5}
                color="#C00000"
                trackColor="#404040"
                showText={false}
              />
              <div className="text-right leading-tight">
                <span className="text-xs font-bold text-white block">
                  {summary.overallPercentage}%
                </span>
                <span className="text-[10px] text-neutral-400">
                  {summary.totalCompletedOrExempt}/13 Exams
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 gap-6">
        {/* Sidebar Navigation */}
        <aside
          className={`lg:block w-60 shrink-0 ${
            mobileMenuOpen
              ? 'fixed inset-y-0 left-0 z-50 bg-white p-6 shadow-2xl block overflow-y-auto'
              : 'hidden'
          }`}
        >
          {mobileMenuOpen && (
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100 lg:hidden">
              <span className="font-bold text-gray-900">Navigation</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          <nav className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 px-3 pb-1 block">
              Core Study Tools
            </span>
            {navItems.slice(0, 5).map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-acca-red text-white shadow-xs'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                    <span>{item.label}</span>
                  </div>
                </button>
              );
            })}

            <div className="pt-4 pb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 px-3 block">
                Roadmap Modules
              </span>
            </div>

            {navItems.slice(5, 9).map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-neutral-800 text-white'
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 truncate">
                    <Icon className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.phase && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 shrink-0">
                      {item.phase}
                    </span>
                  )}
                </button>
              );
            })}

            <div className="pt-4 pb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 px-3 block">
                System
              </span>
            </div>

            {navItems.slice(9).map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-acca-red text-white shadow-xs'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                    <span>{item.label}</span>
                  </div>
                </button>
              );
            })}
          </nav>

          {/* Local storage status pill in sidebar footer */}
          <div className="mt-8 p-3 rounded-xl bg-gray-100/70 border border-gray-200/60 text-[11px] text-gray-500 leading-snug">
            <span className="font-bold text-gray-700 block mb-0.5">Offline-Ready & Private</span>
            Data persists locally via IndexedDB. Zero mandatory cloud accounts.
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
};
