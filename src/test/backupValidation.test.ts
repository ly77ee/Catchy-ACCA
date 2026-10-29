import { describe, it, expect } from 'vitest';
import { validateBackupPayload } from '../db';

describe('Backup Validation & Integrity', () => {
  it('should reject non-object payloads', () => {
    expect(validateBackupPayload(null).isValid).toBe(false);
    expect(validateBackupPayload('string').isValid).toBe(false);
    expect(validateBackupPayload(12345).isValid).toBe(false);
  });

  it('should reject backups without Catchy ACCA signature', () => {
    const fakeBackup = {
      app: 'AnotherApp',
      paperRecords: [],
      questions: []
    };
    const res = validateBackupPayload(fakeBackup);
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('Unrecognized backup file');
  });

  it('should reject backups missing paperRecords or questions array', () => {
    const invalidPayload1 = {
      app: 'Catchy ACCA · by ly77ee',
      paperRecords: 'not-an-array',
      questions: []
    };
    expect(validateBackupPayload(invalidPayload1).isValid).toBe(false);

    const invalidPayload2 = {
      app: 'Catchy ACCA · by ly77ee',
      paperRecords: [],
      questions: null
    };
    expect(validateBackupPayload(invalidPayload2).isValid).toBe(false);
  });

  it('should accept valid Catchy ACCA backups and return a summary', () => {
    const validBackup = {
      app: 'Catchy ACCA · by ly77ee',
      version: '1.0.0',
      exportedAt: '2026-10-29T10:00:00.000Z',
      qualificationVersionId: 'current_2024_2026',
      paperRecords: [
        { paperId: 'FR', status: 'in_progress', updatedAt: '2026-10-29T10:00:00.000Z' }
      ],
      questions: [
        {
          id: 'q1',
          questionNumber: 'Q1',
          title: 'FR Question',
          paperId: 'FR',
          topicTags: ['IFRS 15'],
          questionType: 'section_b_case',
          notes: '',
          status: 'attempted',
          isDoubt: false,
          confidenceRating: 4,
          attempts: [],
          createdAt: '2026-10-29T10:00:00.000Z',
          updatedAt: '2026-10-29T10:00:00.000Z'
        }
      ],
      studyMaterials: [],
      studyPlans: []
    };

    const res = validateBackupPayload(validBackup);
    expect(res.isValid).toBe(true);
    expect(res.summary?.papersCount).toBe(1);
    expect(res.summary?.questionsCount).toBe(1);
    expect(res.summary?.exportedAt).toBe('2026-10-29T10:00:00.000Z');
  });
});
