import React from 'react';
import {
  HelpCircle,
  BookOpen,
  Calendar,
  CheckCircle,
  FileText,
  Database,
  ArrowRight
} from 'lucide-react';

interface HelpProps {
  onNavigate: (tabId: string) => void;
}

export const Help: React.FC<HelpProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12 text-gray-100">
      {/* Header */}
      <div className="bg-[#1e1e24] rounded-2xl border border-[#2a2a34] p-6 md:p-8 shadow-xl">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold uppercase tracking-wider text-acca-red bg-red-950/40 px-2.5 py-0.5 rounded-full border border-red-800/40">
            Student Guidance & Documentation
          </span>
          <span className="text-xs text-gray-400">Beginner Friendly</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white mt-1">
          Catchy ACCA User Guide
        </h1>
        <p className="text-sm text-gray-400 mt-1 max-w-2xl">
          Everything you need to know about navigating your qualification, organizing study materials, tracking exam questions, and keeping your records secure.
        </p>
      </div>

      {/* Guide Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1 */}
        <div className="bg-[#1e1e24] rounded-2xl border border-[#2a2a34] p-6 shadow-xl space-y-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-red-950/40 text-acca-red rounded-xl border border-red-800/40">
              <Calendar className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-base">Tracking Your Qualification</h3>
          </div>
          <p className="text-xs text-gray-300 leading-relaxed">
            ACCA requires passing 13 exam papers (3 Applied Knowledge + 6 Applied Skills + 2 Strategic Essentials + 2 Strategic Options) and completing the Ethics & Professional Skills Module (EPSM).
          </p>
          <ul className="text-xs text-gray-400 list-disc pl-5 space-y-1">
            <li>Update your status (Passed, In Progress, Exempt, Not Started) anytime in <strong className="text-white">My ACCA</strong>.</li>
            <li>Circular progress rings update instantly to reflect your completion percentage.</li>
            <li>Prior degree exemptions count fully toward your completed exams.</li>
          </ul>
          <button
            onClick={() => onNavigate('my-acca')}
            className="text-xs font-bold text-acca-red hover:underline flex items-center space-x-1 pt-2"
          >
            <span>Open My ACCA</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Card 2 */}
        <div className="bg-[#1e1e24] rounded-2xl border border-[#2a2a34] p-6 shadow-xl space-y-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-red-950/40 text-acca-red rounded-xl border border-red-800/40">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-base">Study Materials & PDF Library</h3>
          </div>
          <p className="text-xs text-gray-300 leading-relaxed">
            Import your study texts, revision kits, and past papers directly from your computer. Documents are stored 100% locally on your machine in IndexedDB.
          </p>
          <ul className="text-xs text-gray-400 list-disc pl-5 space-y-1">
            <li>Fast local PDF rendering with full zoom, page jump, and text selection.</li>
            <li>No files are ever uploaded to cloud servers or third parties.</li>
            <li>Assign documents to specific ACCA papers to keep them organized.</li>
          </ul>
          <button
            onClick={() => onNavigate('study-materials')}
            className="text-xs font-bold text-acca-red hover:underline flex items-center space-x-1 pt-2"
          >
            <span>Open Study Materials</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Card 3: Question Checklist & Study Progress */}
        <div className="bg-[#1e1e24] rounded-2xl border border-[#2a2a34] p-6 shadow-xl space-y-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-red-950/40 text-acca-red rounded-xl border border-red-800/40">
              <CheckCircle className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-base">Question Checklist & Study Progress</h3>
          </div>
          <p className="text-xs text-gray-300 leading-relaxed">
            Create custom question checklists, import past exam task lists line-by-line, and monitor your topic mastery across all ACCA papers.
          </p>
          <ul className="text-xs text-gray-400 list-disc pl-5 space-y-1">
            <li>Type tasks line-by-line or paste to instantly generate clean checklists.</li>
            <li>Assign checklists to specific ACCA papers (FR, PM, SBR, etc.) to track coverage.</li>
            <li>Monitor syllabus chapter mastery in the Progress tracker with automatic saving.</li>
          </ul>
          <button
            onClick={() => onNavigate('checklist')}
            className="text-xs font-bold text-acca-red hover:underline flex items-center space-x-1 pt-2"
          >
            <span>Open Question Checklist</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Card 4 */}
        <div className="bg-[#1e1e24] rounded-2xl border border-[#2a2a34] p-6 shadow-xl space-y-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-red-950/40 text-acca-red rounded-xl border border-red-800/40">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-base">Data Backup & Device Portability</h3>
          </div>
          <p className="text-xs text-gray-300 leading-relaxed">
            Your progress is saved automatically. For extra peace of mind or moving between laptops:
          </p>
          <ul className="text-xs text-gray-400 list-disc pl-5 space-y-1">
            <li>Go to <strong className="text-white">Settings</strong> and click <strong className="text-white">Download JSON Backup</strong>.</li>
            <li>Restore on any device using the safe merge or replace options.</li>
            <li>All files, questions, notes, and progress remain 100% private to you.</li>
          </ul>
          <button
            onClick={() => onNavigate('settings')}
            className="text-xs font-bold text-acca-red hover:underline flex items-center space-x-1 pt-2"
          >
            <span>Open Settings & Backup</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Credit footer */}
      <div className="bg-[#1e1e24] rounded-2xl border border-[#2a2a34] p-6 shadow-xl flex items-center justify-between text-xs text-gray-400">
        <div>
          <strong className="text-white">Catchy ACCA</strong> · An open-source desktop study companion for ACCA students worldwide.
        </div>
        <span className="font-bold text-gray-300">by ly77ee</span>
      </div>
    </div>
  );
};
