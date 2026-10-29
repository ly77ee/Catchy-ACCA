import React, { useState, useRef } from 'react';
import {
  Download,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Database,
  ShieldCheck,
  RefreshCw,
  FileJson,
  Info,
  Heart
} from 'lucide-react';
import {
  createBackupPayload,
  validateBackupPayload,
  restoreBackup,
  RestoreValidationResult
} from '../../db';
import { Modal } from '../common/Modal';

interface SettingsProps {
  currentVersionId: string;
  onRefreshData: () => void;
}

export const Settings: React.FC<SettingsProps> = ({
  currentVersionId,
  onRefreshData,
}) => {
  const [backupSuccessMessage, setBackupSuccessMessage] = useState<string | null>(null);

  // Restore states
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreData, setRestoreData] = useState<any | null>(null);
  const [validationResult, setValidationResult] = useState<RestoreValidationResult | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [restoreMode, setRestoreMode] = useState<'merge' | 'overwrite'>('merge');
  const [restoreStatus, setRestoreStatus] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Handle Export Backup
  const handleExportBackup = async () => {
    try {
      const payload = await createBackupPayload(currentVersionId);
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
      const downloadAnchor = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `catchy-acca-backup-${dateStr}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setBackupSuccessMessage('Backup successfully generated and saved to your downloads!');
      setTimeout(() => setBackupSuccessMessage(null), 4000);
    } catch (err: any) {
      alert('Failed to create backup: ' + err.message);
    }
  };

  // Handle File Input for Restore
  const handleSelectRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoreFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const result = validateBackupPayload(json);
        setRestoreData(json);
        setValidationResult(result);
        if (result.isValid) {
          setIsConfirmModalOpen(true);
        }
      } catch (err) {
        setValidationResult({
          isValid: false,
          error: 'The uploaded file is not valid JSON.'
        });
      }
    };
    reader.readAsText(file);
  };

  // Execute restore after user confirmation
  const handleExecuteRestore = async () => {
    if (!restoreData || !validationResult?.isValid) return;

    try {
      setRestoreStatus('Restoring records...');
      await restoreBackup(restoreData, restoreMode);
      setRestoreStatus(null);
      setIsConfirmModalOpen(false);
      setRestoreFile(null);
      setRestoreData(null);
      onRefreshData();
      alert(`Catchy ACCA data restored successfully in ${restoreMode} mode!`);
    } catch (err: any) {
      setRestoreStatus(null);
      alert('Restore failed: ' + err.message);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-xs">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold uppercase tracking-wider text-acca-red bg-red-50 px-2.5 py-0.5 rounded-full">
            Settings & Local Storage
          </span>
          <span className="text-xs text-gray-400">Offline Integrity</span>
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900 mt-1">
          Persistence, Backup & System Info
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your local IndexedDB storage, export portable backups, and review system licenses.
        </p>
      </div>

      {/* Local Persistence Architecture Explanation */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-xs space-y-4">
        <div className="flex items-center space-x-3 pb-3 border-b border-gray-100">
          <Database className="w-5 h-5 text-acca-red" />
          <h2 className="text-base font-bold text-gray-900">
            Local Persistence Architecture
          </h2>
        </div>

        <div className="prose prose-sm text-gray-600 leading-relaxed space-y-2 text-xs">
          <p>
            Catchy ACCA utilizes <strong>IndexedDB</strong> as its primary on-device storage engine through <strong>Dexie.js</strong>.
          </p>
          <ul className="list-disc pl-5 space-y-1 text-gray-700">
            <li>
              <strong>Zero External Tracking:</strong> All student exam scores, notes, questions, and uploaded PDF documents are stored locally in your browser's private sandboxed IndexedDB.
            </li>
            <li>
              <strong>No Account Required:</strong> You don't need to log in, register, or connect a cloud account to use any of the core study tools.
            </li>
            <li>
              <strong>Large File Support:</strong> IndexedDB natively stores binary blobs (study PDFs) up to several gigabytes without slowing down application memory.
            </li>
            <li>
              <strong>Reliable Restart Resilience:</strong> All your progress, questions, doubt flags, and study targets survive closing and reopening the application or browser tab.
            </li>
          </ul>
        </div>
      </div>

      {/* Backup and Restore Box */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export Backup */}
        <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Download className="w-5 h-5 text-acca-red" />
              <h3 className="text-base font-bold text-gray-900">Export Backup</h3>
            </div>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              Export your papers progress, questions, doubt flags, and study plans to a structured JSON file. Keep a safe copy or transfer your study data to another device.
            </p>

            {backupSuccessMessage && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{backupSuccessMessage}</span>
              </div>
            )}
          </div>

          <button
            onClick={handleExportBackup}
            className="w-full bg-gray-900 hover:bg-black text-white text-xs font-bold py-2.5 rounded-xl flex items-center justify-center space-x-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Download JSON Backup</span>
          </button>
        </div>

        {/* Restore Backup */}
        <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Upload className="w-5 h-5 text-acca-red" />
              <h3 className="text-base font-bold text-gray-900">Restore from Backup</h3>
            </div>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              Restore previously exported Catchy ACCA backups. Includes schema format validation, pre-import preview, and choice between merging or replacing records.
            </p>

            {validationResult && !validationResult.isValid && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-acca-red flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{validationResult.error}</span>
              </div>
            )}
          </div>

          <div>
            <input
              type="file"
              ref={fileInputRef}
              accept="application/json,.json"
              onChange={handleSelectRestoreFile}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full bg-white border border-gray-300 hover:border-gray-400 text-gray-800 text-xs font-bold py-2.5 rounded-xl flex items-center justify-center space-x-2 transition-colors"
            >
              <FileJson className="w-4 h-4 text-acca-red" />
              <span>Select Backup File (.json)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Attribution & Dependency / License Inventory */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-acca-red" />
            <h2 className="text-base font-bold text-gray-900">
              Licensing & Open Source Inventory
            </h2>
          </div>
          <span className="text-xs font-semibold text-gray-500">
            Catchy ACCA · by ly77ee
          </span>
        </div>

        <p className="text-xs text-gray-600 leading-relaxed">
          Catchy ACCA is an open-source educational study tool. Built strictly with modern, maintained, permissive MIT/Apache 2.0 open-source libraries:
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/60">
            <span className="font-bold text-gray-900 block">React 18</span>
            <span className="text-[11px] text-gray-500">MIT License • UI Runtime</span>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/60">
            <span className="font-bold text-gray-900 block">TypeScript</span>
            <span className="text-[11px] text-gray-500">Apache 2.0 • Type Safety</span>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/60">
            <span className="font-bold text-gray-900 block">Dexie.js</span>
            <span className="text-[11px] text-gray-500">Apache 2.0 • IndexedDB Engine</span>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/60">
            <span className="font-bold text-gray-900 block">PDF.js</span>
            <span className="text-[11px] text-gray-500">Apache 2.0 • Local PDF Rendering</span>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/60">
            <span className="font-bold text-gray-900 block">Tailwind CSS</span>
            <span className="text-[11px] text-gray-500">MIT License • Design System</span>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/60">
            <span className="font-bold text-gray-900 block">Lucide Icons</span>
            <span className="text-[11px] text-gray-500">ISC License • Minimalist Icons</span>
          </div>
        </div>

        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-[11px] text-gray-500 leading-relaxed">
          <strong>Important ACCA Disclaimer:</strong> Catchy ACCA is not affiliated with, endorsed by, or associated with the Association of Chartered Certified Accountants (ACCA). All ACCA qualifications, paper names, and trademarks belong to ACCA. No proprietary publisher question banks (Kaplan, BPP) are distributed with this software.
        </div>
      </div>

      {/* Confirmation Modal for Restore */}
      <Modal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        title="Confirm Backup Restoration"
      >
        <div className="space-y-4">
          <p className="text-xs text-gray-600">
            The backup file has been validated successfully. Review the contents below before proceeding:
          </p>

          {validationResult?.summary && (
            <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-500">Exported At:</span>
                <span className="font-semibold text-gray-900">
                  {new Date(validationResult.summary.exportedAt).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Paper Records:</span>
                <span className="font-semibold text-gray-900">{validationResult.summary.papersCount} papers</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Question Records:</span>
                <span className="font-semibold text-gray-900">{validationResult.summary.questionsCount} questions</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Study Plan Items:</span>
                <span className="font-semibold text-gray-900">{validationResult.summary.plansCount} items</span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
              Restoration Mode
            </label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2 text-xs text-gray-800 cursor-pointer">
                <input
                  type="radio"
                  name="restoreMode"
                  value="merge"
                  checked={restoreMode === 'merge'}
                  onChange={() => setRestoreMode('merge')}
                  className="text-acca-red focus:ring-acca-red"
                />
                <span><strong>Safe Merge (Recommended):</strong> Updates existing records and adds new ones without deleting your other entries.</span>
              </label>
              <label className="flex items-center space-x-2 text-xs text-gray-800 cursor-pointer">
                <input
                  type="radio"
                  name="restoreMode"
                  value="overwrite"
                  checked={restoreMode === 'overwrite'}
                  onChange={() => setRestoreMode('overwrite')}
                  className="text-acca-red focus:ring-acca-red"
                />
                <span><strong>Complete Replace:</strong> Wipes current data and replaces everything with the backup file.</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsConfirmModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExecuteRestore}
              className="px-4 py-2 text-xs font-bold text-white bg-acca-red hover:bg-acca-red-dark rounded-lg"
            >
              Confirm and Restore
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
