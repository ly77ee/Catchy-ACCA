import React, { useState } from 'react';
import {
  ExamConfig,
  QuestionRecord,
  StudyMaterial,
  QualificationVersion,
  ExamAttemptRecord
} from '../../types';
import { ExamSetup } from './ExamSetup';
import { ExamSession } from './ExamSession';
import { ExamResults } from './ExamResults';
import { AttemptHistoryList } from './AttemptHistoryList';
import { prepareExamQuestions } from '../../utils/examScoring';
import { saveExamAttempt } from '../../db';
import { FileCheck, History } from 'lucide-react';

interface ExamEnvironmentProps {
  version: QualificationVersion;
  allQuestions: QuestionRecord[];
  materials: StudyMaterial[];
  examAttempts: ExamAttemptRecord[];
  defaultPaperId?: string;
  onOpenQuestionInManager?: (questionId: string) => void;
}

export const ExamEnvironment: React.FC<ExamEnvironmentProps> = ({
  version,
  allQuestions,
  materials,
  examAttempts,
  defaultPaperId = 'FR',
  onOpenQuestionInManager,
}) => {
  const [activeTab, setActiveTab] = useState<'simulator' | 'history'>('simulator');
  const [currentView, setCurrentView] = useState<'setup' | 'session' | 'results'>('setup');

  const [activeConfig, setActiveConfig] = useState<ExamConfig | null>(null);
  const [sessionQuestions, setSessionQuestions] = useState<QuestionRecord[]>([]);
  const [activeAttempt, setActiveAttempt] = useState<ExamAttemptRecord | null>(null);

  // Start exam from Setup
  const handleStartExam = (config: ExamConfig) => {
    const prepared = prepareExamQuestions(allQuestions, config);
    if (prepared.length === 0) {
      alert('No matching questions found for the chosen filters. Please adjust your criteria.');
      return;
    }
    setActiveConfig(config);
    setSessionQuestions(prepared);
    setCurrentView('session');
  };

  // Finish exam from Session
  const handleFinishExam = async (attempt: ExamAttemptRecord) => {
    await saveExamAttempt(attempt);
    setActiveAttempt(attempt);
    setCurrentView('results');
  };

  // Retake same questions
  const handleRetake = () => {
    if (activeConfig && sessionQuestions.length > 0) {
      setCurrentView('session');
    } else {
      setCurrentView('setup');
    }
  };

  // Select historical attempt to review
  const handleSelectHistoricalAttempt = (attempt: ExamAttemptRecord) => {
    setActiveAttempt(attempt);
    // Find matching question records
    const relevantQuestions = attempt.questionIds
      .map(id => allQuestions.find(q => q.id === id))
      .filter(Boolean) as QuestionRecord[];
    setSessionQuestions(relevantQuestions);
    setCurrentView('results');
    setActiveTab('simulator');
  };

  // If in an active exam session, show the exam session full-screen
  if (currentView === 'session' && activeConfig && sessionQuestions.length > 0) {
    return (
      <ExamSession
        config={activeConfig}
        questions={sessionQuestions}
        onFinishExam={handleFinishExam}
        onExitWithoutSaving={() => setCurrentView('setup')}
      />
    );
  }

  // If viewing results
  if (currentView === 'results' && activeAttempt) {
    return (
      <ExamResults
        attempt={activeAttempt}
        questions={sessionQuestions}
        onRetake={handleRetake}
        onNewExam={() => setCurrentView('setup')}
        onOpenQuestionInManager={onOpenQuestionInManager}
      />
    );
  }

  // Default: Tabbed view (Setup vs History)
  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Environment Mode Switcher */}
      <div className="flex items-center space-x-2 border-b border-gray-200 pb-3">
        <button
          onClick={() => {
            setActiveTab('simulator');
            setCurrentView('setup');
          }}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'simulator'
              ? 'bg-acca-red text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>New Exam Simulation</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'history'
              ? 'bg-neutral-900 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Attempt History ({examAttempts.length})</span>
        </button>
      </div>

      {activeTab === 'simulator' ? (
        <ExamSetup
          version={version}
          allQuestions={allQuestions}
          materials={materials}
          defaultPaperId={defaultPaperId}
          onStartExam={handleStartExam}
        />
      ) : (
        <AttemptHistoryList
          attempts={examAttempts}
          allQuestions={allQuestions}
          onSelectAttempt={handleSelectHistoricalAttempt}
          onNewExam={() => {
            setActiveTab('simulator');
            setCurrentView('setup');
          }}
        />
      )}
    </div>
  );
};
