import React, { useState } from 'react';
import {
  StudentPaperRecord,
  QualificationVersion,
  StageId
} from '../../types';
import { QUALIFICATION_VERSIONS, calculateProgressSummary } from '../../config/accaStructure';
import { CircularProgress } from '../common/CircularProgress';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { db, logActivity } from '../../db';
import { Info, CheckCircle2, Award, Calendar, Bookmark, Edit2 } from 'lucide-react';

interface MyAccaProps {
  currentVersionId: string;
  onVersionChange: (versionId: string) => void;
  paperRecords: Record<string, StudentPaperRecord>;
}

export const MyAcca: React.FC<MyAccaProps> = ({
  currentVersionId,
  onVersionChange,
  paperRecords,
}) => {
  const activeVersion = QUALIFICATION_VERSIONS.find(v => v.versionId === currentVersionId) || QUALIFICATION_VERSIONS[0];
  const summary = calculateProgressSummary(activeVersion, paperRecords);

  // Filter stage
  const [selectedStage, setSelectedStage] = useState<StageId | 'all'>('all');

  // Modal edit state
  const [editingPaperId, setEditingPaperId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<StudentPaperRecord['status']>('not_started');
  const [editScore, setEditScore] = useState<number | undefined>(undefined);
  const [editSession, setEditSession] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const handleOpenEdit = (paperId: string) => {
    const existing = paperRecords[paperId];
    setEditingPaperId(paperId);
    setEditStatus(existing ? existing.status : 'not_started');
    setEditScore(existing?.score);
    setEditSession(existing?.examSession || '');
    setEditNotes(existing?.notes || '');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPaperId) return;

    const record: StudentPaperRecord = {
      paperId: editingPaperId,
      status: editStatus,
      score: editScore,
      examSession: editSession,
      notes: editNotes,
      updatedAt: new Date().toISOString()
    };

    await db.paperRecords.put(record);
    await logActivity(
      'Paper Status Updated',
      `Updated ${editingPaperId} (${editStatus.replace('_', ' ').toUpperCase()}) in My ACCA.`,
      'paper'
    );
    setEditingPaperId(null);
  };

  const filteredStages = selectedStage === 'all'
    ? summary.stageProgress
    : summary.stageProgress.filter(s => s.stage.id === selectedStage);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header & Syllabus Version Switcher */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-6 md:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-gray-100">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider text-acca-red bg-red-50 px-2.5 py-0.5 rounded-full">
                Syllabus Architecture
              </span>
              <span className="text-xs text-gray-400">Official Standards Compliant</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 mt-1">
              My ACCA Qualification Journey
            </h1>
            <p className="text-sm text-gray-500 mt-1 max-w-2xl">
              Track your journey through Applied Knowledge, Applied Skills, and Strategic Professional. Switching syllabus frameworks retains all completed exams and historical progress.
            </p>
          </div>

          {/* Structure Version Switcher */}
          <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 min-w-[280px]">
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
              Qualification Framework
            </label>
            <select
              value={currentVersionId}
              onChange={(e) => onVersionChange(e.target.value)}
              className="w-full text-xs font-medium bg-white border border-gray-300 rounded-lg p-2 text-gray-900 outline-none focus:border-acca-red"
            >
              {QUALIFICATION_VERSIONS.map(v => (
                <option key={v.versionId} value={v.versionId}>
                  {v.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-gray-400 mt-1.5 leading-tight">
              Effective from {activeVersion.effectiveFrom}
            </p>
          </div>
        </div>

        {/* Transition Rule Banner */}
        <div className="mt-6 flex items-start space-x-3 bg-red-50/50 border border-red-100 rounded-xl p-4 text-xs text-gray-700">
          <Info className="w-5 h-5 text-acca-red shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold text-gray-900">ACCA Transition Rule Guarantee: </span>
            {activeVersion.description} Under official ACCA transition regulations, all passes and exemptions are permanent credits. Changing your framework view does not alter or reset your recorded exam accomplishments.
          </div>
        </div>

        {/* Aggregate Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200/70">
            <span className="text-xs font-bold text-gray-500 uppercase">Total Required Exams</span>
            <div className="text-2xl font-black text-gray-900 mt-1">13 <span className="text-xs font-normal text-gray-500">(+ EPSM)</span></div>
          </div>
          <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-200/70">
            <span className="text-xs font-bold text-emerald-800 uppercase">Passed or Exempt</span>
            <div className="text-2xl font-black text-emerald-800 mt-1">{summary.totalCompletedOrExempt} <span className="text-xs font-normal text-emerald-600">({summary.overallPercentage}%)</span></div>
          </div>
          <div className="p-4 bg-amber-50/70 rounded-xl border border-amber-200/70">
            <span className="text-xs font-bold text-amber-800 uppercase">Actively In Progress</span>
            <div className="text-2xl font-black text-amber-800 mt-1">{summary.inProgressCount}</div>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200/70">
            <span className="text-xs font-bold text-gray-500 uppercase">Remaining to Qualify</span>
            <div className="text-2xl font-black text-gray-800 mt-1">{summary.totalRequired - summary.totalCompletedOrExempt}</div>
          </div>
        </div>
      </div>

      {/* Filter by Stage */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedStage('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
            selectedStage === 'all'
              ? 'bg-acca-red text-white'
              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          All Stages ({summary.stageProgress.length})
        </button>
        {summary.stageProgress.map(({ stage }) => (
          <button
            key={stage.id}
            onClick={() => setSelectedStage(stage.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedStage === stage.id
                ? 'bg-acca-red text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {stage.name}
          </button>
        ))}
      </div>

      {/* Stage Breakdown Sections */}
      <div className="space-y-6">
        {filteredStages.map(({ stage, completed, required, percentage, papers }) => (
          <div key={stage.id} className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
              <div className="flex items-center space-x-4">
                <CircularProgress
                  percentage={percentage}
                  size={48}
                  strokeWidth={5}
                  color={percentage === 100 ? '#16A34A' : '#C00000'}
                />
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{stage.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{stage.description}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 text-xs font-semibold">
                <span className="px-2.5 py-1 bg-gray-100 rounded-lg text-gray-700">
                  {completed} / {required} Papers Completed
                </span>
                {percentage === 100 && (
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Stage Fulfilled</span>
                  </span>
                )}
              </div>
            </div>

            {/* Papers Table */}
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 uppercase tracking-wider font-semibold">
                    <th className="py-2.5 px-3">Code</th>
                    <th className="py-2.5 px-3">Official Paper Name</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Session</th>
                    <th className="py-2.5 px-3">Score</th>
                    <th className="py-2.5 px-3">Notes</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {papers.map((paper) => {
                    const record = paper.record;
                    const status = paper.status as StudentPaperRecord['status'];

                    return (
                      <tr key={paper.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-3 px-3 font-bold text-gray-900 whitespace-nowrap">
                          {paper.code}
                          {paper.isOptional && (
                            <span className="ml-1 text-[10px] text-amber-700 bg-amber-50 px-1 py-0.5 rounded border border-amber-200">
                              Optional
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-medium text-gray-800">
                          {paper.name}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <Badge status={status} />
                        </td>
                        <td className="py-3 px-3 text-gray-600 whitespace-nowrap">
                          {record?.examSession || '—'}
                        </td>
                        <td className="py-3 px-3 font-semibold text-gray-900 whitespace-nowrap">
                          {record?.score !== undefined ? `${record.score}%` : '—'}
                        </td>
                        <td className="py-3 px-3 text-gray-500 max-w-xs truncate">
                          {record?.notes || '—'}
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <button
                            onClick={() => handleOpenEdit(paper.id)}
                            className="inline-flex items-center space-x-1 text-acca-red hover:text-acca-red-dark font-semibold px-2 py-1 rounded hover:bg-red-50"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Paper Modal */}
      {editingPaperId && (
        <Modal
          isOpen={!!editingPaperId}
          onClose={() => setEditingPaperId(null)}
          title={`Update Exam Record: ${editingPaperId}`}
        >
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Paper Status
              </label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as any)}
                className="w-full text-sm border border-gray-300 rounded-lg p-2.5 outline-none focus:border-acca-red"
              >
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="passed">Passed</option>
                <option value="exempt">Exempt (Prior Academic/Degree Exemption)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Exam Session
                </label>
                <input
                  type="text"
                  placeholder="e.g. December 2026"
                  value={editSession}
                  onChange={(e) => setEditSession(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-lg p-2.5 outline-none focus:border-acca-red"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Achieved Mark (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="e.g. 74"
                  value={editScore ?? ''}
                  onChange={(e) => setEditScore(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full text-sm border border-gray-300 rounded-lg p-2.5 outline-none focus:border-acca-red"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Study Notes & Exam Technique
              </label>
              <textarea
                rows={3}
                placeholder="Revision notes, standard interpretations, personal feedback..."
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg p-2.5 outline-none focus:border-acca-red"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setEditingPaperId(null)}
                className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-acca-red hover:bg-acca-red-dark rounded-lg"
              >
                Save Record
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
