import * as pdfjsLib from 'pdfjs-dist';
import {
  StudyMaterial,
  ExtractedQuestionDraft,
  QuestionType,
  QuestionOption,
  SubQuestion,
} from '../types';
import { suggestTopicsForContent } from '../config/syllabusTopics';

export interface ExtractionMetrics {
  totalPages: number;
  pagesProcessed: number;
  questionsDetected: number;
  questionsExtracted: number;
  answersDetected: number;
  verifiedMatches: number;
  unmatchedQuestions: number;
  unmatchedAnswers: number;
  duplicateCount: number;
  requiresReviewCount: number;
}

export interface ExtractionResult {
  questions: ExtractedQuestionDraft[];
  totalPagesScanned: number;
  isScannedOrEmptyText: boolean;
  warnings: string[];
  metrics: ExtractionMetrics;
}

export interface IndexQuestionMapping {
  questionNumber: string;
  title: string;
  printedQuestionPage: number;
  printedAnswerPage?: number;
  physicalQuestionPage?: number;
  physicalAnswerPage?: number;
}

export interface ExtractedAnswerBlock {
  questionNumber: string;
  answerText: string;
  physicalPage: number;
  markingGuideText?: string;
  optionsKey?: string;
}

/**
 * Detects printed page numbers appearing in header or footer lines of a page.
 */
export function detectPrintedPageNumber(text: string): number | null {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  // Check last 4 lines (footer) and first 4 lines (header)
  const candidateLines = lines.slice(-4).concat(lines.slice(0, 4));
  for (const line of candidateLines) {
    const match = line.match(/^(?:page\s*)?(\d{1,4})$/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > 0 && num < 2000) return num;
    }
  }
  return null;
}

/**
 * Scans introductory pages for Contents or Index tables in publisher kits.
 * Creates an index mapping between printed page numbers and physical PDF pages.
 */
export function parseContentsAndIndex(
  pageTexts: { pageNum: number; text: string }[]
): {
  mappings: IndexQuestionMapping[];
  pageOffset: number; // physicalPage - printedPage
} {
  const mappings: IndexQuestionMapping[] = [];
  let calculatedOffset = 0;

  for (const { pageNum, text } of pageTexts.slice(0, 15)) {
    const textLower = text.toLowerCase();
    const isContentsPage =
      textLower.includes('contents') ||
      textLower.includes('index of questions') ||
      textLower.includes('question index') ||
      textLower.includes('questions and answers') ||
      (textLower.includes('question') && textLower.includes('page') && textLower.includes('answer'));

    if (isContentsPage) {
      // Look for lines like "1 Alpha Co 15 142" or "Q1 Revenue 25 180" or "Question 1 ... 12 ... 140"
      const lines = text.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        // Match: Question ID, Title, Question Page, Answer Page
        const match = trimmed.match(
          /^(?:Q(?:uestion)?\s*)?(\d+[A-Za-z]?)\s+([A-Za-z\s\(\)\/&,-]+?)\s+(\d{1,4})(?:\s+(\d{1,4}))?$/i
        );

        if (match) {
          const qNum = match[1].trim();
          const title = match[2].trim();
          const printedQPage = parseInt(match[3], 10);
          const printedAnsPage = match[4] ? parseInt(match[4], 10) : undefined;

          if (printedQPage > 0 && printedQPage < 2000) {
            mappings.push({
              questionNumber: qNum,
              title,
              printedQuestionPage: printedQPage,
              printedAnswerPage: printedAnsPage,
            });
          }
        }
      }
    }
  }

  // 1. Try to detect printed page numbers from headers/footers to compute exact physical - printed offset
  const detectedOffsets: number[] = [];
  for (const { pageNum, text } of pageTexts) {
    const printedNum = detectPrintedPageNumber(text);
    if (printedNum !== null && printedNum > 0 && pageNum >= printedNum) {
      detectedOffsets.push(pageNum - printedNum);
    }
  }

  if (detectedOffsets.length > 0) {
    const counts: Record<number, number> = {};
    for (const off of detectedOffsets) counts[off] = (counts[off] || 0) + 1;
    let bestCount = 0;
    for (const [off, count] of Object.entries(counts)) {
      if (count > bestCount) {
        bestCount = count;
        calculatedOffset = parseInt(off, 10);
      }
    }
  }

  // 2. Fallback to first mapping location if header/footer not found
  if (calculatedOffset === 0 && mappings.length > 0) {
    const firstMapping = mappings[0];
    for (const { pageNum, text } of pageTexts) {
      if (text.match(new RegExp(`(?:Question|Q\\.?)\\s*${firstMapping.questionNumber}\\b`, 'i'))) {
        calculatedOffset = Math.max(0, pageNum - firstMapping.printedQuestionPage);
        break;
      }
    }
    if (calculatedOffset === 0) {
      calculatedOffset = Math.max(0, pageTexts.find(p => p.text.toLowerCase().includes('contents'))?.pageNum || 6);
    }
  }

  // Assign physical pages using calculated offset
  mappings.forEach((m) => {
    m.physicalQuestionPage = m.printedQuestionPage + calculatedOffset;
    if (m.printedAnswerPage) {
      m.physicalAnswerPage = m.printedAnswerPage + calculatedOffset;
    }
  });

  return { mappings, pageOffset: calculatedOffset };
}

