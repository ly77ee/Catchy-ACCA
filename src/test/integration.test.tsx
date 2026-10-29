import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import {
  CatchyAccaDatabase,
  validateBackupPayload,
  createBackupPayload
} from '../db';
import {
  calculateProgressSummary,
  getQualificationVersion
} from '../config/accaStructure';
import { StudentPaperRecord, QuestionRecord } from '../types';

describe('Catchy ACCA Phase 1 Integration Workflows', () => {
  let testDb: CatchyAccaDatabase;

  beforeEach(async () => {
    testDb = new CatchyAccaDatabase();
  });

  it('1. Application persistence initializes and stores student records', async () => {
    const now = new Date().toISOString();
    await testDb.paperRecords.put({
      paperId: 'BT',
      status: 'passed',
      score: 75,
      updatedAt: now
    });

    const retrieved = await testDb.paperRecords.get('BT');
    expect(retrieved).toBeDefined();
    expect(retrieved?.status).toBe('passed');
    expect(retrieved?.score).toBe(75);
  });

  it('2. A student can update exam progress and indicators calculate accurately', async () => {
    const version = getQualificationVersion('current_2024_2026');
    const records: Record<string, StudentPaperRecord> = {};

    // Initial state: 0%
    let summary = calculateProgressSummary(version, records);
    expect(summary.overallPercentage).toBe(0);
    expect(summary.totalCompletedOrExempt).toBe(0);

    // Update BT, MA, FA to passed
    const now = new Date().toISOString();
    records['BT'] = { paperId: 'BT', status: 'passed', score: 70, updatedAt: now };
    records['MA'] = { paperId: 'MA', status: 'passed', score: 80, updatedAt: now };
    records['FA'] = { paperId: 'FA', status: 'exempt', updatedAt: now };

    summary = calculateProgressSummary(version, records);
    expect(summary.totalCompletedOrExempt).toBe(3);
    expect(summary.passedCount).toBe(2);
    expect(summary.exemptCount).toBe(1);
    expect(summary.overallPercentage).toBe(Math.round((3 / 13) * 100)); // 23%

    // Knowledge stage must be 100% completed
    const knowledgeStage = summary.stageProgress.find(s => s.stage.id === 'applied_knowledge');
    expect(knowledgeStage?.percentage).toBe(100);
    expect(knowledgeStage?.completed).toBe(3);
  });

  it('3. Question record can be created, marked doubtful, and queried', async () => {
    const now = new Date().toISOString();
    const newQuestion: QuestionRecord = {
      id: 'test-q-1',
      questionNumber: 'FR-Dec25-Q1',
      title: 'Consolidated Statement of Financial Position',
      paperId: 'FR',
      topicTags: ['Consolidation', 'PUP', 'NCI'],
      questionType: 'section_c_constructed',
      notes: 'Remember unrealized profit adjustment in inventories.',
      status: 'attempted',
      isDoubt: true,
      confidenceRating: 2,
      attempts: [
        {
          id: 'att-1',
          attemptDate: now,
          marksAwarded: 12,
          totalMarks: 20,
          remarks: 'Time ran out on deferred tax asset.'
        }
      ],
      createdAt: now,
      updatedAt: now
    };

    await testDb.questions.put(newQuestion);

    const saved = await testDb.questions.get('test-q-1');
    expect(saved).toBeDefined();
    expect(saved?.isDoubt).toBe(true);
    expect(saved?.confidenceRating).toBe(2);
    expect(saved?.topicTags).toContain('Consolidation');
    expect(saved?.attempts.length).toBe(1);

    // Toggle doubt flag off
    saved!.isDoubt = false;
    await testDb.questions.put(saved!);

    const updated = await testDb.questions.get('test-q-1');
    expect(updated?.isDoubt).toBe(false);
  });

  it('4. Data survives closing and reopening the application (simulated reload)', async () => {
    const dbInstance1 = new CatchyAccaDatabase();
    await dbInstance1.targets.put({
      id: 'default',
      nextExamPaperId: 'SBR',
      nextExamDate: '2027-06-05',
      targetScore: 72,
      weeklyStudyHours: 20
    });

    dbInstance1.close();

    // Reopen database connection
    const dbInstance2 = new CatchyAccaDatabase();
    const reloadedTarget = await dbInstance2.targets.get('default');
    expect(reloadedTarget).toBeDefined();
    expect(reloadedTarget?.nextExamPaperId).toBe('SBR');
    expect(reloadedTarget?.targetScore).toBe(72);
  });

  it('5. Backup and restore validation ensures data integrity', () => {
    const backupJson = {
      app: 'Catchy ACCA · by ly77ee',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      qualificationVersionId: 'current_2024_2026',
      paperRecords: [
        { paperId: 'FR', status: 'in_progress', updatedAt: new Date().toISOString() }
      ],
      questions: [],
      studyMaterials: [],
      studyPlans: []
    };

    const validation = validateBackupPayload(backupJson);
    expect(validation.isValid).toBe(true);
    expect(validation.summary?.papersCount).toBe(1);

    // Corrupted file
    const corrupted = { app: 'Wrong' };
    const invalidValidation = validateBackupPayload(corrupted);
    expect(invalidValidation.isValid).toBe(false);
  });
});
