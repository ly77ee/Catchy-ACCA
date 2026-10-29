import React, { useState } from 'react';
import { AnswerReviewResult } from '../../types';
import {
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Calculator,
  Layers,
  FileCheck,
  X,
  AlertCircle,
  Lightbulb,
} from 'lucide-react';

interface AnswerReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  reviewResult: AnswerReviewResult | null;
  isAnalyzing: boolean;
  onRunReview: () => void;
  hasModelAnswer: boolean;
}

export const AnswerReviewModal: React.FC<AnswerReviewModalProps> = ({
  isOpen,
  onClose,
  reviewResult,
  isAnalyzing,
  onRunReview,
  hasModelAnswer,
}) => {
  const [activeTab, setActiveTab] = useState<'points' | 'accounting' | 'calculations' | 'alternatives'>('points');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-[#1e1e24] border border-[#2a2a34] rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#2a2a34] flex items-center justify-between bg-[#141419]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-950/40 text-acca-400 flex items-center justify-center border border-red-900/50">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">
                  Written-Answer Review & Technical Feedback
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#2a2a34] text-gray-300 uppercase tracking-wider">
                  Self-Evaluation Tool
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Compare your drafted response against the technical marking criteria & model workings
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-[#2a2a34] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {!hasModelAnswer && (
            <div className="p-4 bg-amber-950/30 border border-amber-800/50 rounded-lg flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-200">
                <p className="font-semibold">No Model Answer or Marking Guide Linked</p>
                <p className="mt-0.5">
                  This question does not yet have a benchmark model answer or marking guide saved. The review engine will check for general standard compliance and formatting, but cannot compare specific technical points.
                </p>
              </div>
            </div>
          )}

          {isAnalyzing ? (
            <div className="py-16 text-center space-y-4">
              <div className="w-12 h-12 border-4 border-red-950 border-t-acca-600 rounded-full animate-spin mx-auto"></div>
              <div>
                <p className="font-semibold text-gray-200">
                  Analyzing Answer Against Technical Syllabus Criteria...
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Cross-referencing IFRS/IAS standards, calculation values, and marking guidelines
                </p>
              </div>
            </div>
          ) : !reviewResult ? (
            <div className="text-center py-12 space-y-4">
              <div className="w-16 h-16 bg-[#141419] border border-[#2a2a34] text-gray-400 rounded-full flex items-center justify-center mx-auto">
                <Layers className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="font-bold text-white">
                  Ready to Evaluate Your Answer
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Click below to analyze your answer for technical syllabus coverage, missing marking scheme criteria, calculation accuracy, and accounting judgment clarity.
                </p>
              </div>
              <button
                onClick={onRunReview}
                className="px-5 py-2.5 bg-acca-600 hover:bg-acca-700 text-white font-medium text-sm rounded-lg shadow-sm transition-colors inline-flex items-center gap-2"
              >
                <FileCheck className="w-4 h-4" />
                Run Answer Evaluation
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary Card */}
              <div className="p-4 bg-[#141419] border border-[#2a2a34] rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Evaluation Summary
                  </span>
                  <span className="text-xs text-gray-400">
                    Evaluated {new Date(reviewResult.evaluatedAt).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-200">
                  {reviewResult.overallSummary}
                </p>

                {/* Score / Metrics Pill Row */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-[#2a2a34]">
                  <div className="px-3 py-1 bg-emerald-950/40 border border-emerald-800/60 rounded-full text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {reviewResult.technicalPointsFound.length} Technical Points Covered
                  </div>
                  <div className="px-3 py-1 bg-amber-950/40 border border-amber-800/60 rounded-full text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {reviewResult.technicalPointsMissing.length} Key Criteria Missing
                  </div>
                  {reviewResult.potentialAccountingErrors.length > 0 && (
                    <div className="px-3 py-1 bg-red-950/40 border border-red-800/60 rounded-full text-xs font-semibold text-red-300 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {reviewResult.potentialAccountingErrors.length} Potential Misconceptions
                    </div>
                  )}
                  {reviewResult.calculationDiscrepancies.length > 0 && (
                    <div className="px-3 py-1 bg-blue-950/40 border border-blue-800/60 rounded-full text-xs font-semibold text-blue-300 flex items-center gap-1.5">
                      <Calculator className="w-3.5 h-3.5" />
                      {reviewResult.calculationDiscrepancies.length} Math Discrepancies
                    </div>
                  )}
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex border-b border-[#2a2a34] gap-2">
                <button
                  onClick={() => setActiveTab('points')}
                  className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                    activeTab === 'points'
                      ? 'border-acca-600 text-acca-400'
                      : 'border-transparent text-gray-400 hover:text-white'
                  }`}
                >
                  <FileCheck className="w-3.5 h-3.5" />
                  Technical Points ({reviewResult.technicalPointsFound.length} /{' '}
                  {reviewResult.technicalPointsFound.length + reviewResult.technicalPointsMissing.length})
                </button>
                <button
                  onClick={() => setActiveTab('accounting')}
                  className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                    activeTab === 'accounting'
                      ? 'border-acca-600 text-acca-400'
                      : 'border-transparent text-gray-400 hover:text-white'
                  }`}
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  Accounting Checks & Assertions ({reviewResult.potentialAccountingErrors.length + reviewResult.unsupportedAssertions.length})
                </button>
                <button
                  onClick={() => setActiveTab('calculations')}
                  className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                    activeTab === 'calculations'
                      ? 'border-acca-600 text-acca-400'
                      : 'border-transparent text-gray-400 hover:text-white'
                  }`}
                >
                  <Calculator className="w-3.5 h-3.5" />
                  Calculations ({reviewResult.calculationDiscrepancies.length})
                </button>
                <button
                  onClick={() => setActiveTab('alternatives')}
                  className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                    activeTab === 'alternatives'
                      ? 'border-acca-600 text-acca-400'
                      : 'border-transparent text-gray-400 hover:text-white'
                  }`}
                >
                  <Lightbulb className="w-3.5 h-3.5" />
                  Alternative Presentations ({reviewResult.validAlternativePresentations.length})
                </button>
              </div>

              {/* Tab 1: Technical Points */}
              {activeTab === 'points' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Found */}
                  <div className="p-4 bg-emerald-950/20 border border-emerald-900/50 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs uppercase tracking-wider">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Points Identified in Your Answer
                    </div>
                    {reviewResult.technicalPointsFound.length === 0 ? (
                      <p className="text-xs text-gray-400 italic py-2">
                        No standard technical keywords identified yet.
                      </p>
                    ) : (
                      <ul className="space-y-1.5 text-xs text-gray-300">
                        {reviewResult.technicalPointsFound.map((pt, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-emerald-400 font-bold">✓</span>
                            <span>{pt}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Missing */}
                  <div className="p-4 bg-amber-950/20 border border-amber-900/50 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-amber-300 font-bold text-xs uppercase tracking-wider">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      Potentially Missing Syllabus Criteria
                    </div>
                    {reviewResult.technicalPointsMissing.length === 0 ? (
                      <p className="text-xs text-gray-400 italic py-2">
                        Great job! No major standard technical criteria missing.
                      </p>
                    ) : (
                      <ul className="space-y-1.5 text-xs text-gray-300">
                        {reviewResult.technicalPointsMissing.map((pt, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-amber-400 font-bold">•</span>
                            <span>{pt}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 2: Accounting Checks & Assertions */}
              {activeTab === 'accounting' && (
                <div className="space-y-4">
                  {reviewResult.potentialAccountingErrors.length === 0 &&
                  reviewResult.unsupportedAssertions.length === 0 ? (
                    <div className="p-6 text-center border border-[#2a2a34] rounded-xl bg-[#141419]">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                      <p className="font-semibold text-gray-200 text-sm">
                        No Accounting Traps or Unsupported Assertions Detected
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Your draft avoided common standard pitfalls (e.g. goodwill reversal, off-balance leases).
                      </p>
                    </div>
                  ) : (
                    <>
                      {reviewResult.potentialAccountingErrors.map((err, idx) => (
                        <div
                          key={`err_${idx}`}
                          className="p-3.5 bg-red-950/30 border border-red-900/50 rounded-xl text-xs space-y-1"
                        >
                          <div className="flex items-center gap-2 font-bold text-red-300">
                            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                            Accounting Standard Notice
                          </div>
                          <p className="text-red-200 pl-6 leading-relaxed">{err}</p>
                        </div>
                      ))}

                      {reviewResult.unsupportedAssertions.map((ast, idx) => (
                        <div
                          key={`ast_${idx}`}
                          className="p-3.5 bg-amber-950/30 border border-amber-900/50 rounded-xl text-xs space-y-1"
                        >
                          <div className="flex items-center gap-2 font-bold text-amber-300">
                            <HelpCircle className="w-4 h-4 text-amber-400 shrink-0" />
                            Exam Technique: Unsupported Assertion
                          </div>
                          <p className="text-amber-200 pl-6 leading-relaxed">{ast}</p>
                        </div>
                      ))}
                    </>
                  )}

                  {reviewResult.differencesFromSolution.length > 0 && (
                    <div className="p-4 bg-[#141419] border border-[#2a2a34] rounded-xl text-xs space-y-2">
                      <div className="font-bold text-gray-300 uppercase tracking-wider text-[11px]">
                        Presentation Differences vs Model Solution
                      </div>
                      <ul className="space-y-1 text-gray-400">
                        {reviewResult.differencesFromSolution.map((diff, idx) => (
                          <li key={idx}>• {diff}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Calculations */}
              {activeTab === 'calculations' && (
                <div className="space-y-4">
                  {reviewResult.calculationDiscrepancies.length === 0 ? (
                    <div className="p-6 text-center border border-[#2a2a34] rounded-xl bg-[#141419]">
                      <Calculator className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                      <p className="font-semibold text-gray-200 text-sm">
                        No Calculation Discrepancies Found
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Any numerical figures stated in your written answer match within standard tolerances.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-[#2a2a34] rounded-xl">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#141419] text-gray-400 font-semibold border-b border-[#2a2a34]">
                          <tr>
                            <th className="py-2.5 px-3">Item / Metric</th>
                            <th className="py-2.5 px-3">Expected Solution</th>
                            <th className="py-2.5 px-3">Your Draft</th>
                            <th className="py-2.5 px-3">Variance Note</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#2a2a34]">
                          {reviewResult.calculationDiscrepancies.map((disc, idx) => (
                            <tr key={idx} className="hover:bg-[#25252e]">
                              <td className="py-2.5 px-3 font-semibold text-white">
                                {disc.item}
                              </td>
                              <td className="py-2.5 px-3 text-emerald-400 font-mono">
                                {disc.expected}
                              </td>
                              <td className="py-2.5 px-3 text-red-400 font-mono">
                                {disc.actual}
                              </td>
                              <td className="py-2.5 px-3 text-gray-400">
                                {disc.explanation}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 4: Alternative Presentations */}
              {activeTab === 'alternatives' && (
                <div className="space-y-3">
                  {reviewResult.validAlternativePresentations.length === 0 ? (
                    <p className="text-xs text-gray-400 italic py-4">
                      No specific alternative format variations documented for this standard.
                    </p>
                  ) : (
                    reviewResult.validAlternativePresentations.map((alt, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 bg-blue-950/20 border border-blue-900/50 rounded-xl text-xs space-y-1"
                      >
                        <div className="flex items-center gap-2 font-bold text-blue-300">
                          <Lightbulb className="w-4 h-4 text-blue-400 shrink-0" />
                          Permissible Syllabus Variation
                        </div>
                        <p className="text-blue-200 pl-6 leading-relaxed">{alt}</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* Legal / ACCA Study Assistance Disclaimer Banner */}
          <div className="p-3 bg-[#141419] rounded-lg text-[11px] text-gray-400 border border-[#2a2a34] leading-normal">
            <span className="font-bold text-gray-200">
              Catchy ACCA Study Assistance Notice:
            </span>{' '}
            {reviewResult?.disclaimer ||
              'This feedback is an educational study tool to aid self-evaluation. It is not official ACCA examiner marking and does not guarantee exam pass marks.'}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[#2a2a34] bg-[#141419] flex items-center justify-between">
          <div className="text-xs text-gray-400">
            {reviewResult && (
              <span>Last analyzed {new Date(reviewResult.evaluatedAt).toLocaleTimeString()}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {reviewResult && (
              <button
                onClick={onRunReview}
                disabled={isAnalyzing}
                className="px-3.5 py-1.5 bg-[#2a2a34] hover:bg-[#374151] text-gray-200 text-xs font-semibold rounded-lg transition-colors"
              >
                Re-Evaluate
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-acca-600 hover:bg-acca-700 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