/**
 * Parses answer/solution blocks from pages in the later half of the document.
 */
export function extractAnswerSections(
  pageTexts: { pageNum: number; text: string }[]
): ExtractedAnswerBlock[] {
  const answers: ExtractedAnswerBlock[] = [];

  for (const { pageNum, text } of pageTexts) {
    const textLower = text.toLowerCase();
    const isAnswerPage =
      textLower.includes('answers to section') ||
      textLower.includes('answers to question') ||
      textLower.includes('suggested solutions') ||
      textLower.includes('marking scheme') ||
      textLower.includes('examiner’s comments') ||
      textLower.includes('examiner comments');

    if (isAnswerPage) {
      // Split by question answer headings: "Answer 1" or "Question 1" or "Q1" or "1 Alpha Co"
      const answerRegex = /(?:Answer|Question|Q\.?)\s*(\d+[A-Za-z]?)(?:[:\.\s\-]+|\s+)([\s\S]*?)(?=(?:Answer|Question|Q\.?)\s*\d+[A-Za-z]?|$)/gi;
      let match: RegExpExecArray | null;

      while ((match = answerRegex.exec(text)) !== null) {
        const qNum = match[1].trim();
        const rawAnswerBlock = match[2]?.trim() || '';

        if (rawAnswerBlock.length > 20) {
          // Look for option key e.g. "Answer: B"
          const keyMatch = rawAnswerBlock.match(/(?:Answer|Key|Option)\s*[:\s\-]+([A-D])/i);
          const optionsKey = keyMatch ? keyMatch[1].toUpperCase() : undefined;

          answers.push({
            questionNumber: qNum,
            answerText: rawAnswerBlock,
            physicalPage: pageNum,
            optionsKey,
            markingGuideText: rawAnswerBlock.slice(0, 500),
          });
        }
      }
    }
  }

  return answers;
}

/**
 * Extracts questions, options, marks, and answers from a local PDF material.
 * Document-aware multi-stage pipeline:
 * 1. Text reading & empty scan detection
 * 2. Contents & index analysis (printed page offset mapping)
 * 3. Question boundary parsing (handles multi-page questions)
 * 4. Answer section parsing & question-to-answer matching
 * 5. Quality metrics reporting
 */
