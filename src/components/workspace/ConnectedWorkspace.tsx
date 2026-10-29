import React, { useState } from 'react';
import { AnswerWriter } from '../writer/AnswerWriter';
import { SpreadsheetWorkspace } from '../spreadsheet/SpreadsheetWorkspace';
import { QuestionRecord, QualificationVersion } from '../../types';
import { Columns, FileText, Table2 } from 'lucide-react';

interface ConnectedWorkspaceProps {
  version: QualificationVersion;
  allQuestions: QuestionRecord[];
  initialQuestionId?: string;
  initialPaperId?: string;
  defaultMode?: 'writer' | 'spreadsheet' | 'split';
}

export const ConnectedWorkspace: React.FC<ConnectedWorkspaceProps> = ({
  version,
  allQuestions,
  initialQuestionId,
  initialPaperId = 'FR',
  defaultMode = 'split',
}) => {
  const [viewMode, setViewMode] = useState<'writer' | 'spreadsheet' | 'split'>(defaultMode);
  const [linkedQuestionId, setLinkedQuestionId] = useState<string | undefined>(initialQuestionId);
  const [linkedPaperId, setLinkedPaperId] = useState<string>(initialPaperId);

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12">
      {/* Workspace View Switcher Bar */}
      <div className="bg-[#1e1e24] rounded-2xl border border-[#2a2a34] p-3 shadow-xs flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400 mr-2">
            Workspace Mode:
          </span>

          <button
            type="button"
            onClick={() => setViewMode('split')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all ${
              viewMode === 'split'
                ? 'bg-acca-red text-white shadow-xs'
                : 'text-gray-300 hover:bg-[#25252e] hover:text-white'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>Split Screen (Word + Excel)</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('writer')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all ${
              viewMode === 'writer'
                ? 'bg-acca-red text-white shadow-xs'
                : 'text-gray-300 hover:bg-[#25252e] hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Answer Writer Only</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('spreadsheet')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all ${
              viewMode === 'spreadsheet'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-gray-300 hover:bg-[#25252e] hover:text-white'
            }`}
          >
            <Table2 className="w-3.5 h-3.5" />
            <span>Spreadsheet Only</span>
          </button>
        </div>

        <span className="text-xs text-gray-400 font-medium hidden md:inline">
          Both workspaces synchronize with your selected ACCA paper & question
        </span>
      </div>

      {/* Render based on view mode */}
      {viewMode === 'split' ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
          <div className="min-w-0">
            <AnswerWriter
              version={version}
              allQuestions={allQuestions}
              initialQuestionId={linkedQuestionId}
              initialPaperId={linkedPaperId}
              onSelectQuestion={setLinkedQuestionId}
              onOpenSpreadsheet={() => setViewMode('spreadsheet')}
            />
          </div>
          <div className="min-w-0">
            <SpreadsheetWorkspace
              version={version}
              allQuestions={allQuestions}
              initialQuestionId={linkedQuestionId}
              initialPaperId={linkedPaperId}
              onSelectQuestion={setLinkedQuestionId}
              onOpenWriter={() => setViewMode('writer')}
            />
          </div>
        </div>
      ) : viewMode === 'writer' ? (
        <AnswerWriter
          version={version}
          allQuestions={allQuestions}
          initialQuestionId={linkedQuestionId}
          initialPaperId={linkedPaperId}
          onSelectQuestion={setLinkedQuestionId}
          onOpenSpreadsheet={() => setViewMode('split')}
        />
      ) : (
        <SpreadsheetWorkspace
          version={version}
          allQuestions={allQuestions}
          initialQuestionId={linkedQuestionId}
          initialPaperId={linkedPaperId}
          onSelectQuestion={setLinkedQuestionId}
          onOpenWriter={() => setViewMode('split')}
        />
      )}
    </div>
  );
};
