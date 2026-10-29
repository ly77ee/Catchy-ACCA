import React, { useState, useCallback } from 'react';
import {
  Home,
  GraduationCap,
  CheckSquare,
  BookOpen,
  FileCheck,
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
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  User,
  FileText
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

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  routeTarget?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const SIDEBAR_STORAGE_KEY = 'catchy_sidebar_collapsed';

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
  // Sidebar collapsed preference persisted in localStorage
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      } catch {
        // LocalStorage unavailable
      }
      return next;
    });
  }, []);

  const summary = calculateProgressSummary(version, paperRecords);

  // Grouped Navigation Items (Section 3.2)
  const navGroups: NavGroup[] = [
    {
      title: 'Overview',
      items: [{ id: 'dashboard', label: 'Home', icon: Home }],
    },
    {
      title: 'ACCA',
      items: [
        { id: 'my-acca', label: 'My ACCA', icon: GraduationCap },
        { id: 'exam-planner', label: 'Exam Planner', icon: Calendar },
        { id: 'revision-progress', label: 'Progress', icon: TrendingUp },
        { id: 'catchy-notes', label: 'Catchy Notes', icon: FileText },
      ],
    },
    {
      title: 'Study',
      items: [
        { id: 'checklist', label: 'Question Checklist', icon: CheckSquare },
        { id: 'study-materials', label: 'Study Materials', icon: BookOpen },
        { id: 'exam-environment', label: 'Mock Exams', icon: FileCheck },
        { id: 'excel', label: 'Excel', icon: Table2 },
        { id: 'word', label: 'Word', icon: PenTool },
      ],
    },
    {
      title: 'Resources',
      items: [
        { id: 'acca-news', label: 'ACCA News', icon: Newspaper },
        { id: 'ai-assistant', label: 'AI Assistant', icon: Bot },
      ],
    },
    {
      title: 'Account',
      items: [
        { id: 'profile', label: 'Profile', icon: User, routeTarget: 'my-acca' },
        { id: 'settings', label: 'Settings', icon: SettingsIcon },
        { id: 'help', label: 'Help', icon: LifeBuoy },
      ],
    },
  ];

  // Flat navItems list for global search and helper lookups
  const allNavItems = navGroups.flatMap((g) => g.items);

  const isItemActive = (item: NavItem): boolean => {
    if (activeTab === item.id) return true;
    if (item.id === 'exam-environment' && (activeTab === 'exam-environment' || activeTab === 'mock-exams')) return true;
    if (item.id === 'excel' && activeTab === 'excel-workspace') return true;
    if (item.id === 'word' && activeTab === 'answer-writer') return true;
    if (item.id === 'checklist' && (activeTab === 'study-checklist' || activeTab === 'question-checklist')) return true;
    if (item.id === 'revision-progress' && activeTab === 'progress') return true;
    if (item.id === 'catchy-notes' && (activeTab === 'notes' || activeTab === 'topic-grouping')) return true;
    if (item.id === 'profile' && activeTab === 'profile') return true;
    return false;
  };

  const handleNavClick = (item: NavItem) => {
    onNavigate(item.routeTarget || item.id);
    setMobileMenuOpen(false);
  };

  // Full-screen split workspaces (Excel & Word) use maximum viewport
  const isFullScreenWorkspace =
    activeTab === 'excel' ||
    activeTab === 'excel-workspace' ||
    activeTab === 'word' ||
    activeTab === 'answer-writer';

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
      <header className="sticky top-0 z-40 bg-[#1e1e24] border-b border-[#2a2a34] shadow-xs shrink-0">
        <div className="w-full px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Left: Brand + Sidebar Toggle */}
          <div className="flex items-center space-x-3">
            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#25252e] border border-[#2a2a34]"
              title="Open menu"
              aria-label="Open mobile navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Desktop sidebar toggle button */}
            <button
              onClick={toggleSidebar}
              className="hidden lg:flex items-center justify-center p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-[#25252e] border border-[#2a2a34] transition-colors"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="w-4 h-4 text-gray-300" />
              ) : (
                <PanelLeftClose className="w-4 h-4 text-gray-300" />
              )}
            </button>

            {/* Wordmark and Creator Credit */}
            <div
              onClick={() => onNavigate('dashboard')}
              className="cursor-pointer select-none flex items-baseline space-x-2"
            >
              <span className="text-xl font-black tracking-tight text-white hover:text-acca-red transition-colors">
                CATCHY <span className="text-acca-red">ACCA</span>
              </span>
              <span className="text-[11px] font-medium text-gray-400 tracking-wide hidden sm:inline">
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
              aria-label="Global search across ACCA papers, questions, and materials"
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
                          <div className="truncate max-w-[280px]">
                            <span className="font-bold text-white">{m.title}</span>
                          </div>
                          <span className="text-[10px] text-gray-500">
                            {m.totalPages} pages
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Right Header Status Badges */}
          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex items-center space-x-1.5 bg-[#141419] border border-[#2a2a34] px-2.5 py-1 rounded-xl text-xs text-gray-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px] font-semibold text-gray-300">
                100% Offline
              </span>
            </div>

            {/* Circular Progress Indicator */}
            <div
              onClick={() => onNavigate('my-acca')}
              className="flex items-center space-x-2.5 bg-[#141419] border border-[#2a2a34] hover:border-acca-red/50 px-3 py-1.5 rounded-xl cursor-pointer transition-colors"
              title="Click to view full qualification syllabus status"
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

      {/* Main Workspace Layout with Unified Left Sidebar */}
      <div
        className={`flex-1 flex w-full min-h-0 ${
          isFullScreenWorkspace
            ? 'overflow-hidden p-0'
            : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 gap-6'
        }`}
      >
        {/* Left Sidebar Navigation */}
        <aside
          className={`shrink-0 transition-all duration-200 z-30 select-none ${
            mobileMenuOpen
              ? 'fixed inset-y-0 left-0 z-50 w-64 bg-[#1e1e24] p-5 shadow-2xl block overflow-y-auto border-r border-[#2a2a34]'
              : sidebarCollapsed
              ? 'hidden lg:flex flex-col w-16 bg-[#181820] border-r border-[#282834] py-3 items-center justify-between h-full'
              : 'hidden lg:flex flex-col w-60 bg-[#1e1e24] border-r border-[#2a2a34] p-4 h-full overflow-y-auto'
          }`}
        >
          {/* Mobile menu close header */}
          {mobileMenuOpen && (
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#2a2a34] lg:hidden">
              <span className="font-bold text-white text-sm">Navigation</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Sidebar Content */}
          {sidebarCollapsed && !mobileMenuOpen ? (
            /* COLLAPSED RAIL MODE */
            <div className="flex flex-col h-full w-full justify-between items-center">
              {/* Rail Navigation Items */}
              <nav className="flex flex-col items-center space-y-1.5 w-full">
                {allNavItems.map((item) => {
                  const Icon = item.icon;
                  const active = isItemActive(item);
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item)}
                      title={item.label}
                      aria-label={item.label}
                      className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${
                        active
                          ? 'bg-acca-red text-white shadow-xs'
                          : 'text-gray-400 hover:bg-[#25252e] hover:text-white'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                    </button>
                  );
                })}
              </nav>

              {/* Bottom Expand Toggle in Rail */}
              <div className="pt-3 border-t border-[#2a2a34] w-full flex justify-center">
                <button
                  onClick={toggleSidebar}
                  title="Expand sidebar"
                  aria-label="Expand sidebar"
                  className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-400 hover:text-white hover:bg-[#25252e] transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            /* EXPANDED SIDEBAR MODE */
            <div className="flex flex-col h-full justify-between w-full">
              {/* Grouped Navigation Links */}
              <nav className="space-y-4">
                {navGroups.map((group) => (
                  <div key={group.title} className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 px-3 block mb-1">
                      {group.title}
                    </span>
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = isItemActive(item);

                      return (
                        <button
                          key={item.id}
                          onClick={() => handleNavClick(item)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                            active
                              ? 'bg-acca-red text-white shadow-xs'
                              : 'text-gray-400 hover:bg-[#25252e] hover:text-white'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5 truncate">
                            <Icon
                              className={`w-4 h-4 shrink-0 ${
                                active ? 'text-white' : 'text-gray-400'
                              }`}
                            />
                            <span className="truncate">{item.label}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </nav>

              {/* Bottom Community & Creator Attribution */}
              <div className="pt-3 mt-4 border-t border-[#2a2a34] space-y-3 shrink-0">
                <a
                  href="https://www.reddit.com/r/ACCA/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-400 hover:bg-[#25252e] hover:text-white transition-all group"
                  title="Open r/ACCA subreddit community in external browser"
                >
                  <div className="flex items-center space-x-2.5">
                    <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover:text-acca-red" />
                    <span>r/ACCA Reddit</span>
                  </div>
                  <span className="text-[10px] text-gray-500 bg-[#141419] px-1.5 py-0.5 rounded border border-[#2a2a34]">
                    External
                  </span>
                </a>

                <div className="text-center select-none pt-2 border-t border-[#2a2a34]">
                  <div className="text-[11px] font-bold text-gray-300 tracking-tight">
                    Catchy ACCA <span className="text-gray-500 font-normal">· by ly77ee</span>
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">
                    Local-First ACCA Study Manager
                  </div>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Main Content Area */}
        <main
          className={`flex-1 min-w-0 ${
            isFullScreenWorkspace ? 'h-full overflow-hidden flex flex-col' : ''
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  );
};
