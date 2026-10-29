import { describe, it, expect } from 'vitest';
import { parseQuestionBlock } from '../utils/pdfExtractor';
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

  it('detects constructed written questions when options are absent', () => {
    const rawText = `
      Question 4
      Explain the 5-step model under IFRS 15 for recognizing revenue from contracts with customers.
      Draft the journal entries required for a contract with variable consideration.
      (10 marks)
    `;

    const draft = parseQuestionBlock('4', rawText, 'FR', 'doc-1', 18);

    expect(draft.questionNumber).toBe('Q4');
    expect(draft.availableMarks).toBe(10);
    expect(draft.questionType).toBe('section_c_constructed');
    expect(draft.options.length).toBe(0);
    expect(draft.topicSuggestions).toContain('Revenue from Contracts with Customers');
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
