import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import {
  CatchyAccaDatabase,
  validateBackupPayload,
  createBackupPayload
} from '../db';
import { WrittenAnswerDraft, SpreadsheetWorkbook } from '../types';

describe('Phase 3 Answer Writer & Spreadsheet Integration Workflows', () => {
  let dbInstance: CatchyAccaDatabase;

  beforeEach(async () => {
    dbInstance = new CatchyAccaDatabase();
    await dbInstance.writtenAnswers.clear();
    await dbInstance.spreadsheets.clear();
  });

  it('1. Saves, closes, and reloads written answer drafts from IndexedDB', async () => {
    const now = new Date().toISOString();
    const draft: WrittenAnswerDraft = {
      id: 'ans-test-1',
      questionId: 'q-seed-1',
      paperId: 'FR',
      title: 'Consolidation Theory Attempt 1',
      attemptNumber: 1,
      contentHtml: '<h3>Goodwill Calculation</h3><p>Consideration $100k + NCI $25k - Net assets $90k = $35k Goodwill.</p>',
      plainText: 'Goodwill Calculation\nConsideration $100k + NCI $25k - Net assets $90k = $35k Goodwill.',
      wordCount: 14,
      createdAt: now,
      updatedAt: now
    };

    await dbInstance.writtenAnswers.put(draft);

    const retrieved = await dbInstance.writtenAnswers.get('ans-test-1');
    expect(retrieved).toBeDefined();
    expect(retrieved?.wordCount).toBe(14);
    expect(retrieved?.contentHtml).toContain('Goodwill Calculation');
    expect(retrieved?.questionId).toBe('q-seed-1');
  });

  it('2. Supports multiple answer attempt versions for the same question', async () => {
    const now = new Date().toISOString();
    const attempt1: WrittenAnswerDraft = {
      id: 'ans-attempt-1',
      questionId: 'q-seed-1',
      paperId: 'FR',
      title: 'Draft Attempt 1',
      attemptNumber: 1,
      contentHtml: '<p>Initial thoughts</p>',
      plainText: 'Initial thoughts',
      wordCount: 2,
      createdAt: now,
      updatedAt: now
    };

    const attempt2: WrittenAnswerDraft = {
      id: 'ans-attempt-2',
      questionId: 'q-seed-1',
      paperId: 'FR',
      title: 'Draft Attempt 2',
      attemptNumber: 2,
      contentHtml: '<p>Refined answer with IFRS standards cited.</p>',
      plainText: 'Refined answer with IFRS standards cited.',
      wordCount: 7,
      createdAt: now,
      updatedAt: now
    };

    await dbInstance.writtenAnswers.bulkPut([attempt1, attempt2]);

    const forQuestion = await dbInstance.writtenAnswers
      .where('questionId')
      .equals('q-seed-1')
      .toArray();

    expect(forQuestion.length).toBe(2);
    expect(forQuestion.some(a => a.attemptNumber === 1)).toBe(true);
    expect(forQuestion.some(a => a.attemptNumber === 2)).toBe(true);
  });

  it('3. Saves and restores spreadsheet workbooks linked to questions', async () => {
    const now = new Date().toISOString();
    const wb: SpreadsheetWorkbook = {
      id: 'wb-test-1',
      questionId: 'q-seed-1',
      paperId: 'FR',
      title: 'Workings for Consolidation',
      activeSheetIndex: 0,
      sheets: [
        {
          id: 's1',
          name: 'Goodwill Calc',
          cells: {
            A1: { raw: '100' },
            A2: { raw: '25' },
            A3: { raw: '=A1+A2' }
          },
          rowCount: 10,
          colCount: 5
        }
      ],
      createdAt: now,
      updatedAt: now
    };

    await dbInstance.spreadsheets.put(wb);

    const retrievedWb = await dbInstance.spreadsheets.get('wb-test-1');
    expect(retrievedWb).toBeDefined();
    expect(retrievedWb?.paperId).toBe('FR');
    expect(retrievedWb?.sheets.length).toBe(1);
    expect(retrievedWb?.sheets[0].cells['A3']?.raw).toBe('=A1+A2');
  });

  it('4. Backup and restore validates and exports written answers and spreadsheets', async () => {
    const now = new Date().toISOString();
    const backupData = {
      app: 'Catchy ACCA · by ly77ee',
      version: '1.2.0',
      exportedAt: now,
      qualificationVersionId: 'current_2024_2026',
      paperRecords: [{ paperId: 'FR', status: 'in_progress', updatedAt: now }],
      questions: [],
      studyMaterials: [],
      studyPlans: [],
      examAttempts: [],
      writtenAnswers: [
        {
          id: 'ans-1',
          paperId: 'FR',
          title: 'Answer 1',
          attemptNumber: 1,
          contentHtml: '<p>Text</p>',
          plainText: 'Text',
          wordCount: 1,
          createdAt: now,
          updatedAt: now
        }
      ],
      spreadsheets: [
        {
          id: 'wb-1',
          paperId: 'FR',
          title: 'Workbook 1',
          activeSheetIndex: 0,
          sheets: [],
          createdAt: now,
          updatedAt: now
        }
      ]
    };

    const validation = validateBackupPayload(backupData);
    expect(validation.isValid).toBe(true);
    expect(validation.summary?.answersCount).toBe(1);
    expect(validation.summary?.spreadsheetsCount).toBe(1);
  });
});