export async function extractQuestionsFromPdf(
  material: StudyMaterial,
  startPage: number = 1,
  maxPagesToScan: number = 30
): Promise<ExtractionResult> {
  if (!material.pdfData) {
    throw new Error('No PDF document data available in local storage.');
  }

  let data: ArrayBuffer;
  if (material.pdfData instanceof Blob) {
    data = await material.pdfData.arrayBuffer();
  } else if (material.pdfData instanceof ArrayBuffer) {
    data = material.pdfData;
  } else {
    throw new Error('Unsupported PDF data format.');
  }

  const loadingTask = pdfjsLib.getDocument({ data: data.slice(0) });
  const doc = await loadingTask.promise;

  const totalPages = doc.numPages;
  const endPage = Math.min(totalPages, startPage + maxPagesToScan - 1);
  const pageTexts: { pageNum: number; text: string }[] = [];

  let totalCharsExtracted = 0;

  for (let p = startPage; p <= endPage; p++) {
    try {
      const page = await doc.getPage(p);
      const textContent = await page.getTextContent();
      const pageStrings = textContent.items
        .map((item: any) => ('str' in item ? item.str : ''))
        .filter(Boolean);
      const rawPageText = pageStrings.join(' ');
      totalCharsExtracted += rawPageText.trim().length;
      pageTexts.push({ pageNum: p, text: rawPageText });
    } catch (err) {
      console.warn(`Error reading text on page ${p}:`, err);
    }
  }

  const isScannedOrEmptyText = totalCharsExtracted < 100;
  const warnings: string[] = [];

  if (isScannedOrEmptyText) {
    warnings.push(
      'Diagnostic Alert: This PDF appears to be a scanned image-only document without an embedded text layer. Automated extraction could not detect selectable text.'
    );
    return {
      questions: [],
      totalPagesScanned: endPage - startPage + 1,
      isScannedOrEmptyText: true,
      warnings,
      metrics: {
        totalPages,
        pagesProcessed: endPage - startPage + 1,
        questionsDetected: 0,
        questionsExtracted: 0,
        answersDetected: 0,
        verifiedMatches: 0,
        unmatchedQuestions: 0,
        unmatchedAnswers: 0,
        duplicateCount: 0,
        requiresReviewCount: 0,
      },
    };
  }

  // Stage 1: Parse Index and Contents tables
  const { mappings: indexMappings, pageOffset } = parseContentsAndIndex(pageTexts);

  // If index or document hints at answer pages outside the currently scanned window, load those answer pages
  const additionalAnswerPages = new Set<number>();
  for (const m of indexMappings) {
    if (m.physicalAnswerPage && m.physicalAnswerPage > endPage && m.physicalAnswerPage <= totalPages) {
      additionalAnswerPages.add(m.physicalAnswerPage);
      if (m.physicalAnswerPage + 1 <= totalPages) {
        additionalAnswerPages.add(m.physicalAnswerPage + 1);
      }
    }
  }

  // If index had no explicit answer pages, probe standard answer divisions in later sections of multi-page kits
  if (additionalAnswerPages.size === 0 && totalPages > endPage) {
    const probePages = [
      Math.floor(totalPages * 0.5),
      Math.floor(totalPages * 0.7),
      Math.floor(totalPages * 0.85),
    ];
    for (const p of probePages) {
      if (p > endPage && p <= totalPages) {
        additionalAnswerPages.add(p);
      }
    }
  }

  // Fetch targeted answer pages asynchronously
  const allPageTexts = [...pageTexts];
  for (const p of Array.from(additionalAnswerPages).slice(0, 15)) {
    try {
      const page = await doc.getPage(p);
      const textContent = await page.getTextContent();
      const pageStrings = textContent.items
        .map((item: any) => ('str' in item ? item.str : ''))
        .filter(Boolean);
      allPageTexts.push({ pageNum: p, text: pageStrings.join(' ') });
    } catch {
      // Continue safely if a page read fails
    }
  }

  // Stage 2: Parse Answer Sections in scanned pages
  const answerBlocks = extractAnswerSections(allPageTexts);

  // Stage 3: Parse Questions from page texts
  const extractedDrafts: ExtractedQuestionDraft[] = [];

  for (let i = 0; i < pageTexts.length; i++) {
    const { pageNum, text } = pageTexts[i];
    if (text.trim().length < 40) continue;

    // Pattern 1: Explicit "Question X" or "Q X"
    const questionRegex = /(?:Question|Q\.?)\s*(\d+[A-Za-z]?)(?:[:\.\s\-]+|\s+)([\s\S]*?)(?=(?:Question|Q\.?)\s*\d+[A-Za-z]?|$)/gi;
    let match: RegExpExecArray | null;
    let foundInPage = false;

    while ((match = questionRegex.exec(text)) !== null) {
      const qNum = match[1].trim();
      const rawBlock = match[2]?.trim() || '';

      if (rawBlock.length < 20) continue;
      foundInPage = true;

      // Handle multi-page questions: accumulate text across continuation pages
      let endPageNum = pageNum;
      let fullPrompt = rawBlock;
      let nextIdx = i + 1;

      while (
        nextIdx < pageTexts.length &&
        !pageTexts[nextIdx].text.match(/(?:Question|Q\.?)\s*\d+/i) &&
        !pageTexts[nextIdx].text.toLowerCase().includes('answers to section') &&
        !pageTexts[nextIdx].text.toLowerCase().includes('suggested solutions') &&
        fullPrompt.length < 12000
      ) {
        const nextPage = pageTexts[nextIdx];
        endPageNum = nextPage.pageNum;
        fullPrompt = `${fullPrompt}\n\n[Continuation from Page ${nextPage.pageNum}]\n${nextPage.text.trim()}`;
        nextIdx++;
        if (nextPage.text.match(/\[\s*\d+\s*marks?\s*\]/i)) {
          break;
        }
      }

      const draft = parseQuestionBlock(
        qNum,
        fullPrompt,
        material.paperId || 'FR',
        material.id,
        pageNum,
        endPageNum
      );
      extractedDrafts.push(draft);
    }

    // Pattern 2: Numbered item list fallback
    if (!foundInPage) {
      const numberedRegex = /(?:^|\n)\s*(\d{1,2})\s+([A-Z][\s\S]*?)(?=(?:\n\s*\d{1,2}\s+[A-Z])|$)/g;
      let numMatch: RegExpExecArray | null;
      while ((numMatch = numberedRegex.exec(text)) !== null) {
        const qNum = numMatch[1];
        const rawBlock = numMatch[2].trim();
        if (
          rawBlock.length > 50 &&
          (rawBlock.includes('?') ||
            rawBlock.includes('marks') ||
            rawBlock.includes('A.') ||
            rawBlock.includes('A)'))
        ) {
          const draft = parseQuestionBlock(
            qNum,
            rawBlock,
            material.paperId || 'FR',
            material.id,
            pageNum,
            pageNum
          );
          extractedDrafts.push(draft);
        }
      }
    }
  }

  // Stage 4: Match Questions to Solutions / Marking Guides
  let verifiedMatchesCount = 0;
  for (const draft of extractedDrafts) {
    const rawQNum = draft.questionNumber.replace(/^Q/i, '');

    // Check extracted answer blocks
    const matchedAnswer = answerBlocks.find(
      (a) => a.questionNumber.toLowerCase() === rawQNum.toLowerCase()
    );

    if (matchedAnswer) {
      draft.markingGuide = matchedAnswer.answerText;
      draft.solutionPage = matchedAnswer.physicalPage;
      draft.matchStatus = 'verified';
      verifiedMatchesCount++;

      // If objective answer key was found in answer block, attach it
      if (matchedAnswer.optionsKey && draft.correctOptionIds.length === 0) {
        draft.correctOptionIds = [matchedAnswer.optionsKey];
      }
    } else {
      // Check if index mappings know the answer page
      const indexEntry = indexMappings.find(
        (im) => im.questionNumber.toLowerCase() === rawQNum.toLowerCase()
      );
      if (indexEntry?.physicalAnswerPage) {
        draft.solutionPage = indexEntry.physicalAnswerPage;
        draft.matchStatus = 'high_confidence';
      } else {
        draft.matchStatus = draft.markingGuide ? 'high_confidence' : 'unmatched';
      }
    }
  }

  // Deduplicate questions by question number and page
  const beforeDedupCount = extractedDrafts.length;
  const uniqueDrafts = deduplicateDrafts(extractedDrafts);
  const duplicateCount = beforeDedupCount - uniqueDrafts.length;

  const requiresReviewCount = uniqueDrafts.filter(
    (d) => d.confidenceScore < 0.7 || d.warningMessages.length > 0 || d.matchStatus === 'unmatched'
  ).length;

  if (uniqueDrafts.length === 0) {
    warnings.push(
      'No structured questions could be automatically identified in the scanned pages. You can still create questions manually or review other pages.'
    );
  }

  const metrics: ExtractionMetrics = {
    totalPages,
    pagesProcessed: endPage - startPage + 1,
    questionsDetected: beforeDedupCount,
    questionsExtracted: uniqueDrafts.length,
    answersDetected: answerBlocks.length,
    verifiedMatches: verifiedMatchesCount,
    unmatchedQuestions: uniqueDrafts.length - verifiedMatchesCount,
    unmatchedAnswers: Math.max(0, answerBlocks.length - verifiedMatchesCount),
    duplicateCount,
    requiresReviewCount,
  };

  return {
    questions: uniqueDrafts,
    totalPagesScanned: endPage - startPage + 1,
    isScannedOrEmptyText: false,
    warnings,
    metrics,
  };
}

