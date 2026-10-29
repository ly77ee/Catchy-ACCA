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
import { StudyMaterials } from './components/study-materials/StudyMaterials';
import { Questions } from './components/questions/Questions';
import { ExamEnvironment } from './components/exam/ExamEnvironment';
import { Settings } from './components/settings/Settings';
import { Help } from './components/help/Help';
import { ComingSoon } from './components/common/ComingSoon';

// Icons for Future Modules
import { FileCheck, Table2, PenTool, TrendingUp, Bot } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [versionId, setVersionId] = useState<string>('current_2024_2026');
  const [isDbReady, setIsDbReady] = useState(false);

  // Cross-component navigation state (e.g. from question click -> open PDF at specific page)
  const [activePdfMaterialId, setActivePdfMaterialId] = useState<string | null>(null);
  const [activePdfPage, setActivePdfPage] = useState<number>(1);

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
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-acca-red border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-base font-bold text-gray-800">Initializing Catchy ACCA...</h2>
        <p className="text-xs text-gray-500 mt-1">Preparing local IndexedDB and study data</p>
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

      {/* Future Phase: Excel Workspace */}
      {activeTab === 'excel-workspace' && (
        <ComingSoon
          title="Excel Spreadsheet Workspace"
          phase="Phase 2"
          description="In-built spreadsheet calculations matching the ACCA CBE response sheet specifications. Perform live financial modeling, ratios, and balance sheet reconciliations."
          plannedFeatures={[
            'Full formula calculations (SUM, NPV, IRR, AVERAGE, IF, LOOKUP).',
            'Pre-formatted financial statements (Statement of Financial Position, Profit or Loss, Cash Flows).',
            'Cell formatting, bolding, underline, borders, and number formatting.',
            'Automatic cross-linking with Section C questions.'
          ]}
          icon={Table2}
        />
      )}

      {/* Future Phase: Answer Writer */}
      {activeTab === 'answer-writer' && (
        <ComingSoon
          title="Constructed Answer Writer"
          phase="Phase 3"
          description="A dedicated word processing environment built specifically for ACCA theory, essay, and case study responses (e.g. SBL, SBR, AAA)."
          plannedFeatures={[
            'Clean markdown and rich-text word processor.',
            'Word count, time tracking, and professional presentation formatting.',
            'Standard ACCA answer structuring guides (Heading, Issue, Rule, Application, Conclusion).',
            'Persistent draft history with side-by-side question review.'
          ]}
          icon={PenTool}
        />
      )}

      {/* Future Phase: Revision & Progress Analytics */}
      {activeTab === 'revision-progress' && (
        <ComingSoon
          title="Revision & Analytics Engine"
          phase="Phase 3"
          description="Deep analytics on your study pacing, question attempts, doubt resolution trends, and readiness heatmaps across all syllabus syllabus areas."
          plannedFeatures={[
            'Topic-level mastery matrix (identifying high-frequency and weak exam areas).',
            'Weekly study pace tracking vs target exam session.',
            'Mark progression curves across question attempts.',
            'Exportable revision checklist.'
          ]}
          icon={TrendingUp}
        />
      )}

      {/* Future Phase: AI Assistant */}
      {activeTab === 'ai-assistant' && (
        <ComingSoon
          title="AI ACCA Study Assistant"
          phase="Phase 4"
          description="An optional, privacy-respecting study mentor designed to help explain complex accounting standards (IFRS/IAS), dissect technical examiner articles, and review draft answers."
          plannedFeatures={[
            'Strictly optional with zero mandatory cloud subscriptions (BYOK / local model ready).',
            'Clear consent indicators before processing any external prompts.',
            'Trained prompt templates for IFRS interpretations and audit risk formulation.',
            'Doubt clarifier that grounds responses in official syllabus outlines.'
          ]}
          icon={Bot}
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
