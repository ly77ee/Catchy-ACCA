import React, { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  db,
  initializeDatabase
} from './db';
import {
  QUALIFICATION_VERSIONS,
  getQualificationVersion
} from './config/accaStructure';
import { StudentPaperRecord } from './types';

// Layout & Views
import { AppLayout } from './components/layout/AppLayout';
import { Dashboard } from './components/dashboard/Dashboard';
import { MyAcca } from './components/qualification/MyAcca';
import { StudyChecklist } from './components/checklist/StudyChecklist';
import { StudyMaterials } from './components/study-materials/StudyMaterials';
import { Questions } from './components/questions/Questions';
import { ExamEnvironment } from './components/exam/ExamEnvironment';
import { ConnectedWorkspace } from './components/workspace/ConnectedWorkspace';
import { Settings } from './components/settings/Settings';
import { Help } from './components/help/Help';
import { ComingSoon } from './components/common/ComingSoon';
import { AIAssistant } from './components/ai/AIAssistant';
import { RevisionAnalytics } from './components/revision/RevisionAnalytics';
import { ExamPlanner } from './components/planner/ExamPlanner';
import { TopicGrouping } from './components/topics/TopicGrouping';
import { AccaNews } from './components/news/AccaNews';

// Icons for Future Modules
import { FileCheck, Table2, PenTool, TrendingUp, Bot } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [versionId, setVersionId] = useState<string>('current_2024_2026');
  const [isDbReady, setIsDbReady] = useState(false);

  // Cross-component navigation state (e.g. from question click -> open PDF at specific page)
  const [activePdfMaterialId, setActivePdfMaterialId] = useState<string | null>(null);
  const [activePdfPage, setActivePdfPage] = useState<number>(1);
  const [activeWorkspaceQuestionId, setActiveWorkspaceQuestionId] = useState<string | undefined>(undefined);

  // Initialize DB on boot
  useEffect(() => {
    initializeDatabase()
      .then(() => setIsDbReady(true))
      .catch((err) => console.error('Database initialization error:', err));
  }, []);

  // Reactive IndexedDB queries
  const paperRecordsArray = useLiveQuery(() => db.paperRecords.toArray(), [], []);
  const questions = useLiveQuery(() => db.questions.toArray(), [], []);
  const studyMaterials = useLiveQuery(() => db.studyMaterials.toArray(), [], []);
  const studyPlans = useLiveQuery(() => db.studyPlans.toArray(), [], []);
  const activityLogs = useLiveQuery(
    () => db.activityLogs.orderBy('timestamp').reverse().toArray(),
    [],
    []
  );
  const targets = useLiveQuery(() => db.targets.toArray(), [], []);
  const examAttempts = useLiveQuery(
    () => db.examAttempts.orderBy('startedAt').reverse().toArray(),
    [],
    []
  );

  // Convert paper records array to dictionary keyed by paperId for fast lookups
  const paperRecordsMap: Record<string, StudentPaperRecord> = {};
  paperRecordsArray?.forEach((record) => {
    paperRecordsMap[record.paperId] = record;
  });

  const activeVersion = getQualificationVersion(versionId);
  const currentTarget = targets && targets.length > 0 ? targets[0] : null;

  // Jump to PDF page from Question Manager
  const handleOpenPdfAtPage = (materialId: string, page: number) => {
    setActivePdfMaterialId(materialId);
    setActivePdfPage(page);
    setActiveTab('study-materials');
  };

  const handleSelectPaper = (paperId: string) => {
    setActiveTab('my-acca');
  };

  if (!isDbReady) {
    return (
      <div className="min-h-screen bg-[#141419] flex flex-col items-center justify-center p-4 text-white">
        <div className="w-10 h-10 border-4 border-acca-red border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-base font-bold text-white tracking-tight">Initializing Catchy ACCA...</h2>
        <p className="text-xs text-gray-400 mt-1">Preparing local IndexedDB and study data</p>
      </div>
    );
  }

  return (
    <AppLayout
      activeTab={activeTab}
      onNavigate={setActiveTab}
      version={activeVersion}
      paperRecords={paperRecordsMap}
      questions={questions || []}
      materials={studyMaterials || []}
      onOpenPdfAtPage={handleOpenPdfAtPage}
      onSelectPaper={handleSelectPaper}
    >
      {/* Tab: Dashboard */}
      {activeTab === 'dashboard' && (
        <Dashboard
          version={activeVersion}
          paperRecords={paperRecordsMap}
          target={currentTarget}
          studyPlans={studyPlans || []}
          activityLogs={activityLogs || []}
          questions={questions || []}
          examAttempts={examAttempts || []}
          onNavigate={setActiveTab}
          onSelectPaper={handleSelectPaper}
        />
      )}

      {/* Tab: My ACCA */}
      {activeTab === 'my-acca' && (
        <MyAcca
          currentVersionId={versionId}
          onVersionChange={setVersionId}
          paperRecords={paperRecordsMap}
        />
      )}

      {/* Tab: Study Checklist (Markdown / Obsidian inspired) */}
      {(activeTab === 'checklist' || activeTab === 'study-checklist') && (
        <StudyChecklist
          version={activeVersion}
          onNavigateToPaper={handleSelectPaper}
        />
      )}

      {/* Tab: Study Materials */}
      {activeTab === 'study-materials' && (
        <StudyMaterials
          version={activeVersion}
          materials={studyMaterials || []}
          selectedMaterialId={activePdfMaterialId}
          targetPage={activePdfPage}
          onClearSelectedMaterial={() => {
            setActivePdfMaterialId(null);
            setActivePdfPage(1);
          }}
        />
      )}

      {/* Tab: Questions */}
      {activeTab === 'questions' && (
        <Questions
          version={activeVersion}
          questions={questions || []}
          materials={studyMaterials || []}
          onOpenPdfAtPage={handleOpenPdfAtPage}
          onOpenInWriter={(qId) => {
            setActiveWorkspaceQuestionId(qId);
            setActiveTab('answer-writer');
          }}
          onOpenInSpreadsheet={(qId) => {
            setActiveWorkspaceQuestionId(qId);
            setActiveTab('excel-workspace');
          }}
        />
      )}

      {/* Tab: Exam Environment */}
      {activeTab === 'exam-environment' && (
        <ExamEnvironment
          version={activeVersion}
          allQuestions={questions || []}
          materials={studyMaterials || []}
          examAttempts={examAttempts || []}
          defaultPaperId={currentTarget?.nextExamPaperId || 'FR'}
          onOpenQuestionInManager={() => {
            setActiveTab('questions');
          }}
        />
      )}

      {/* Tab: Excel Workspace */}
      {(activeTab === 'excel' || activeTab === 'excel-workspace') && (
        <ConnectedWorkspace
          version={activeVersion}
          allQuestions={questions || []}
          initialQuestionId={activeWorkspaceQuestionId}
          initialPaperId={currentTarget?.nextExamPaperId || 'FR'}
          defaultMode="spreadsheet"
        />
      )}

      {/* Tab: Word Answer Writer */}
      {(activeTab === 'word' || activeTab === 'answer-writer') && (
        <ConnectedWorkspace
          version={activeVersion}
          allQuestions={questions || []}
          initialQuestionId={activeWorkspaceQuestionId}
          initialPaperId={currentTarget?.nextExamPaperId || 'FR'}
          defaultMode="writer"
        />
      )}

      {/* Tab: Revision & Progress Analytics */}
      {activeTab === 'revision-progress' && (
        <RevisionAnalytics
          version={activeVersion}
          allQuestions={questions || []}
          paperRecords={paperRecordsArray || []}
          examAttempts={examAttempts || []}
          onLaunchPracticeExam={(paperId, questionIds) => {
            setActiveTab('exam-environment');
          }}
          onOpenQuestionInWriter={(qId) => {
            setActiveWorkspaceQuestionId(qId);
            setActiveTab('word');
          }}
        />
      )}

      {/* Tab: Exam Planner */}
      {activeTab === 'exam-planner' && (
        <ExamPlanner
          version={activeVersion}
          target={currentTarget}
          studyPlans={studyPlans || []}
          allQuestions={questions || []}
          studyMaterials={studyMaterials || []}
          onOpenQuestionInWriter={(qId) => {
            setActiveWorkspaceQuestionId(qId);
            setActiveTab('word');
          }}
          onOpenMaterial={handleOpenPdfAtPage}
        />
      )}

      {/* Tab: Topic Grouping */}
      {activeTab === 'topic-grouping' && (
        <TopicGrouping
          version={activeVersion}
          allQuestions={questions || []}
          examAttempts={examAttempts || []}
          onOpenQuestionInWriter={(qId) => {
            setActiveWorkspaceQuestionId(qId);
            setActiveTab('word');
          }}
          onLaunchPractice={(paperId, questionIds) => {
            setActiveTab('exam-environment');
          }}
        />
      )}

      {/* Tab: ACCA News */}
      {activeTab === 'acca-news' && (
        <AccaNews />
      )}

      {/* Tab: AI Assistant */}
      {activeTab === 'ai-assistant' && (
        <AIAssistant
          version={activeVersion}
          onNavigateSettings={() => setActiveTab('settings')}
          onNavigateStudyMaterials={() => setActiveTab('study-materials')}
        />
      )}

      {/* Tab: Settings */}
      {activeTab === 'settings' && (
        <Settings
          currentVersionId={versionId}
          onRefreshData={() => {
            // Live queries update automatically
          }}
        />
      )}

      {/* Tab: Help */}
      {activeTab === 'help' && (
        <Help onNavigate={setActiveTab} />
      )}
    </AppLayout>
  );
};

export default App;
