import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { SpreadsheetWorkspace } from '../components/spreadsheet/SpreadsheetWorkspace';
import { db } from '../db';
import { QUALIFICATION_VERSIONS } from '../config/accaStructure';
import { QuestionRecord, SpreadsheetWorkbook } from '../types';
import {
  evaluateFortuneFormula,
  createDefaultFortuneSheets,
  fortuneSheetsToSpreadsheetWorkbook
} from '../utils/fortuneSheetAdapter';

// Setup Mock Canvas context for jsdom environment
if (typeof window !== 'undefined' && window.HTMLCanvasElement) {
  window.HTMLCanvasElement.prototype.getContext = (() => ({
    fillRect: () => {},
    clearRect: () => {},
    getImageData: () => ({ data: [] }),
    putImageData: () => {},
    createImageData: () => [],
    setTransform: () => {},
    drawImage: () => {},
    save: () => {},
    fillText: () => {},
    restore: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    closePath: () => {},
    stroke: () => {},
    translate: () => {},
    scale: () => {},
    rotate: () => {},
    arc: () => {},
    fill: () => {},
    measureText: () => ({ width: 50, actualBoundingBoxAscent: 10, actualBoundingBoxDescent: 3 }),
    transform: () => {},
    rect: () => {},
    clip: () => {},
  })) as any;
}

const mockVersion = QUALIFICATION_VERSIONS[0];

