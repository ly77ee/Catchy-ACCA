import * as pdfjsLib from 'pdfjs-dist';
import { StudyMaterial, ExtractedQuestionDraft, QuestionType, QuestionOption } from '../types';
import { suggestTopicsForContent } from '../config/syllabusTopics';

export interface ExtractionResult {
  questions: ExtractedQuestionDraft[];
  totalPagesScanned: number;
  isScannedOrEmptyText: boolean;
  warnings: string[];
}

/**
 * Extracts questions, options, marks, and topic suggestions from a local PDF material.
 * Follows strict safety rules: never invents content, flags uncertainties, and preserves source page refs.
 */
export async function extractQuestionsFromPdf(
  material: StudyMaterial,
  startPage: number = 1,
  maxPagesToScan: number = 20
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
      'This document appears to be an image-only scan or has an unreadable text layer. Extracted questions may be limited or require manual entry.'
    );
    return {
      questions: [],
      totalPagesScanned: endPage - startPage + 1,
      isScannedOrEmptyText: true,
      warnings
    };
  }

  // Parse questions from aggregated page text
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

      if (rawBlock.length < 20) continue; // too short to be a valid question
      foundInPage = true;

      const draft = parseQuestionBlock(
        qNum,
        rawBlock,
        material.paperId || 'FR',
        material.id,
        pageNum
      );
      extractedDrafts.push(draft);
    }

    // Pattern 2: Numbered item list fallback if explicit "Question" keyword wasn't found
    if (!foundInPage) {
      const numberedRegex = /(?:^|\n)\s*(\d{1,2})\s+([A-Z][\s\S]*?)(?=(?:\n\s*\d{1,2}\s+[A-Z])|$)/g;
      let numMatch: RegExpExecArray | null;
      while ((numMatch = numberedRegex.exec(text)) !== null) {
        const qNum = numMatch[1];
        const rawBlock = numMatch[2].trim();
        if (rawBlock.length > 50 && (rawBlock.includes('?') || rawBlock.includes('marks') || rawBlock.includes('A.') || rawBlock.includes('A)'))) {
          const draft = parseQuestionBlock(
            qNum,
            rawBlock,
            material.paperId || 'FR',
            material.id,
            pageNum
          );
          extractedDrafts.push(draft);
        }
      }
    }
  }

  // Deduplicate questions by question number and page
  const uniqueDrafts = deduplicateDrafts(extractedDrafts);

  if (uniqueDrafts.length === 0) {
    warnings.push(
      'No structured questions could be automatically identified in the scanned pages. You can still create questions manually or review other pages.'
    );
  }

  return {
    questions: uniqueDrafts,
    totalPagesScanned: endPage - startPage + 1,
    isScannedOrEmptyText: false,
    warnings
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
  pageNum: number
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

  // Extract Options (A, B, C, D)
  const options: QuestionOption[] = [];
  const lines = rawText.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    const optLineMatch = trimmed.match(/^([A-D])[\.\)\:\-]\s+(.+)$/i);
    if (optLineMatch) {
      const label = optLineMatch[1].toUpperCase();
      const text = optLineMatch[2].replace(/(?:Answer|Solution|[\(\[]\d+\s*marks?[\)\]]).*$/i, '').trim();
      if (text.length > 0 && !options.some(o => o.label === label)) {
        options.push({
          id: label,
          label,
          text
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
      if (text.length > 0 && !options.some(o => o.label === label)) {
        options.push({ id: label, label, text });
      }
    }
  }

  // Determine Question Type
  let questionType: QuestionType = 'section_a_mcq';
  if (options.length >= 2) {
    questionType = 'section_a_mcq';
    confidenceScore += 0.15;
  } else if (availableMarks > 4 || rawText.toLowerCase().includes('discuss') || rawText.toLowerCase().includes('explain') || rawText.toLowerCase().includes('prepare')) {
    questionType = 'section_c_constructed';
  } else if (rawText.toLowerCase().includes('calculate') || rawText.toLowerCase().includes('compute')) {
    questionType = 'calculation';
  } else {
    questionType = 'section_b_case';
  }

  // Extract Answer Key if present in text
  const correctOptionIds: string[] = [];
  const answerKeyMatch = rawText.match(/(?:Answer|Key|Correct(?:\s+Option)?|Solution)\s*[:\s\-]+([A-D])/i);
  if (answerKeyMatch) {
    correctOptionIds.push(answerKeyMatch[1].toUpperCase());
    confidenceScore += 0.15;
  } else if (options.length > 0) {
    warningMessages.push('Answer key not detected. Verify or select the correct option during review.');
  }

  // Extract Title and Prompt
  // First sentence or line as title
  const cleanLines = rawText
    .replace(/(?:^|\s|\n)[A-D][\.\)\:\-]\s*[^\n\r]+/g, '') // remove option lines for clean prompt
    .split('\n')
    .map(l => l.trim())
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
    sourcePageStart: pageNum,
    sourcePageEnd: pageNum,
    sourceMaterialId: materialId,
    questionType,
    options,
    correctOptionIds,
    availableMarks,
    topicSuggestions,
    confidenceScore: Math.min(1.0, confidenceScore),
    warningMessages,
    isApproved: true, // Default to true in draft so user can uncheck or bulk approve
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
