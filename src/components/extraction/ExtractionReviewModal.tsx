import React, { useState } from 'react';
import {
  ExtractedQuestionDraft,
  QuestionRecord,
  QuestionOption,
  QuestionType
} from '../../types';
import {
  CheckCircle2,
  AlertTriangle,
  X,
  Plus,
  Trash2,
  Sparkles,
  BookOpen,
  Edit2,
  Tag,
  Check
} from 'lucide-react';
import { db, logActivity } from '../../db';

interface ExtractionReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  drafts: ExtractedQuestionDraft[];
  materialTitle: string;
  onQuestionsSaved: () => void;
}

export const ExtractionReviewModal: React.FC<ExtractionReviewModalProps> = ({
  isOpen,
  onClose,
  drafts: initialDrafts,
  materialTitle,
  onQuestionsSaved,
}) => {
  const [drafts, setDrafts] = useState<ExtractedQuestionDraft[]>(initialDrafts);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);

  // Sync when initialDrafts changes
  React.useEffect(() => {
    setDrafts(initialDrafts);
    setSelectedIndex(0);
  }, [initialDrafts]);

  if (!isOpen || drafts.length === 0) return null;

  const currentDraft = drafts[selectedIndex];

  // Update current draft field
  const updateCurrentDraft = (field: keyof ExtractedQuestionDraft, value: any) => {
    setDrafts(prev => {
      const updated = [...prev];
      updated[selectedIndex] = {
        ...updated[selectedIndex],
        [field]: value
      };
      return updated;
    });
  };

  // Toggle approval checkbox
  const toggleApproval = (index: number) => {
    setDrafts(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        isApproved: !updated[index].isApproved
      };
      return updated;
    });
  };

  // Option management for current draft
  const handleOptionTextChange = (optIdx: number, newText: string) => {
    const updatedOptions = [...(currentDraft.options || [])];
    updatedOptions[optIdx] = { ...updatedOptions[optIdx], text: newText };
    updateCurrentDraft('options', updatedOptions);
  };

  const handleToggleCorrectOption = (optLabel: string) => {
    let keys = [...(currentDraft.correctOptionIds || [])];
    if (keys.includes(optLabel)) {
      keys = keys.filter(k => k !== optLabel);
    } else {
      if (currentDraft.questionType === 'section_a_mcq') {
        keys = [optLabel]; // single select
      } else {
        keys.push(optLabel); // multi select
      }
    }
    updateCurrentDraft('correctOptionIds', keys);
  };

  const handleAddOption = () => {
    const existingLabels = (currentDraft.options || []).map(o => o.label);
    const alphabet = ['A', 'B', 'C', 'D', 'E', 'F'];
    const nextLabel = alphabet.find(l => !existingLabels.includes(l)) || 'X';
    const newOpt: QuestionOption = {
      id: nextLabel,
      label: nextLabel,
      text: ''
    };
    updateCurrentDraft('options', [...(currentDraft.options || []), newOpt]);
  };

  const handleRemoveOption = (optIdx: number) => {
    const removedLabel = currentDraft.options[optIdx]?.label;
    const updatedOptions = currentDraft.options.filter((_, idx) => idx !== optIdx);
    const updatedKeys = (currentDraft.correctOptionIds || []).filter(k => k !== removedLabel);
    updateCurrentDraft('options', updatedOptions);
    updateCurrentDraft('correctOptionIds', updatedKeys);
  };

  // Topic suggestion approvals/rejections
  const handleApproveTopic = (topic: string) => {
    if (!currentDraft.topicSuggestions.includes(topic)) {
      updateCurrentDraft('topicSuggestions', [...currentDraft.topicSuggestions, topic]);
    }
  };

  const handleRejectTopic = (topic: string) => {
    updateCurrentDraft(
      'topicSuggestions',
      currentDraft.topicSuggestions.filter(t => t !== topic)
    );
  };

  // Final batch save to IndexedDB
  const handleSaveApprovedQuestions = async () => {
    setIsSaving(true);
    const approvedDrafts = drafts.filter(d => d.isApproved);

    if (approvedDrafts.length === 0) {
      alert('No questions selected for import. Check at least one question.');
      setIsSaving(false);
      return;
    }

    try {
      const now = new Date().toISOString();
      const materialId = approvedDrafts[0]?.sourceMaterialId;
      let existingMap = new Map<string, QuestionRecord>();

      if (materialId) {
        const existing = await db.questions
          .where('sourceMaterialId')
          .equals(materialId)
          .toArray();
        existingMap = new Map(existing.map(q => [q.id, q]));
      }

      const recordsToInsert: QuestionRecord[] = approvedDrafts.map((d) => {
        const cleanQNum = d.questionNumber.replace(/[^A-Za-z0-9_-]/g, '_');
        const id = `q-${d.sourceMaterialId}-${cleanQNum}`;
        const prev = existingMap.get(id);

        return {
          id,
          questionNumber: d.questionNumber,
          title: d.title,
          paperId: d.paperId,
          sourceMaterialId: d.sourceMaterialId,
          sourcePage: d.sourcePageStart,
          sourcePageEnd: d.sourcePageEnd,
          topicTags: d.topicSuggestions,
          questionType: d.questionType,
          notes: d.prompt,
          status: prev ? prev.status : 'not_started',
          isDoubt: prev ? prev.isDoubt : false,
          confidenceRating: prev ? prev.confidenceRating : (Math.round(d.confidenceScore * 5) || 3),
          options: d.options,
          subQuestions: d.subQuestions,
          correctOptionIds: d.correctOptionIds,
          availableMarks: d.availableMarks,
          markingGuide: d.markingGuide,
          solutionPage: d.solutionPage,
          matchStatus: d.matchStatus || 'verified',
          extractedFromPdf: true,
          needsReview: false,
          attempts: prev ? prev.attempts : [],
          createdAt: prev ? prev.createdAt : now,
          updatedAt: now,
        };
      });

      await db.questions.bulkPut(recordsToInsert);
      await logActivity(
        'Questions Extracted & Approved',
        `Imported ${recordsToInsert.length} reviewed questions from "${materialTitle}".`,
        'question'
      );

      setIsSaving(false);
      onQuestionsSaved();
      onClose();
    } catch (err: any) {
      console.error('Failed to save reviewed questions:', err);
      alert('Error saving questions: ' + err.message);
      setIsSaving(false);
    }
  };

  const approvedCount = drafts.filter(d => d.isApproved).length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity" onClick={onClose} />

      <div className="flex min-h-full items-center justify-center p-4">
        <div className="w-full max-w-6xl transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all border border-gray-200 flex flex-col h-[88vh]">
          {/* Header */}
          <div className="bg-neutral-900 px-6 py-4 border-b border-neutral-800 flex items-center justify-between text-white shrink-0">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider text-acca-red bg-neutral-800 px-2.5 py-0.5 rounded-full border border-neutral-700">
                  Question Review & Verification
                </span>
                <span className="text-xs text-neutral-400">Source: {materialTitle}</span>
              </div>
              <h2 className="text-lg font-bold text-white mt-1">
                Review Extracted Questions & Answer Keys
              </h2>
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-xs font-medium text-neutral-300">
                <strong className="text-white font-bold">{approvedCount}</strong> of {drafts.length} Selected for Import
              </span>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main 2-Column Body */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left: Questions List / Index */}
            <div className="w-72 bg-gray-50 border-r border-gray-200 overflow-y-auto p-3 space-y-2 shrink-0">
              <div className="flex items-center justify-between pb-2 px-1 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <span>Extracted Items</span>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setDrafts(prev => prev.map(d => ({ ...d, isApproved: true })))}
                    className="text-[10px] text-acca-red hover:underline"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => setDrafts(prev => prev.map(d => ({ ...d, isApproved: false })))}
                    className="text-[10px] text-gray-500 hover:underline"
                  >
                    Deselect
                  </button>
                </div>
              </div>

              {drafts.map((draft, idx) => {
                const isSelected = selectedIndex === idx;
                return (
                  <div
                    key={draft.tempId}
                    onClick={() => setSelectedIndex(idx)}
                    className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-start space-x-2.5 ${
                      isSelected
                        ? 'bg-white border-acca-red shadow-xs ring-1 ring-acca-red'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={draft.isApproved}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleApproval(idx);
                      }}
                      className="mt-0.5 rounded text-acca-red focus:ring-acca-red border-gray-300"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-gray-900">{draft.questionNumber}</span>
                        <span className="text-[10px] font-bold text-gray-400">p.{draft.sourcePageStart}</span>
                      </div>
                      <p className="text-gray-600 truncate mt-0.5">{draft.title}</p>
                      <div className="flex items-center space-x-1.5 mt-1.5 text-[10px]">
                        <span className="bg-gray-100 text-gray-700 px-1.5 py-0.2 rounded font-semibold">
                          {draft.availableMarks}m
                        </span>
                        {draft.options.length > 0 && (
                          <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded font-semibold">
                            {draft.options.length} opts
                          </span>
                        )}
                        {draft.warningMessages.length > 0 && (
                          <span className="text-amber-600 flex items-center" title={draft.warningMessages[0]}>
                            <AlertTriangle className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right: Focused Question Editor */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {currentDraft && (
                <>
                  {/* Warning Banners if any */}
                  {currentDraft.warningMessages.map((w, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start space-x-2"
                    >
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span>{w}</span>
                    </div>
                  ))}

                  {/* Header Meta Form */}
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        Question No.
                      </label>
                      <input
                        type="text"
                        value={currentDraft.questionNumber}
                        onChange={(e) => updateCurrentDraft('questionNumber', e.target.value)}
                        className="w-full text-xs border border-gray-300 rounded-lg p-2 font-bold outline-none focus:border-acca-red"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        Paper
                      </label>
                      <input
                        type="text"
                        value={currentDraft.paperId}
                        onChange={(e) => updateCurrentDraft('paperId', e.target.value)}
                        className="w-full text-xs border border-gray-300 rounded-lg p-2 font-bold outline-none focus:border-acca-red"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        Marks
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={currentDraft.availableMarks}
                        onChange={(e) => updateCurrentDraft('availableMarks', Number(e.target.value))}
                        className="w-full text-xs border border-gray-300 rounded-lg p-2 font-bold outline-none focus:border-acca-red"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        Source Page
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={currentDraft.sourcePageStart}
                        onChange={(e) => updateCurrentDraft('sourcePageStart', Number(e.target.value))}
                        className="w-full text-xs border border-gray-300 rounded-lg p-2 font-bold outline-none focus:border-acca-red"
                      />
                    </div>
                  </div>

                  {/* Title & Question Type */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        Question Title / Summary
                      </label>
                      <input
                        type="text"
                        value={currentDraft.title}
                        onChange={(e) => updateCurrentDraft('title', e.target.value)}
                        className="w-full text-xs border border-gray-300 rounded-lg p-2 font-medium outline-none focus:border-acca-red"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        Question Type
                      </label>
                      <select
                        value={currentDraft.questionType}
                        onChange={(e) => updateCurrentDraft('questionType', e.target.value as QuestionType)}
                        className="w-full text-xs border border-gray-300 rounded-lg p-2 font-medium outline-none focus:border-acca-red bg-white"
                      >
                        <option value="section_a_mcq">Section A (Single-Select MCQ)</option>
                        <option value="multi_select">Section A/B (Multi-Select)</option>
                        <option value="section_b_case">Section B (OT Case Item)</option>
                        <option value="section_c_constructed">Section C (Constructed Response)</option>
                        <option value="calculation">Financial Calculation</option>
                      </select>
                    </div>
                  </div>

                  {/* Full Prompt Textarea */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      Question Requirement / Scenario Text
                    </label>
                    <textarea
                      rows={4}
                      value={currentDraft.prompt}
                      onChange={(e) => updateCurrentDraft('prompt', e.target.value)}
                      className="w-full text-xs border border-gray-300 rounded-lg p-2.5 font-mono leading-relaxed outline-none focus:border-acca-red"
                    />
                  </div>

                  {/* Objective Options & Answer Key */}
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-700">
                          Options & Correct Answer Key
                        </span>
                        <span className="text-[11px] text-gray-500">
                          (Click the letter pill to mark as the correct answer)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddOption}
                        className="text-xs font-bold text-acca-red hover:underline flex items-center space-x-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Option</span>
                      </button>
                    </div>

                    {currentDraft.options.length === 0 ? (
                      <p className="text-xs text-gray-400 italic py-2">
                        No objective options detected for this question (treated as written/constructed).
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {currentDraft.options.map((opt, optIdx) => {
                          const isCorrect = (currentDraft.correctOptionIds || []).includes(opt.label);
                          return (
                            <div key={opt.id} className="flex items-center space-x-2">
                              {/* Option Label Button toggles correct answer */}
                              <button
                                type="button"
                                onClick={() => handleToggleCorrectOption(opt.label)}
                                className={`w-8 h-8 rounded-lg font-bold text-xs flex items-center justify-center transition-colors shrink-0 ${
                                  isCorrect
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-white border border-gray-300 text-gray-700 hover:border-gray-400'
                                }`}
                                title={isCorrect ? 'Marked as correct option' : 'Click to set as correct option'}
                              >
                                {isCorrect ? <Check className="w-4 h-4" /> : opt.label}
                              </button>

                              <input
                                type="text"
                                value={opt.text}
                                onChange={(e) => handleOptionTextChange(optIdx, e.target.value)}
                                placeholder={`Option ${opt.label} text...`}
                                className="flex-1 text-xs bg-white border border-gray-300 rounded-lg p-2 outline-none focus:border-acca-red"
                              />

                              <button
                                type="button"
                                onClick={() => handleRemoveOption(optIdx)}
                                className="p-1.5 text-gray-400 hover:text-red-500 rounded"
                                title="Remove option"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* SubQuestions & Mark Breakdown */}
                  {currentDraft.subQuestions && currentDraft.subQuestions.length > 0 && (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-700">
                        <span>Subquestions & Mark Breakdown ({currentDraft.subQuestions.length})</span>
                        <span className="text-[11px] text-gray-500 font-normal">Identified structured requirements</span>
                      </div>
                      <div className="space-y-2">
                        {currentDraft.subQuestions.map((sq, sqIdx) => (
                          <div key={sq.id || sqIdx} className="bg-white border border-gray-200 rounded-lg p-3 text-xs space-y-1">
                            <div className="flex items-center justify-between font-bold text-gray-800">
                              <span>Part {sq.label}</span>
                              {sq.marks && <span className="text-acca-red font-mono">{sq.marks} Marks</span>}
                            </div>
                            <p className="text-gray-600 font-mono text-[11px] leading-relaxed">{sq.prompt}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Topic Intelligence Suggestions */}
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
                    <div className="flex items-center space-x-2 text-xs font-bold text-gray-700 uppercase">
                      <Sparkles className="w-4 h-4 text-acca-red" />
                      <span>Topic Intelligence Tags</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {currentDraft.topicSuggestions.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center text-xs font-semibold bg-white border border-gray-300 text-gray-800 px-2.5 py-1 rounded-lg"
                        >
                          <span>#{tag}</span>
                          <button
                            type="button"
                            onClick={() => handleRejectTopic(tag)}
                            className="ml-1.5 text-gray-400 hover:text-red-500"
                            title="Remove tag"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}

                      {/* Input to add manual tag */}
                      <input
                        type="text"
                        placeholder="+ Add custom tag..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const val = (e.target as HTMLInputElement).value.trim();
                            if (val) {
                              handleApproveTopic(val);
                              (e.target as HTMLInputElement).value = '';
                            }
                          }
                        }}
                        className="text-xs bg-white border border-dashed border-gray-300 rounded-lg px-2.5 py-1 outline-none focus:border-acca-red"
                      />
                    </div>
                  </div>

                  {/* Solution / Marking Guide */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      Marking Guide / Solution Explanation (Where Available)
                    </label>
                    <textarea
                      rows={2}
                      value={currentDraft.markingGuide || ''}
                      onChange={(e) => updateCurrentDraft('markingGuide', e.target.value)}
                      placeholder="Explanation, marking breakdown, or standard references..."
                      className="w-full text-xs border border-gray-300 rounded-lg p-2.5 outline-none focus:border-acca-red"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between shrink-0">
            <span className="text-xs text-gray-500">
              Preserves page references and validates answer keys before adding to question bank.
            </span>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Discard & Close
              </button>
              <button
                type="button"
                disabled={isSaving || approvedCount === 0}
                onClick={handleSaveApprovedQuestions}
                className="px-5 py-2 text-xs font-bold text-white bg-acca-red hover:bg-acca-red-dark disabled:opacity-50 rounded-xl shadow-xs flex items-center space-x-2 transition-colors"
              >
                {isSaving ? (
                  <span>Saving Questions...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Import {approvedCount} Verified Questions</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
