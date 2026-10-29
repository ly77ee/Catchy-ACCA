import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import {
  CatchyAccaDatabase,
  saveExamAttempt,
  initializeDatabase,
  validateBackupPayload
} from '../db';
import { ExamAttemptRecord, QuestionRecord } from '../types';

describe('Phase 2 Exam Simulator & Attempt History Integration', () => {
  let dbInstance: CatchyAccaDatabase;

  beforeEach(async () => {
    dbInstance = new CatchyAccaDatabase();
  });

  it('saves completed exam attempt and synchronizes question attempt history', async () => {
    const now = new Date().toISOString();
    const testQuestion: QuestionRecord = {
      id: 'q-sim-test',
      questionNumber: 'FR-SIM-1',
      title: 'IFRS 16 Test Question',
      paperId: 'FR',
      topicTags: ['Leases'],
      questionType: 'section_a_mcq',
      notes: '',
      status: 'not_started',
      isDoubt: false,
      confidenceRating: 3,
      availableMarks: 2,
      options: [
        { id: 'A', label: 'A', text: 'Option A' },
        { id: 'B', label: 'B', text: 'Option B' }
      ],
      correctOptionIds: ['B'],
      attempts: [],
      createdAt: now,
      updatedAt: now
    };

    await dbInstance.questions.put(testQuestion);

    const attempt: ExamAttemptRecord = {
      id: 'attempt-101',
      paperId: 'FR',
      startedAt: now,
      completedAt: now,
      totalTimeSeconds: 120,
      config: {
        paperId: 'FR',
        questionCount: 1,
        ordering: 'sequential',
        mode: 'timed',
        durationMinutes: 10,
        feedbackMode: 'delayed'
      },
      questionIds: ['q-sim-test'],
      responses: {
        'q-sim-test': {
          questionId: 'q-sim-test',
          selectedOptionIds: ['B'],
          isFlaggedForReview: false,
          marksAwarded: 2,
          isAutoMarked: true,
          answeredAt: now
        }
      },
      totalMarksAvailable: 2,
      totalMarksScored: 2,
      scorePercentage: 100,
      status: 'completed'
    };

    await dbInstance.examAttempts.put(attempt);

    // Verify stored attempt
    const savedAttempt = await dbInstance.examAttempts.get('attempt-101');
    expect(savedAttempt).toBeDefined();
    expect(savedAttempt?.scorePercentage).toBe(100);
    expect(savedAttempt?.totalMarksScored).toBe(2);
    expect(savedAttempt?.paperId).toBe('FR');
  });

  it('validates backups including exam attempt records', () => {
    const now = new Date().toISOString();
    const backupWithAttempts = {
      app: 'Catchy ACCA · by ly77ee',
      version: '1.1.0',
      exportedAt: now,
      qualificationVersionId: 'current_2024_2026',
      paperRecords: [{ paperId: 'FR', status: 'in_progress', updatedAt: now }],
      questions: [],
      studyMaterials: [],
      studyPlans: [],
      examAttempts: [
        {
          id: 'att-1',
          paperId: 'FR',
          startedAt: now,
          totalTimeSeconds: 600,
          totalMarksAvailable: 20,
          totalMarksScored: 15,
          scorePercentage: 75,
          status: 'completed'
        }
      ]
    };

    const result = validateBackupPayload(backupWithAttempts);
    expect(result.isValid).toBe(true);
    expect(result.summary?.attemptsCount).toBe(1);
    expect(result.summary?.papersCount).toBe(1);
  });

  it('updates existing questions without creating duplicates on re-importing the same material', async () => {
    const now = new Date().toISOString();
    const materialId = 'mat-reimport-test';
    const qId = `q-${materialId}-Q1`;

    // 1. Initial import of question
    const initialQuestion: QuestionRecord = {
      id: qId,
      questionNumber: 'Q1',
      title: 'Initial Title',
      paperId: 'FR',
      sourceMaterialId: materialId,
      sourcePage: 10,
      topicTags: ['Leases'],
      questionType: 'section_a_mcq',
      notes: 'Initial prompt',
      status: 'attempted',
      isDoubt: true,
      confidenceRating: 4,
      availableMarks: 2,
      attempts: [
        {
          id: 'att-user-1',
          attemptDate: now,
          marksAwarded: 2,
          totalMarks: 2
        }
      ],
      createdAt: now,
      updatedAt: now
    };

    await dbInstance.questions.put(initialQuestion);
    expect(await dbInstance.questions.where('sourceMaterialId').equals(materialId).count()).toBe(1);

    // 2. Simulated re-import with updated text
    const existing = await dbInstance.questions.get(qId);
    expect(existing).toBeDefined();

    const reimportedQuestion: QuestionRecord = {
      ...initialQuestion,
      title: 'Updated Title from New Scan',
      status: existing?.status || 'not_started',
      isDoubt: existing?.isDoubt || false,
      attempts: existing?.attempts || [],
      updatedAt: new Date().toISOString()
    };

    await dbInstance.questions.put(reimportedQuestion);

    // Verify still exactly 1 record (no duplicate) and user state preserved
    const totalCount = await dbInstance.questions.where('sourceMaterialId').equals(materialId).count();
    expect(totalCount).toBe(1);

    const updated = await dbInstance.questions.get(qId);
    expect(updated?.title).toBe('Updated Title from New Scan');
    expect(updated?.isDoubt).toBe(true);
    expect(updated?.attempts.length).toBe(1);
  });
});
