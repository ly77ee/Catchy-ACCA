import { describe, it, expect } from 'vitest';
import {
  scoreQuestionResponse,
  prepareExamQuestions,
  shuffleArray
} from '../utils/examScoring';
import { QuestionRecord, ExamConfig } from '../types';

describe('Exam Simulator Scoring & Question Preparation', () => {
  const sampleMcq: QuestionRecord = {
    id: 'q-mcq-1',
    questionNumber: 'Q1',
    title: 'IFRS 16 Lease Liability Measurement',
    paperId: 'FR',
    topicTags: ['Leases', 'IFRS 16'],
    questionType: 'section_a_mcq',
    notes: 'Lease liability definition under IFRS 16',
    status: 'not_started',
    isDoubt: false,
    confidenceRating: 4,
    availableMarks: 2,
    options: [
      { id: 'A', label: 'A', text: 'Fair value of the asset' },
      { id: 'B', label: 'B', text: 'Present value of lease payments not paid' },
      { id: 'C', label: 'C', text: 'Contractual undiscounted payments' },
      { id: 'D', label: 'D', text: 'Historical cost minus residual' }
    ],
    correctOptionIds: ['B'],
    markingGuide: 'Under IFRS 16, measured at present value of lease payments not paid.',
    attempts: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const sampleMultiSelect: QuestionRecord = {
    id: 'q-multi-1',
    questionNumber: 'Q2',
    title: 'IAS 37 Provisions Criteria',
    paperId: 'FR',
    topicTags: ['Provisions', 'IAS 37'],
    questionType: 'multi_select',
    notes: 'Select two required criteria for recognizing a provision under IAS 37',
    status: 'not_started',
    isDoubt: false,
    confidenceRating: 3,
    availableMarks: 2,
    options: [
      { id: 'A', label: 'A', text: 'A present obligation from a past event' },
      { id: 'B', label: 'B', text: 'A probable outflow of economic benefits' },
      { id: 'C', label: 'C', text: 'Approval by the board of directors in next meeting' },
      { id: 'D', label: 'D', text: 'Binding legal contract enforceable in court only' }
    ],
    correctOptionIds: ['A', 'B'],
    markingGuide: 'IAS 37 requires present obligation, probable outflow, and reliable estimate.',
    attempts: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const sampleWritten: QuestionRecord = {
    id: 'q-written-1',
    questionNumber: 'Q3',
    title: 'Consolidated Statement of Financial Position',
    paperId: 'FR',
    topicTags: ['Consolidation', 'Goodwill'],
    questionType: 'section_c_constructed',
    notes: 'Draft group balance sheet including fair value adjustments and NCI.',
    status: 'not_started',
    isDoubt: true,
    confidenceRating: 2,
    availableMarks: 20,
    markingGuide: 'Goodwill: 5 marks; PPE Fair value: 3 marks; NCI: 4 marks; Retained earnings: 8 marks.',
    attempts: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  it('correctly scores single-select MCQ when student selects the correct option', () => {
    const result = scoreQuestionResponse(sampleMcq, {
      questionId: 'q-mcq-1',
      selectedOptionIds: ['B'],
      isFlaggedForReview: false
    });

    expect(result.isAutoMarked).toBe(true);
    expect(result.isCorrect).toBe(true);
    expect(result.marksAwarded).toBe(2);
    expect(result.maxMarks).toBe(2);
  });

  it('awards 0 marks for incorrect single-select MCQ', () => {
    const result = scoreQuestionResponse(sampleMcq, {
      questionId: 'q-mcq-1',
      selectedOptionIds: ['A'],
      isFlaggedForReview: false
    });

    expect(result.isAutoMarked).toBe(true);
    expect(result.isCorrect).toBe(false);
    expect(result.marksAwarded).toBe(0);
  });

  it('handles unanswered questions gracefully with 0 marks', () => {
    const result = scoreQuestionResponse(sampleMcq, undefined);
    expect(result.isAutoMarked).toBe(true);
    expect(result.marksAwarded).toBe(0);
    expect(result.explanation).toContain('unanswered');
  });

  it('correctly awards full marks for multi-select when all correct options are selected', () => {
    const result = scoreQuestionResponse(sampleMultiSelect, {
      questionId: 'q-multi-1',
      selectedOptionIds: ['A', 'B'],
      isFlaggedForReview: false
    });

    expect(result.isCorrect).toBe(true);
    expect(result.marksAwarded).toBe(2);
  });

  it('awards partial credit for multi-select when partially correct without incorrect options', () => {
    const result = scoreQuestionResponse(sampleMultiSelect, {
      questionId: 'q-multi-1',
      selectedOptionIds: ['A'], // 1 of 2 correct
      isFlaggedForReview: false
    });

    expect(result.isPartial).toBe(true);
    expect(result.marksAwarded).toBe(1); // 50% of 2 marks = 1
  });

  it('does NOT pretend to automatically mark written essay questions without marking scheme', () => {
    const result = scoreQuestionResponse(sampleWritten, {
      questionId: 'q-written-1',
      writtenAnswer: 'Goodwill is calculated as consideration transferred plus NCI minus net assets...',
      isFlaggedForReview: false
    });

    expect(result.isAutoMarked).toBe(false);
    expect(result.explanation).toContain('Self-evaluation required');
  });

  it('correctly filters and orders questions in prepareExamQuestions', () => {
    const allQuestions = [sampleMcq, sampleMultiSelect, sampleWritten];

    const config: ExamConfig = {
      paperId: 'FR',
      topicFilters: ['Leases'],
      questionCount: 5,
      ordering: 'sequential',
      mode: 'timed',
      feedbackMode: 'delayed'
    };

    const prepared = prepareExamQuestions(allQuestions, config);
    expect(prepared.length).toBe(1);
    expect(prepared[0].id).toBe('q-mcq-1');
  });

  it('shuffles arrays without losing or duplicating elements', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const shuffled = shuffleArray(items);

    expect(shuffled.length).toBe(items.length);
    for (const item of items) {
      expect(shuffled).toContain(item);
    }
  });
});
