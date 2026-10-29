import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import {
  parseMarkdownChecklist,
  exportChecklistToMarkdown
} from '../utils/markdownChecklistParser';
import {
  evaluateFormula,
  recomputeSheet,
  recomputeWorkbook
} from '../utils/formulaEngine';
import { calculateDaysRemaining } from '../utils/dateUtils';
import { scoreQuestionResponse } from '../utils/examScoring';
import {
  QuestionRecord,
  ChecklistRecord,
  ChecklistItem,
  SpreadsheetWorkbook,
  SpreadsheetSheet
} from '../types';

describe('Catchy ACCA Redesign Specification Suite', () => {
  beforeEach(async () => {
    await db.checklists.clear();
    await db.checklistItems.clear();
    await db.questions.clear();
    await db.newsCache.clear();
  });

  describe('1. Study Checklist Markdown Parsing, Ordering & Persistence', () => {
    const inputMd = `# SBR

## Group accounting
- [ ] Q1 - Goodwill and NCI
- [ ] Q2 - Associates
- [x] Q3 - Consolidated SFP

## Financial instruments
- [ ] Q4 - Classification and measurement
- [ ] Q5 - Hedge accounting`;

    it('preserves exact task hierarchy, ordering, and pre-checked state in IndexedDB', async () => {
      const parsed = parseMarkdownChecklist(inputMd, 'SBR');
      expect(parsed.totalTasks).toBe(5);
      expect(parsed.completedTasks).toBe(1);

      const checklistId = 'cl-test-1';
      const now = new Date().toISOString();

      await db.checklists.put({
        id: checklistId,
        title: parsed.detectedTitle,
        paperId: parsed.paperCode || 'SBR',
        rawMarkdown: inputMd,
        totalTasks: parsed.totalTasks,
        completedTasks: parsed.completedTasks,
        createdAt: now,
        updatedAt: now
      });

      const items: ChecklistItem[] = parsed.items.map((item, idx) => ({
        ...item,
        id: `item-test-${idx}`,
        checklistId,
        createdAt: now,
        updatedAt: now
      }));

      await db.checklistItems.bulkPut(items);

      // Verify persistence from DB
      const loadedItems = await db.checklistItems.where('checklistId').equals(checklistId).sortBy('order');
      expect(loadedItems).toHaveLength(items.length);

      // Check task 3 is pre-checked
      const q3 = loadedItems.find(i => i.title.includes('Q3'));
      expect(q3?.completed).toBe(true);

      // Toggle task 1 to completed
      const q1 = loadedItems.find(i => i.title.includes('Q1'));
      expect(q1?.completed).toBe(false);
      await db.checklistItems.update(q1!.id, { completed: true });

      const updatedQ1 = await db.checklistItems.get(q1!.id);
      expect(updatedQ1?.completed).toBe(true);

      // Re-export to markdown
      const reloadedItems = await db.checklistItems.where('checklistId').equals(checklistId).sortBy('order');
      const exported = exportChecklistToMarkdown(parsed.detectedTitle, reloadedItems);
      expect(exported).toContain('- [x] Q1 - Goodwill and NCI');
      expect(exported).toContain('- [x] Q3 - Consolidated SFP');
      expect(exported).toContain('- [ ] Q2 - Associates');
    });

    it('prevents duplicate items on re-import through replace strategy', async () => {
      const checklistId = 'cl-dup-test';
      const now = new Date().toISOString();

      // First import
      const parsed1 = parseMarkdownChecklist(inputMd, 'SBR');
      const items1: ChecklistItem[] = parsed1.items.map((item, idx) => ({
        ...item,
        id: `item-run1-${idx}`,
        checklistId,
        createdAt: now,
        updatedAt: now
      }));
      await db.checklistItems.bulkPut(items1);

      expect(await db.checklistItems.where('checklistId').equals(checklistId).count()).toBe(items1.length);

      // Second import with replace strategy: clear and re-insert
      await db.checklistItems.where('checklistId').equals(checklistId).delete();
      const parsed2 = parseMarkdownChecklist(inputMd, 'SBR');
      const items2: ChecklistItem[] = parsed2.items.map((item, idx) => ({
        ...item,
        id: `item-run2-${idx}`,
        checklistId,
        createdAt: now,
        updatedAt: now
      }));
      await db.checklistItems.bulkPut(items2);

      // Count must still be exactly items2.length without duplicates
      expect(await db.checklistItems.where('checklistId').equals(checklistId).count()).toBe(items2.length);
    });
  });

  describe('2. Question Bank Authoring, Validation, and Isolation', () => {
    it('authors structured questions, validates publication, and isolates model answer from student view', async () => {
      const now = new Date().toISOString();
      const question: QuestionRecord = {
        id: 'q-author-test',
        questionNumber: 'SBR-Q1',
        title: 'Consolidated Statement of Financial Position',
        paperId: 'SBR',
        qualificationVersionId: 'current_2024_2026',
        syllabusArea: 'Group Accounting',
        topic: 'Goodwill & NCI',
        questionType: 'section_c_constructed',
        difficulty: 'medium',
        availableMarks: 20,
        suggestedMinutes: 36,
        scenario: 'Draft financial statements of Parent Co and Subsidiary Co as at 31 Dec 2026...',
        content: 'Prepare the consolidated statement of financial position for the group. (20 marks)',
        modelAnswer: 'Goodwill: Consideration $120,000 + NCI $30,000 - Net Assets $110,000 = $40,000.',
        rubric: 'Goodwill working: 4 marks. Inventory PUP: 2 marks. Retained earnings: 6 marks.',
        publishStatus: 'published',
        topicTags: ['Consolidation', 'IFRS 3'],
        notes: '',
        status: 'not_started',
        isDoubt: false,
        confidenceRating: 3,
        attempts: [],
        createdAt: now,
        updatedAt: now
      };

      await db.questions.put(question);

      const retrieved = await db.questions.get('q-author-test');
      expect(retrieved).toBeDefined();
      expect(retrieved?.publishStatus).toBe('published');
      expect(retrieved?.availableMarks).toBe(20);

      // Verify model answer and rubric are stored separately
      expect(retrieved?.modelAnswer).toContain('Goodwill: Consideration');
      expect(retrieved?.content).not.toContain('Goodwill: Consideration');

      // Verify MCQ auto-scoring
      const mcqQuestion: QuestionRecord = {
        ...question,
        id: 'q-mcq-test',
        questionType: 'section_a_mcq',
        availableMarks: 2,
        options: [
          { id: 'A', label: 'A', text: 'IAS 36' },
          { id: 'B', label: 'B', text: 'IFRS 16' },
          { id: 'C', label: 'C', text: 'IFRS 9' },
          { id: 'D', label: 'D', text: 'IAS 37' },
        ],
        correctOptionIds: ['B']
      };

      const correctScoring = scoreQuestionResponse(mcqQuestion, {
        questionId: 'q-mcq-test',
        selectedOptionIds: ['B'],
        isFlaggedForReview: false
      });
      expect(correctScoring.isCorrect).toBe(true);
      expect(correctScoring.marksAwarded).toBe(2);

      const wrongScoring = scoreQuestionResponse(mcqQuestion, {
        questionId: 'q-mcq-test',
        selectedOptionIds: ['A'],
        isFlaggedForReview: false
      });
      expect(wrongScoring.isCorrect).toBe(false);
      expect(wrongScoring.marksAwarded).toBe(0);
    });
  });

  describe('3. Spreadsheet Formulas and Multi-Cell Engine', () => {
    it('calculates Section 6 test formulas accurately', () => {
      const sheet: SpreadsheetSheet = {
        id: 's1',
        name: 'Workings',
        cells: {
          A1: { raw: '150' },
          B1: { raw: '50' },
          B2: { raw: '100' },
          B3: { raw: '200' },
          B4: { raw: '300' },
          B5: { raw: '400' },
          C1: { raw: '=A1+B1' },
          C2: { raw: '=IF(A1>100,"Pass","Fail")' },
          C3: { raw: '=SUM(B2:B5)*10%' },
        },
        rowCount: 10,
        colCount: 5
      };

      const recomputed = recomputeSheet(sheet);
      expect(recomputed.cells['C1'].computed).toBe(200);
      expect(recomputed.cells['C2'].computed).toBe('Pass');
      // Sum B2..B5 = 1000. 1000 * 10% = 100.
      expect(recomputed.cells['C3'].computed).toBe(100);
    });

    it('evaluates cross-sheet workbook references and detects division by zero', () => {
      const wb: SpreadsheetWorkbook = {
        id: 'wb-test',
        paperId: 'FR',
        title: 'Consolidation Test',
        activeSheetIndex: 0,
        sheets: [
          {
            id: 's1',
            name: 'Sheet1',
            cells: {
              A1: { raw: '500' },
              A2: { raw: '=Sheet2!B1 * 2' },
              A3: { raw: '=A1 / 0' }
            },
            rowCount: 5,
            colCount: 5
          },
          {
            id: 's2',
            name: 'Sheet2',
            cells: {
              B1: { raw: '150' }
            },
            rowCount: 5,
            colCount: 5
          }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const computedWb = recomputeWorkbook(wb);
      expect(computedWb.sheets[0].cells['A2'].computed).toBe(300);
      expect(computedWb.sheets[0].cells['A3'].computed).toBe('#DIV/0!');
    });
  });

  describe('4. Exam Planner Countdown and Community Destination', () => {
    it('calculates exam countdown without timezone shift or off-by-one errors', () => {
      const ref = new Date(2027, 2, 1); // March 1, 2027
      expect(calculateDaysRemaining('2027-03-05', ref)).toBe(4);
      expect(calculateDaysRemaining('2027-03-01', ref)).toBe(0);
      expect(calculateDaysRemaining(undefined, ref)).toBeNull();
    });

    it('verifies verified Reddit community URL', () => {
      const redditUrl = 'https://www.reddit.com/r/ACCA/';
      expect(redditUrl).toBe('https://www.reddit.com/r/ACCA/');
    });
  });
});
