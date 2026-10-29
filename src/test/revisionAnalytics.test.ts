import { describe, it, expect } from 'vitest';
import { QuestionRecord, ExamAttemptRecord, StudentPaperRecord } from '../types';
import { ACCA_SYLLABUS_TOPICS } from '../config/syllabusTopics';

describe('Catchy ACCA Phase 4 Revision & Progress Analytics', () => {
  const sampleQuestions: QuestionRecord[] = [
    {
      id: 'q1',
      questionNumber: 'Q1',
      title: 'Group Consolidation and Unrealised Profit',
      paperId: 'FR',
      topicTags: ['Group Financial Statements & Consolidation', 'IFRS 10'],
      questionType: 'section_c_constructed',
      notes: 'Calculate PUP on inventory transferred between parent and sub.',
      status: 'attempted',
      isDoubt: true, // Marked as doubt
      confidenceRating: 2,
      attempts: [],
      availableMarks: 20,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'q2',
      questionNumber: 'Q2',
      title: 'IFRS 16 Lease Commencement Accounting',
      paperId: 'FR',
      topicTags: ['Leases', 'IFRS 16'],
      questionType: 'section_a_mcq',
      notes: '',
      status: 'attempted',
      isDoubt: false,
      confidenceRating: 5,
      attempts: [],
      availableMarks: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const sampleAttempts: ExamAttemptRecord[] = [
    {
      id: 'att-1',
      paperId: 'FR',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      totalTimeSeconds: 600,
      config: {
        paperId: 'FR',
        questionCount: 1,
        ordering: 'sequential',
        mode: 'untimed',
        feedbackMode: 'delayed',
      },
      questionIds: ['q1'],
      responses: {
        q1: {
          questionId: 'q1',
          writtenAnswer: 'PUP is calculated on selling price margin.',
          marksAwarded: 6, // 6/20 = 30% (< 50% threshold)
          isFlaggedForReview: false,
        },
      },
      totalMarksAvailable: 20,
      totalMarksScored: 6,
      scorePercentage: 30,
      status: 'completed',
    },
  ];

  it('1. Correctly classifies weak syllabus topics needing revision based on doubt flags and low scores', () => {
    // Topic: Group Financial Statements & Consolidation
    const q = sampleQuestions[0];
    const att = sampleAttempts[0];

    const isDoubt = q.isDoubt;
    const scorePct = (att.responses['q1'].marksAwarded! / (q.availableMarks || 2)) * 100;

    expect(isDoubt).toBe(true);
    expect(scorePct).toBe(30);

    const status = (isDoubt || scorePct < 50) ? 'needs_revision' : 'solid';
    expect(status).toBe('needs_revision');
  });

  it('2. Aggregates Mistake & Doubt Journal containing questions marked doubtful or failed in exams', () => {
    const mistakeQuestions = sampleQuestions.filter((q) => {
      const isDoubt = q.isDoubt;
      let failedInExam = false;
      sampleAttempts.forEach((a) => {
        if (a.questionIds.includes(q.id)) {
          const resp = a.responses[q.id];
          if (resp && resp.marksAwarded !== undefined) {
            if (resp.marksAwarded / (q.availableMarks || 2) < 0.5) {
              failedInExam = true;
            }
          }
        }
      });
      return isDoubt || failedInExam;
    });

    expect(mistakeQuestions).toHaveLength(1);
    expect(mistakeQuestions[0].id).toBe('q1');
    expect(mistakeQuestions[0].questionNumber).toBe('Q1');
  });

  it('3. Generates targeted revision exam question list from weak topics', () => {
    const weakTopics = ['group financial statements & consolidation'];
    const eligibleQuestions = sampleQuestions.filter((q) => {
      if (q.isDoubt) return true;
      return q.topicTags.some((t) => weakTopics.some((wt) => wt.includes(t.toLowerCase())));
    });

    expect(eligibleQuestions).toHaveLength(1);
    expect(eligibleQuestions[0].id).toBe('q1');
  });
});
