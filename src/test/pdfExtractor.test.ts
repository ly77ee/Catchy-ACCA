import { describe, it, expect } from 'vitest';
import {
  parseQuestionBlock,
  parseContentsAndIndex,
  extractAnswerSections,
  detectPrintedPageNumber
} from '../utils/pdfExtractor';
import { suggestTopicsForContent } from '../config/syllabusTopics';

describe('PDF Extraction & Topic Intelligence', () => {
  it('parses structured question blocks with MCQ options and marks', () => {
    const rawText = `
      Question 1
      Under IFRS 16 Leases, how should a lessee initially measure a lease liability?
      (2 marks)
      A. At the fair value of the leased asset
      B. At the present value of lease payments not paid at commencement date
      C. At total contractual undiscounted cash payments
      D. At net realizable value
      Answer: B
    `;

    const draft = parseQuestionBlock('1', rawText, 'FR', 'doc-1', 42);

    expect(draft.questionNumber).toBe('Q1');
    expect(draft.availableMarks).toBe(2);
    expect(draft.questionType).toBe('section_a_mcq');
    expect(draft.options.length).toBe(4);
    expect(draft.options[0].label).toBe('A');
    expect(draft.options[1].label).toBe('B');
    expect(draft.correctOptionIds).toContain('B');
    expect(draft.sourcePageStart).toBe(42);
    expect(draft.sourceMaterialId).toBe('doc-1');
  });

  it('detects constructed written questions with structured subquestions and marks breakdown', () => {
    const rawText = `
      Question 4
      Brampton Co is preparing its financial statements for the year ended 31 December 2026.
      
      Required:
      (a) Explain the 5-step model under IFRS 15 for recognizing revenue from contracts with customers. (10 marks)
      (b) Calculate the contract liability to be recognized at the reporting date. (6 marks)
      (c) Discuss the ethical implications for the finance director. (4 marks)
    `;

    const draft = parseQuestionBlock('4', rawText, 'FR', 'doc-1', 18);

    expect(draft.questionNumber).toBe('Q4');
    expect(draft.availableMarks).toBe(20);
    expect(draft.questionType).toBe('section_c_constructed');
    expect(draft.options.length).toBe(0);
    expect(draft.subQuestions).toBeDefined();
    expect(draft.subQuestions?.length).toBe(3);
    expect(draft.subQuestions?.[0].label).toBe('(a)');
    expect(draft.subQuestions?.[0].marks).toBe(10);
    expect(draft.subQuestions?.[1].label).toBe('(b)');
    expect(draft.subQuestions?.[1].marks).toBe(6);
    expect(draft.subQuestions?.[2].label).toBe('(c)');
    expect(draft.subQuestions?.[2].marks).toBe(4);
  });

  it('detects printed page numbers and calculates exact printed-to-physical offset', () => {
    const pageText = `
      ACCA Applied Skills
      Financial Reporting (FR)
      Practice Questions
      
      14
    `;

    const detected = detectPrintedPageNumber(pageText);
    expect(detected).toBe(14);

    const samplePages = [
      {
        pageNum: 3,
        text: `Contents and Question Index\n1 Alpha Co 10 120\n2 Beta Co 15 125`
      },
      {
        pageNum: 18,
        text: `Question 1 Alpha Co\nScenario text...\n10`
      }
    ];

    const { mappings, pageOffset } = parseContentsAndIndex(samplePages);
    expect(mappings.length).toBe(2);
    expect(mappings[0].questionNumber).toBe('1');
    expect(mappings[0].printedQuestionPage).toBe(10);
    expect(mappings[0].printedAnswerPage).toBe(120);
    // Physical page 18 has footer 10 -> pageOffset = 18 - 10 = 8
    expect(pageOffset).toBe(8);
    expect(mappings[0].physicalQuestionPage).toBe(18);
    expect(mappings[0].physicalAnswerPage).toBe(128);
  });

  it('extracts answer sections and marking guides accurately', () => {
    const sampleAnswerPages = [
      {
        pageNum: 128,
        text: `
          Answers to Section C
          Answer 1 Alpha Co
          Marking Scheme:
          (a) Goodwill calculation 5 marks
          (b) Impairment allocation 5 marks
          Total: 10 marks
          
          Alpha Co Consolidated Statement of Financial Position...
        `
      }
    ];

    const answers = extractAnswerSections(sampleAnswerPages);
    expect(answers.length).toBe(1);
    expect(answers[0].questionNumber).toBe('1');
    expect(answers[0].physicalPage).toBe(128);
    expect(answers[0].answerText).toContain('Goodwill calculation');
  });

  it('suggests topic tags accurately for Financial Reporting (FR)', () => {
    const sampleText = 'Goodwill calculation in group consolidation with non-controlling interest (NCI) and unrealized profit in inventory.';
    const suggestions = suggestTopicsForContent(sampleText, 'FR');

    expect(suggestions).toContain('Group Financial Statements & Consolidation');
  });

  it('suggests topic tags accurately for Performance Management (PM)', () => {
    const sampleText = 'Analysis of sales mix variance and sales quantity variance compared with standard absorption costing.';
    const suggestions = suggestTopicsForContent(sampleText, 'PM');

    expect(suggestions).toContain('Variance Analysis');
  });
});