const mockQuestions: QuestionRecord[] = [
  {
    id: 'q-fr-01',
    paperId: 'FR',
    syllabusArea: 'B. Financial Statements',
    questionNumber: 'Q1',
    title: 'Consolidated Statement of Financial Position',
    questionType: 'section_c_constructed',
    availableMarks: 20,
    difficulty: 'medium',
    suggestedMinutes: 36,
    scenario: 'Prepare the consolidated statement of financial position for Parent and Subsidiary.',
    topicTags: ['Consolidation', 'IFRS 3'],
    notes: '',
    status: 'not_started',
    isDoubt: false,
    confidenceRating: 3,
    attempts: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

describe('Spreadsheet Workspace Full Integration & Acceptance Suite', () => {
  beforeEach(async () => {
    await db.spreadsheets.clear();
    await db.activityLogs.clear();
    vi.clearAllMocks();
  });

  it('1. Opening Excel Workspace displays the FortuneSheet replacement with complete toolbar and formula bar', async () => {
    const { container } = render(
      <SpreadsheetWorkspace
        version={mockVersion}
        allQuestions={mockQuestions}
        initialPaperId="FR"
      />
    );

    // Verify header and badge
    expect(screen.getByText('Excel Workspace')).toBeDefined();
    expect(screen.getByText('FortuneSheet Engine')).toBeDefined();

    // Verify FortuneSheet DOM elements mounted
    await waitFor(() => {
      expect(container.querySelector('.fortune-container')).not.toBeNull();
      expect(container.querySelector('.fortune-toolbar')).not.toBeNull();
      expect(container.querySelector('.fortune-fx-editor')).not.toBeNull();
    });
  });

  it('2. Evaluates required formulas accurately: SUM, addition, logical IF, recalculation, and division by zero', () => {
    // 2.1: 10 in A1, 20 in A2, =SUM(A1:A2) in A3 -> 30
    const sumSheets = createDefaultFortuneSheets('FR');
    sumSheets[0].celldata = [
      { r: 0, c: 0, v: { v: 10, m: '10' } },
      { r: 1, c: 0, v: { v: 20, m: '20' } },
    ];
    const sumResult = evaluateFortuneFormula('=SUM(A1:A2)', sumSheets, 2, 0, sumSheets[0].id);
    expect(sumResult.success).toBe(true);
    expect(sumResult.value).toBe(30);

    // 2.2: =A1+B1 after entering values in A1 and B1
    sumSheets[0].celldata = [
      { r: 0, c: 0, v: { v: 120, m: '120' } },
      { r: 0, c: 1, v: { v: 80, m: '80' } },
    ];
    const addResult = evaluateFortuneFormula('=A1+B1', sumSheets, 0, 2, sumSheets[0].id);
    expect(addResult.success).toBe(true);
    expect(addResult.value).toBe(200);

    // 2.3: =IF(A1>100,"Pass","Fail") with 150 in A1 -> Pass
    sumSheets[0].celldata = [
      { r: 0, c: 0, v: { v: 150, m: '150' } },
    ];
    const ifResultPass = evaluateFortuneFormula('=IF(A1>100,"Pass","Fail")', sumSheets, 0, 1, sumSheets[0].id);
    expect(ifResultPass.success).toBe(true);
    expect(ifResultPass.value).toBe('Pass');

    // 2.4: Changing source value recalculates dependent formula dynamically
    sumSheets[0].celldata = [
      { r: 0, c: 0, v: { v: 80, m: '80' } }, // A1 = 80 (< 100)
    ];
    const ifResultFail = evaluateFortuneFormula('=IF(A1>100,"Pass","Fail")', sumSheets, 0, 1, sumSheets[0].id);
    expect(ifResultFail.success).toBe(true);
    expect(ifResultFail.value).toBe('Fail');

    // 2.5: Division by zero returns error token without throwing
    sumSheets[0].celldata = [
      { r: 0, c: 0, v: { v: 100, m: '100' } },
      { r: 0, c: 1, v: { v: 0, m: '0' } },
    ];
    const divZeroResult = evaluateFortuneFormula('=A1/B1', sumSheets, 0, 2, sumSheets[0].id);
    expect(divZeroResult.value).toContain('DIV/0');
  });

  it('3. Saves workbook to IndexedDB and restores user changes after reopening', async () => {
    // 3.1 Initial render creates and persists default workbook
    const { unmount } = render(
      <SpreadsheetWorkspace
        version={mockVersion}
        allQuestions={mockQuestions}
        initialPaperId="FR"
      />
    );

    await waitFor(async () => {
      const workbooks = await db.spreadsheets.where('paperId').equals('FR').toArray();
      expect(workbooks.length).toBeGreaterThan(0);
    });

    const initialWbs = await db.spreadsheets.where('paperId').equals('FR').toArray();
    const targetWb = initialWbs[0];
    expect(targetWb.paperId).toBe('FR');

    // Simulate user editing cells in the workbook
    const modifiedSheets = createDefaultFortuneSheets('FR');
    modifiedSheets[0].celldata?.push({
      r: 12,
      c: 0,
      v: { v: 'Audit Fee Accrual', m: 'Audit Fee Accrual' }
    });
    modifiedSheets[0].celldata?.push({
      r: 12,
      c: 1,
      v: { v: 45000, m: '45,000.00', ct: { fa: '$#,##0.00', t: 'n' } }
    });

    const updatedWb = fortuneSheetsToSpreadsheetWorkbook(modifiedSheets, targetWb);
    await db.spreadsheets.put(updatedWb);

    // Unmount simulated browser close
    unmount();

    // 3.2 Re-open / refresh application: verifies restoration
    render(
      <SpreadsheetWorkspace
        version={mockVersion}
        allQuestions={mockQuestions}
        initialPaperId="FR"
      />
    );

    await waitFor(async () => {
      const reloadedWbs = await db.spreadsheets.where('paperId').equals('FR').toArray();
      expect(reloadedWbs.length).toBe(1);
      expect(reloadedWbs[0].sheets[0].cells['A13']?.raw).toBe('Audit Fee Accrual');
      expect(reloadedWbs[0].sheets[0].cells['B13']?.raw).toBe('45000');
    });
  });

  it('4. Keeps independent question workbooks and exam attempts separate in storage', async () => {
    // Save general revision workbook for paper PM
    const generalSheets = createDefaultFortuneSheets('PM', 'General Practice');
    const generalWb: SpreadsheetWorkbook = {
      id: 'wb-pm-general-01',
      paperId: 'PM',
      title: 'PM General Practice',
      activeSheetIndex: 0,
      sheets: [],
      fortuneData: generalSheets,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await db.spreadsheets.put(fortuneSheetsToSpreadsheetWorkbook(generalSheets, generalWb));

    // Save isolated workbook for an exam attempt
    const examSheets = createDefaultFortuneSheets('PM', 'Exam Attempt 1');
    const examWb: SpreadsheetWorkbook = {
      id: 'wb-exam-attempt-888-q1',
      paperId: 'PM',
      questionId: 'q-pm-01',
      examAttemptId: 'attempt-888',
      title: 'PM CBE Attempt 1 Workings',
      activeSheetIndex: 0,
      sheets: [],
      fortuneData: examSheets,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await db.spreadsheets.put(fortuneSheetsToSpreadsheetWorkbook(examSheets, examWb));

    // Query exam attempt records
    const examResults = await db.spreadsheets
      .where('paperId')
      .equals('PM')
      .filter(w => w.examAttemptId === 'attempt-888')
      .toArray();

    expect(examResults.length).toBe(1);
    expect(examResults[0].examAttemptId).toBe('attempt-888');
    expect(examResults[0].questionId).toBe('q-pm-01');

    // Query standalone revision records
    const generalResults = await db.spreadsheets
      .where('paperId')
      .equals('PM')
      .filter(w => !w.examAttemptId)
      .toArray();

    expect(generalResults.length).toBe(1);
    expect(generalResults[0].examAttemptId).toBeUndefined();
  });
});
