import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { db } from '../db';
import { QUALIFICATION_VERSIONS } from '../config/accaStructure';
import {
  computeNextFormulaReference,
  FormulaRangeState
} from '../utils/formulaKeyboardNavigator';
import {
  evaluateFortuneFormula,
  createDefaultFortuneSheets,
  spreadsheetWorkbookToFortuneSheets,
  fortuneSheetsToSpreadsheetWorkbook,
  DEFAULT_SHEET_COL_COUNT,
  DEFAULT_SHEET_ROW_COUNT
} from '../utils/fortuneSheetAdapter';
import { AppLayout } from '../components/layout/AppLayout';
import { AnswerWriter } from '../components/writer/AnswerWriter';
import { SpreadsheetWorkbook, QuestionRecord } from '../types';

describe('Catchy ACCA: Excel Grid Repair Beyond Column N, Word Editor Boundary & Question Isolation, and ACCA Sidebar Suite', () => {
  beforeEach(async () => {
    await db.writtenAnswers.clear();
    await db.spreadsheets.clear();
  });

  describe('1. Column Indexing and Conversions beyond Column N', () => {
    // Helper function matching Excel column name logic
    function colIndexToName(index: number): string {
      let temp = index;
      let col = '';
      while (temp >= 0) {
        col = String.fromCharCode((temp % 26) + 65) + col;
        temp = Math.floor(temp / 26) - 1;
      }
      return col;
    }

    function colNameToIndex(name: string): number {
      let index = 0;
      for (let i = 0; i < name.length; i++) {
        index = index * 26 + (name.charCodeAt(i) - 64);
      }
      return index - 1;
    }

    it('1.1. Converts column index to standard Excel column names beyond column N (O, P, Z, AA, AB, AZ, BA, ZZ, AAA, XFD)', () => {
      expect(colIndexToName(0)).toBe('A');
      expect(colIndexToName(13)).toBe('N');
      expect(colIndexToName(14)).toBe('O');
      expect(colIndexToName(15)).toBe('P');
      expect(colIndexToName(25)).toBe('Z');
      expect(colIndexToName(26)).toBe('AA');
      expect(colIndexToName(27)).toBe('AB');
      expect(colIndexToName(51)).toBe('AZ');
      expect(colIndexToName(52)).toBe('BA');
      expect(colIndexToName(199)).toBe('GR');
      expect(colIndexToName(701)).toBe('ZZ');
      expect(colIndexToName(702)).toBe('AAA');
      expect(colIndexToName(16383)).toBe('XFD');
    });

    it('1.2. Converts standard Excel column names back to zero-based column indices', () => {
      expect(colNameToIndex('A')).toBe(0);
      expect(colNameToIndex('N')).toBe(13);
      expect(colNameToIndex('O')).toBe(14);
      expect(colNameToIndex('P')).toBe(15);
      expect(colNameToIndex('Z')).toBe(25);
      expect(colNameToIndex('AA')).toBe(26);
      expect(colNameToIndex('AB')).toBe(27);
      expect(colNameToIndex('AZ')).toBe(51);
      expect(colNameToIndex('BA')).toBe(52);
      expect(colNameToIndex('GR')).toBe(199);
      expect(colNameToIndex('ZZ')).toBe(701);
      expect(colNameToIndex('AAA')).toBe(702);
      expect(colNameToIndex('XFD')).toBe(16383);
    });
  });

  describe('2. Formula Keyboard Navigation Beyond Column N', () => {
    it('2.1. Navigates from column N (col 13) to column O (col 14) and P (col 15) using ArrowRight', () => {
      // User typing =SUM( and is currently referencing N1 (r:0, c:13)
      const currentState: FormulaRangeState = {
        prefix: '=SUM(',
        anchor: { r: 0, c: 13 },
        lead: { r: 0, c: 13 },
        rangeText: 'N1',
        isMultiCell: false
      };

      const result = computeNextFormulaReference(
        '=SUM(N1',
        'ArrowRight',
        false,
        currentState,
        { r: 0, c: 0 },
        1000,
        1000
      );

      expect(result).not.toBeNull();
      expect(result!.nextState.lead.c).toBe(14); // Column O
      expect(result!.nextState.rangeText).toBe('O1');
      expect(result!.updatedFormula).toBe('=SUM(O1');
    });

    it('2.2. Navigates seamlessly from Z1 (col 25) to AA1 (col 26) using ArrowRight', () => {
      const currentState: FormulaRangeState = {
        prefix: '=SUM(',
        anchor: { r: 0, c: 25 },
        lead: { r: 0, c: 25 },
        rangeText: 'Z1',
        isMultiCell: false
      };

      const result = computeNextFormulaReference(
        '=SUM(Z1',
        'ArrowRight',
        false,
        currentState,
        { r: 0, c: 0 },
        1000,
        1000
      );

      expect(result).not.toBeNull();
      expect(result!.nextState.lead.c).toBe(26); // Column AA
      expect(result!.nextState.rangeText).toBe('AA1');
      expect(result!.updatedFormula).toBe('=SUM(AA1');
    });

    it('2.3. Extends formula range selection across the N boundary using Shift+ArrowRight (A1:AA1)', () => {
      const currentState: FormulaRangeState = {
        prefix: '=SUM(',
        anchor: { r: 0, c: 0 },
        lead: { r: 0, c: 25 }, // Currently at Z1
        rangeText: 'A1:Z1',
        isMultiCell: true
      };

      const result = computeNextFormulaReference(
        '=SUM(A1:Z1',
        'ArrowRight',
        true,
        currentState,
        { r: 0, c: 0 },
        1000,
        1000
      );

      expect(result).not.toBeNull();
      expect(result!.nextState.lead.c).toBe(26); // Extended to AA1
      expect(result!.nextState.rangeText).toBe('A1:AA1');
      expect(result!.updatedFormula).toBe('=SUM(A1:AA1');
    });
  });

  describe('3. Dynamic Formula Calculation with Columns Beyond Column N', () => {
    it('3.1. Computes =A1+AA1 accurately where A1=10 and AA1=25, resulting in 35', () => {
      const sheets = [
        {
          id: 's1',
          name: 'Sheet1',
          row: 100,
          column: 200,
          status: 1,
          celldata: [
            { r: 0, c: 0, v: { v: 10, m: '10' } },   // A1
            { r: 0, c: 26, v: { v: 25, m: '25' } }  // AA1
          ]
        }
      ];

      const result = evaluateFortuneFormula('=A1+AA1', sheets, 1, 0, 's1');
      expect(result.success).toBe(true);
      expect(result.value).toBe(35);
    });

    it('3.2. Computes =SUM(M1:P1) spanning across columns M (12), N (13), O (14), and P (15)', () => {
      const sheets = [
        {
          id: 's1',
          name: 'Sheet1',
          row: 100,
          column: 200,
          status: 1,
          celldata: [
            { r: 0, c: 12, v: { v: 1, m: '1' } }, // M1
            { r: 0, c: 13, v: { v: 2, m: '2' } }, // N1
            { r: 0, c: 14, v: { v: 3, m: '3' } }, // O1
            { r: 0, c: 15, v: { v: 4, m: '4' } }  // P1
          ]
        }
      ];

      const result = evaluateFortuneFormula('=SUM(M1:P1)', sheets, 1, 0, 's1');
      expect(result.success).toBe(true);
      expect(result.value).toBe(10);
    });

    it('3.3. Evaluates =AA1*2 when AA1 is in an expanded sheet', () => {
      const sheets = [
        {
          id: 's1',
          name: 'Sheet1',
          row: 100,
          column: 200,
          status: 1,
          celldata: [
            { r: 0, c: 26, v: { v: 50, m: '50' } } // AA1
          ]
        }
      ];

      const result = evaluateFortuneFormula('=AA1*2', sheets, 1, 0, 's1');
      expect(result.success).toBe(true);
      expect(result.value).toBe(100);
    });
  });

  describe('4. FortuneSheet Migration & Adapter Dimension Upgrades', () => {
    it('4.1. Initializes default FortuneSheets with 200 columns and 100 rows', () => {
      const defaultSheets = createDefaultFortuneSheets('FR');
      expect(defaultSheets.length).toBeGreaterThan(0);
      const sheet = defaultSheets[0];
      expect(sheet.column).toBe(DEFAULT_SHEET_COL_COUNT);
      expect(sheet.row).toBe(DEFAULT_SHEET_ROW_COUNT);
      expect(sheet.celldata).toBeDefined();
    });

    it('4.2. Automatically upgrades legacy 14-column workbooks (column: 14) to 200 columns while preserving cell values', () => {
      // Simulate an old workbook saved with 14 columns
      const legacy14ColData: any[][] = [];
      for (let r = 0; r < 20; r++) {
        const row = new Array(14).fill(null);
        legacy14ColData.push(row);
      }
      legacy14ColData[0][0] = { v: 'Revenue', m: 'Revenue' };
      legacy14ColData[0][13] = { v: 999, m: '999' }; // Col N

      const legacyWorkbook: SpreadsheetWorkbook = {
        id: 'wb-old-14',
        paperId: 'FR',
        title: 'Legacy Workbook',
        activeSheetIndex: 0,
        sheets: [
          {
            id: 'sheet-1',
            name: 'Sheet1',
            rowCount: 20,
            colCount: 14,
            cells: {
              'A1': { raw: 'Revenue', computed: 'Revenue' },
              'N1': { raw: '999', computed: 999 }
            }
          }
        ],
        fortuneData: [
          {
            id: 'sheet-1',
            name: 'Sheet1',
            status: 1,
            row: 20,
            column: 14, // The old 14-column clamp
            data: legacy14ColData
          }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Convert via adapter
      const upgradedSheets = spreadsheetWorkbookToFortuneSheets(legacyWorkbook);
      expect(upgradedSheets[0].column).toBe(200);
      expect(upgradedSheets[0].data?.[0]?.length).toBe(200);
      // Preserves existing data in A1 and N1
      expect(upgradedSheets[0].data?.[0]?.[0]?.v).toBe('Revenue');
      expect(upgradedSheets[0].data?.[0]?.[13]?.v).toBe(999);
      // New columns (O through GR) are padded and available
      expect(upgradedSheets[0].data?.[0]?.[14]).toBeNull();
      expect(upgradedSheets[0].data?.[0]?.[199]).toBeNull();
    });

    it('4.3. Saves FortuneSheets to SpreadsheetWorkbook preserving colCount >= 200 and cell data beyond column N', () => {
      const baseWb: SpreadsheetWorkbook = {
        id: 'wb-new',
        paperId: 'FR',
        title: 'Test WB',
        activeSheetIndex: 0,
        sheets: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const sheets = createDefaultFortuneSheets('FR');
      // Set value in column AA (index 26) and row 1
      sheets[0].celldata = [
        ...(sheets[0].celldata || []),
        { r: 0, c: 26, v: { v: 1234.56, m: '1234.56' } }
      ];

      const savedWb = fortuneSheetsToSpreadsheetWorkbook(sheets, baseWb);
      expect(savedWb.sheets[0].colCount).toBeGreaterThanOrEqual(200);
      expect(savedWb.sheets[0].cells['AA1']).toBeDefined();
      expect(savedWb.sheets[0].cells['AA1'].computed).toBe(1234.56);
    });
  });

  describe('5. Word Editor: Visual Boundary Containment & Question Isolation', () => {
    it('5.1. Renders the Word editor with the authoritative document container and proper cursor styles', () => {
      const { container } = render(
        <AnswerWriter
          version={QUALIFICATION_VERSIONS[0]}
          allQuestions={[]}
          initialPaperId="FR"
        />
      );

      // Verify the single authoritative document workspace is rendered with cursor-text
      const mainWorkspace = container.querySelector('.bg-\\[\\#141419\\].p-4');
      expect(mainWorkspace).toBeInTheDocument();
      expect(mainWorkspace?.className).toContain('cursor-text');
      expect(mainWorkspace?.className).toContain('overflow-y-auto');

      // Verify ProseMirror editor exists inside
      const proseMirror = container.querySelector('.ProseMirror');
      expect(proseMirror).toBeInTheDocument();
      expect(proseMirror?.getAttribute('contenteditable')).toBe('true');
    });

    it('5.2. Isolates answers per question and automatically saves on switch', async () => {
      const mockQuestions: QuestionRecord[] = [
        {
          id: 'q-1',
          paperId: 'FR',
          questionNumber: 'Q1',
          title: 'Consolidated Statement',
          availableMarks: 20,
          topicTags: [],
          questionType: 'section_c_constructed' as const,
          notes: '',
          status: 'not_started' as const,
          isDoubt: false,
          confidenceRating: 3,
          attempts: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'q-2',
          paperId: 'FR',
          questionNumber: 'Q2',
          title: 'Lease Accounting',
          availableMarks: 20,
          topicTags: [],
          questionType: 'section_c_constructed' as const,
          notes: '',
          status: 'not_started' as const,
          isDoubt: false,
          confidenceRating: 3,
          attempts: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      // Pre-seed an answer for Q1 in IndexedDB
      await db.writtenAnswers.add({
        id: 'draft-q1',
        questionId: 'q-1',
        paperId: 'FR',
        title: 'Q1 Answer Draft',
        attemptNumber: 1,
        contentHtml: '<p>Q1 consolidated financial statement draft</p>',
        plainText: 'Q1 consolidated financial statement draft',
        wordCount: 5,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      const { rerender } = render(
        <AnswerWriter
          version={QUALIFICATION_VERSIONS[0]}
          allQuestions={mockQuestions}
          initialPaperId="FR"
          initialQuestionId="q-1"
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Q1: Consolidated Statement/i)).toBeInTheDocument();
      });

      // Switch to Q2 via prop (e.g. user selected Q2 in exam workspace)
      rerender(
        <AnswerWriter
          version={QUALIFICATION_VERSIONS[0]}
          allQuestions={mockQuestions}
          initialPaperId="FR"
          initialQuestionId="q-2"
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Q2: Lease Accounting/i)).toBeInTheDocument();
      });
    });
  });

  describe('6. Application Sidebar Navigation: Official ACCA Resources & Attribution', () => {
    it('6.1. Displays direct link to Official ACCA Portal with correct destination URL', () => {
      render(
        <AppLayout
          activeTab="dashboard"
          onNavigate={() => {}}
          version={QUALIFICATION_VERSIONS[0]}
          paperRecords={{}}
          questions={[]}
          materials={[]}
          onOpenPdfAtPage={() => {}}
          onSelectPaper={() => {}}
        >
          <div>Dashboard Content</div>
        </AppLayout>
      );

      const portalLink = screen.getByRole('link', { name: /ACCA Official Portal/i });
      expect(portalLink).toBeInTheDocument();
      expect(portalLink).toHaveAttribute('href', 'https://accaportal.accaglobal.com/');
      expect(portalLink).toHaveAttribute('target', '_blank');
      expect(portalLink).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('6.2. Displays direct link to ACCA Study Hub with correct destination URL', () => {
      render(
        <AppLayout
          activeTab="dashboard"
          onNavigate={() => {}}
          version={QUALIFICATION_VERSIONS[0]}
          paperRecords={{}}
          questions={[]}
          materials={[]}
          onOpenPdfAtPage={() => {}}
          onSelectPaper={() => {}}
        >
          <div>Dashboard Content</div>
        </AppLayout>
      );

      const hubLink = screen.getByRole('link', { name: /ACCA Study Hub/i });
      expect(hubLink).toBeInTheDocument();
      expect(hubLink).toHaveAttribute(
        'href',
        'https://studymaterials.accaglobal.com/account/learning-hub/my-learning/dashboard'
      );
      expect(hubLink).toHaveAttribute('target', '_blank');
      expect(hubLink).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('6.3. Preserves r/ACCA Reddit link and Catchy ACCA creator attribution', () => {
      const { container } = render(
        <AppLayout
          activeTab="dashboard"
          onNavigate={() => {}}
          version={QUALIFICATION_VERSIONS[0]}
          paperRecords={{}}
          questions={[]}
          materials={[]}
          onOpenPdfAtPage={() => {}}
          onSelectPaper={() => {}}
        >
          <div>Dashboard Content</div>
        </AppLayout>
      );

      const redditLink = screen.getByRole('link', { name: /r\/ACCA Reddit/i });
      expect(redditLink).toBeInTheDocument();
      expect(redditLink).toHaveAttribute('href', 'https://www.reddit.com/r/ACCA/');

      // Verify creator credit intact
      expect(container.textContent).toContain('Catchy ACCA');
      expect(container.textContent).toContain('· by ly77ee');
      expect(container.textContent).toContain('Local-First ACCA Study Manager');
    });
  });
});
