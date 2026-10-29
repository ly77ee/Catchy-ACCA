import { AnswerReviewResult, CalculationCheckDiscrepancy, AIProviderConfig } from '../types';

export interface EvaluationInput {
  questionId: string;
  studentAnswerText: string;
  modelAnswer: string;
  markingGuide?: string;
  questionPrompt?: string;
  paperId?: string;
  aiConfig?: AIProviderConfig;
}

/**
 * Common technical accounting terms and key concept patterns for extraction
 */
const TECHNICAL_KEYWORD_PATTERNS = [
  /IFRS\s*\d+/i,
  /IAS\s*\d+/i,
  /ISA\s*\d+/i,
  /present obligation/i,
  /past event/i,
  /probable outflow/i,
  /reliable estimate/i,
  /recoverable amount/i,
  /value in use/i,
  /fair value less costs/i,
  /right-of-use asset/i,
  /lease liability/i,
  /performance obligation/i,
  /stand-alone selling price/i,
  /transfer of control/i,
  /inherent risk/i,
  /control risk/i,
  /detection risk/i,
  /risk of material misstatement/i,
  /substantive procedure/i,
  /test of control/i,
  /professional skepticism/i,
  /going concern/i,
  /subsequent event/i,
  /weighted average cost of capital|wacc/i,
  /cost of equity/i,
  /cost of debt/i,
  /net present value|npv/i,
  /internal rate of return|irr/i,
  /payback period/i,
  /sensitivity analysis/i,
  /variance analysis/i,
  /standard costing/i,
  /material price variance/i,
  /material usage variance/i,
  /labor efficiency variance/i,
  /transfer pricing/i,
  /corporate governance/i,
  /agency theory/i,
  /fiduciary duty/i,
  /code of ethics/i,
  /objectivity/i,
  /confidentiality/i,
  /professional competence/i,
  /deferred tax/i,
  /taxable temporary difference/i,
];

/**
 * Common accounting misconception rules to check against student text
 */
interface MisconceptionRule {
  triggerRegex: RegExp;
  errorDescription: string;
}

const MISCONCEPTION_RULES: MisconceptionRule[] = [
  {
    triggerRegex: /off-balance-sheet|operating lease/i,
    errorDescription: 'Under IFRS 16, almost all leases must be recognized on-balance-sheet as a Right-of-Use Asset and Lease Liability (unless short-term <=12 months or low value). Describing standard leases as off-balance-sheet is incorrect.',
  },
  {
    triggerRegex: /revers(e|al|ing)\s+(of\s+)?goodwill/i,
    errorDescription: 'Under IAS 36 paragraph 124, an impairment loss recognized for goodwill shall NEVER be reversed in a subsequent period under any circumstances.',
  },
  {
    triggerRegex: /contingent liability (should be|is) (recognized|recorded|accrued) (as a liability|on the balance sheet)/i,
    errorDescription: 'Under IAS 37, contingent liabilities are disclosed in the notes only, NOT accrued or recognized as liabilities on the Statement of Financial Position.',
  },
  {
    triggerRegex: /provision for future (operating losses|restructuring before agreement)/i,
    errorDescription: 'Under IAS 37, provisions cannot be made for future operating losses because they do not arise from a past event or present obligation.',
  },
  {
    triggerRegex: /book value of (equity|debt) (used for|in) wacc/i,
    errorDescription: 'For WACC calculations in FM/AFM, market values of equity and debt must always be preferred over book (carrying) values.',
  },
  {
    triggerRegex: /recognize revenue when cash is received|revenue.*cash.*received/i,
    errorDescription: 'Under IFRS 15, revenue is recognized when performance obligations are satisfied by transferring control of goods or services to the customer, not merely upon cash receipt.',
  },
];

/**
 * Regex for unsubstantiated, vague assertions
 */
const UNSUPPORTED_ASSERTION_PATTERNS = [
  /(it is obvious(ly)? that|clearly obvious)/i,
  /(100% guaranteed|guaranteed to succeed|definitely fraudulent)/i,
  /(everyone knows that|without any doubt whatsoever)/i,
  /(the company will surely go bankrupt|certain bankruptcy)/i,
  /(fire the auditor immediately|management must be arrested)/i,
];

/**
 * Extracts numbers with their immediate label/context from text
 */