/**
 * Parses a raw question text block to identify options, marks, question type, and answer key.
 */
export function parseQuestionBlock(
  questionNumber: string,
  rawText: string,
  paperId: string,
  materialId: string,
  startPageNum: number,
  endPageNum: number = startPageNum
): ExtractedQuestionDraft {
  const warningMessages: string[] = [];
  let confidenceScore = 0.6;

  // Extract Marks: e.g. "(10 marks)" or "[2 marks]"
  let availableMarks = 2; // Default for standard ACCA objective items
  const marksMatch = rawText.match(/[\(\[]\s*(\d+)\s*marks?\s*[\)\]]/i);
  if (marksMatch) {
    availableMarks = parseInt(marksMatch[1], 10);
    confidenceScore += 0.1;
  }

  // Extract SubQuestions if present: e.g. "(a) Prepare ... [10 marks]", "(b) Explain ... [6 marks]"
  const subQuestions: SubQuestion[] = [];
  const subqRegex = /(?:^|\n)\s*(\([a-z]\))\s+([\s\S]*?)(?=(?:\n\s*\([a-z]\))|$)/g;
  let subMatch: RegExpExecArray | null;
  while ((subMatch = subqRegex.exec(rawText)) !== null) {
    const label = subMatch[1];
    const subText = subMatch[2].trim();
    if (subText.length > 10) {
      const subMarksMatch = subText.match(/[\(\[]\s*(\d+)\s*marks?\s*[\)\]]/i);
      const marks = subMarksMatch ? parseInt(subMarksMatch[1], 10) : undefined;
      subQuestions.push({
        id: `sub-${label.replace(/[\(\)]/g, '')}`,
        label,
        prompt: subText,
        marks,
      });
    }
  }

  if (subQuestions.length > 0) {
    const subMarksSum = subQuestions.reduce((acc, sq) => acc + (sq.marks || 0), 0);
    if (subMarksSum > 0) {
      availableMarks = subMarksSum;
      confidenceScore += 0.15;
    }
  }

  // Extract Options (A, B, C, D)
  const options: QuestionOption[] = [];
  const lines = rawText.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    const optLineMatch = trimmed.match(/^([A-D])[\.\)\:\-]\s+(.+)$/i);
    if (optLineMatch) {
      const label = optLineMatch[1].toUpperCase();
      const text = optLineMatch[2]
        .replace(/(?:Answer|Solution|[\(\[]\d+\s*marks?[\)\]]).*$/i, '')
        .trim();
      if (text.length > 0 && !options.some((o) => o.label === label)) {
        options.push({
          id: label,
          label,
          text,
        });
      }
    }
  }

  // Fallback for inline options: "A) Option A B) Option B C) Option C D) Option D"
  if (options.length < 2) {
    const inlineOptRegex = /(?:^|\s)([A-D])[\.\)\:\-]\s+([^A-D\n\r]+?)(?=(?:\s[A-D][\.\)\:\-]|\s*Answer|\s*Solution|$))/gi;
    let inlineMatch: RegExpExecArray | null;
    while ((inlineMatch = inlineOptRegex.exec(rawText)) !== null) {
      const label = inlineMatch[1].toUpperCase();
      const text = inlineMatch[2].trim();
      if (text.length > 0 && !options.some((o) => o.label === label)) {
        options.push({ id: label, label, text });
      }
    }
  }

  // Determine Question Type
  let questionType: QuestionType = 'section_a_mcq';
  if (options.length >= 2) {
    questionType = 'section_a_mcq';
    confidenceScore += 0.15;
  } else if (
    availableMarks > 4 ||
    rawText.toLowerCase().includes('discuss') ||
    rawText.toLowerCase().includes('explain') ||
    rawText.toLowerCase().includes('prepare')
  ) {
    questionType = 'section_c_constructed';
  } else if (
    rawText.toLowerCase().includes('calculate') ||
    rawText.toLowerCase().includes('compute')
  ) {
    questionType = 'calculation';
  } else {
    questionType = 'section_b_case';
  }

  // Extract Answer Key if present in text
  const correctOptionIds: string[] = [];
  const answerKeyMatch = rawText.match(
    /(?:Answer|Key|Correct(?:\s+Option)?|Solution)\s*[:\s\-]+([A-D])/i
  );
  if (answerKeyMatch) {
    correctOptionIds.push(answerKeyMatch[1].toUpperCase());
    confidenceScore += 0.15;
  } else if (options.length > 0) {
    warningMessages.push('Answer key not detected. Verify or select the correct option during review.');
  }

  // Extract Title and Prompt
  const cleanLines = rawText
    .replace(/(?:^|\s|\n)[A-D][\.\)\:\-]\s*[^\n\r]+/g, '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  let title = cleanLines[0] || `Question ${questionNumber}`;
  if (title.length > 100) {
    title = title.substring(0, 97) + '...';
  }
  const prompt = rawText.trim();

  // Topic suggestion based on content
  const topicSuggestions = suggestTopicsForContent(rawText, paperId);

  return {
    tempId: 'draft-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
    questionNumber: `Q${questionNumber}`,
    title,
    prompt,
    paperId,
    sourcePageStart: startPageNum,
    sourcePageEnd: endPageNum,
    sourceMaterialId: materialId,
    questionType,
    options,
    subQuestions: subQuestions.length > 0 ? subQuestions : undefined,
    correctOptionIds,
    availableMarks,
    topicSuggestions,
    confidenceScore: Math.min(1.0, confidenceScore),
    warningMessages,
    isApproved: true,
    matchStatus: 'needs_review',
  };
}

function deduplicateDrafts(drafts: ExtractedQuestionDraft[]): ExtractedQuestionDraft[] {
  const seen = new Set<string>();
  const result: ExtractedQuestionDraft[] = [];

  for (const d of drafts) {
    const key = `${d.questionNumber}-${d.sourcePageStart}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(d);
    }
  }

  return result;
}