export function extractNumbersWithContext(text: string): { label: string; value: number }[] {
  const results: { label: string; value: number }[] = [];
  // Match lines or phrases containing numbers like "$1,250", "45%", "25000", "12.5"
  const regex = /([A-Za-z\s]{3,25})[:=]?\s*[\$£€]?\s*(-?\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)\s*(%|million|thousand|k)?/gi;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const rawLabel = match[1].trim();
    let numStr = match[2].replace(/,/g, '');
    let val = parseFloat(numStr);
    if (!isNaN(val)) {
      if (match[3] === '%') {
        // Keep as percentage or ratio
      } else if (match[3]?.toLowerCase() === 'million') {
        val = val * 1_000_000;
      }
      results.push({ label: rawLabel, value: val });
    }
  }
  return results;
}

/**
 * Evaluates a student's written response against a model answer and marking guide
 */
export function evaluateWrittenAnswer(input: EvaluationInput): AnswerReviewResult {
  const { questionId, studentAnswerText, modelAnswer, markingGuide } = input;
  const combinedBenchmark = `${modelAnswer}\n${markingGuide || ''}`.toLowerCase();
  const studentTextLower = studentAnswerText.toLowerCase();

  // 1. Technical Points Check
  const technicalPointsFound: string[] = [];
  const technicalPointsMissing: string[] = [];

  TECHNICAL_KEYWORD_PATTERNS.forEach((pattern) => {
    const benchmarkMatch = combinedBenchmark.match(pattern);
    if (benchmarkMatch) {
      const pointName = benchmarkMatch[0];
      // Format as title case / clean
      const cleanPoint = pointName.charAt(0).toUpperCase() + pointName.slice(1);
      
      if (studentTextLower.match(pattern)) {
        if (!technicalPointsFound.includes(cleanPoint)) {
          technicalPointsFound.push(cleanPoint);
        }
      } else {
        if (!technicalPointsMissing.includes(cleanPoint)) {
          technicalPointsMissing.push(cleanPoint);
        }
      }
    }
  });

  // Also check explicit bullet points from marking guide if formatted as bullets
  if (markingGuide) {
    const lines = markingGuide.split('\n');
    lines.forEach((line) => {
      const trimmed = line.replace(/^[\*\-\d\.\)]+\s*/, '').trim();
      if (trimmed.length > 15 && trimmed.length < 90) {
        // Look for key phrase in student answer
        const keyWords = trimmed.toLowerCase().split(/\s+/).filter((w) => w.length > 5);
        if (keyWords.length >= 2) {
          const matchCount = keyWords.filter((w) => studentTextLower.includes(w)).length;
          if (matchCount >= 2) {
            // Already identified or matched
          } else if (matchCount === 0 && technicalPointsMissing.length < 8) {
            technicalPointsMissing.push(`Marking Scheme point: ${trimmed}`);
          }
        }
      }
    });
  }

  // 2. Potential Accounting Misconceptions / Errors
  const potentialAccountingErrors: string[] = [];
  MISCONCEPTION_RULES.forEach((rule) => {
    if (rule.triggerRegex.test(studentAnswerText)) {
      potentialAccountingErrors.push(rule.errorDescription);
    }
  });

  // 3. Unsupported Assertions
  const unsupportedAssertions: string[] = [];
  UNSUPPORTED_ASSERTION_PATTERNS.forEach((pat) => {
    const match = studentAnswerText.match(pat);
    if (match) {
      unsupportedAssertions.push(
        `Assertion: "${match[0]}" — In ACCA professional exams, avoid extreme or unhedged assertions. Always provide supporting justification from the scenario.`
      );
    }
  });

  // Word count & depth check
  const studentWords = studentAnswerText.trim().split(/\s+/).filter(Boolean).length;
  const benchmarkWords = modelAnswer.trim().split(/\s+/).filter(Boolean).length;

  // 4. Differences from Supplied Solution
  const differencesFromSolution: string[] = [];
  if (studentWords < benchmarkWords * 0.4 && benchmarkWords > 100) {
    differencesFromSolution.push(
      `Your answer is significantly more concise (${studentWords} words) compared to the model answer (${benchmarkWords} words). Elaborate on the practical impact and specific recommendations.`
    );
  }
  if (!studentAnswerText.includes('\n\n') && studentWords > 120) {
    differencesFromSolution.push(
      'Formatting structure: The model answer uses clear subheadings and paragraphs. Breaking your answer into distinct sections improves professional presentation and readability.'
    );
  }

  // 5. Valid Alternative Presentations
  const validAlternativePresentations: string[] = [];
  if (combinedBenchmark.includes('npv') || combinedBenchmark.includes('cash flow')) {
    validAlternativePresentations.push(
      'Alternative valid format: Discounted cash flows may be presented either in a vertical year-by-year table or horizontally across columns, provided each cash flow stream (tax, scrap, working capital) is labeled clearly.'
    );
  }
  if (combinedBenchmark.includes('goodwill') || combinedBenchmark.includes('ifrs 3')) {
    validAlternativePresentations.push(
      'Alternative valid method: Non-controlling interest (NCI) at acquisition can be measured at fair value (full goodwill) or proportionate share of identifiable net assets (partial goodwill) depending on the question policy.'
    );
  }
  if (combinedBenchmark.includes('ias 7') || combinedBenchmark.includes('operating activities')) {
    validAlternativePresentations.push(
      'Alternative valid presentation: Cash flows from operating activities can be prepared under IAS 7 using either the direct or indirect method, although indirect is most common in CBE exams.'
    );
  }

  // 6. Deterministic Calculation Checking
  const calculationDiscrepancies: CalculationCheckDiscrepancy[] = [];
  const modelNumbers = extractNumbersWithContext(modelAnswer);
  const studentNumbers = extractNumbersWithContext(studentAnswerText);

  const stopWords = new Set(['the', 'is', 'at', 'in', 'of', 'to', 'for', 'and', 'a', 'an', 'be', 'by', 'as', 'with']);

  modelNumbers.forEach((mNum) => {
    // Word tokens for semantic overlap
    const mWords = mNum.label.toLowerCase().split(/\s+/).filter((w) => w.length >= 3 && !stopWords.has(w));

    // If model answer has a specific labeled number, check if student included it or had a close variant
    const matchedStudentNum = studentNumbers.find((sNum) => {
      if (
        sNum.label.toLowerCase().includes(mNum.label.toLowerCase()) ||
        mNum.label.toLowerCase().includes(sNum.label.toLowerCase())
      ) {
        return true;
      }
      const sWords = sNum.label.toLowerCase().split(/\s+/).filter((w) => w.length >= 3 && !stopWords.has(w));
      return mWords.some((mw) => sWords.includes(mw));
    });

    if (matchedStudentNum) {
      const diff = Math.abs(matchedStudentNum.value - mNum.value);
      const tolerance = Math.max(0.01, Math.abs(mNum.value * 0.02)); // 2% tolerance for rounding
      if (diff > tolerance) {
        const cleanItemLabel = mNum.label.replace(/^(the|a|an|of|to|in)\s+/i, '').trim();
        calculationDiscrepancies.push({
          item: cleanItemLabel || 'Calculated Figure',
          expected: mNum.value,
          actual: matchedStudentNum.value,
          explanation: `Discrepancy detected for "${cleanItemLabel}". Model solution indicates ${mNum.value}, whereas your answer states ${matchedStudentNum.value}. Verify discount factors, tax timing, or formula parameters.`,
        });
      }
    }
  });

  // Overall summary synthesis
  const pointsFoundCount = technicalPointsFound.length;
  const missingCount = technicalPointsMissing.length;
  const totalChecked = pointsFoundCount + missingCount;
  const coveragePercent = totalChecked > 0 ? Math.round((pointsFoundCount / totalChecked) * 100) : 75;

  let overallSummary = '';
  if (coveragePercent >= 80 && potentialAccountingErrors.length === 0) {
    overallSummary = `Strong response covering approximately ${coveragePercent}% of key syllabus criteria. Your technical terminology aligns well with the model solution.`;
  } else if (coveragePercent >= 50) {
    overallSummary = `Good foundational response covering roughly ${coveragePercent}% of expected technical criteria. Review the highlighted missing points and expand on scenario application.`;
  } else {
    overallSummary = `Your answer covers basic elements (${coveragePercent}% technical coverage), but misses several technical criteria or standard provisions from the marking guide. Consult the missing points below.`;
  }

  return {
    id: `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    questionId,
    evaluatedAt: new Date().toISOString(),
    overallSummary,
    technicalPointsFound,
    technicalPointsMissing,
    potentialAccountingErrors,
    unsupportedAssertions,
    differencesFromSolution,
    validAlternativePresentations,
    calculationDiscrepancies,
    disclaimer:
      'Catchy ACCA Study Assistant feedback is an educational revision guide only. It does not represent official ACCA examiner marking, nor does it guarantee exam marks or passing grades. Always verify complex treatments against official ACCA study material.',
  };
}
