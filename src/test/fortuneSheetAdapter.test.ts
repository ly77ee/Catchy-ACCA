import { describe, it, expect } from 'vitest';
import {
  createDefaultFortuneSheets,
  spreadsheetWorkbookToFortuneSheets,
  fortuneSheetsToSpreadsheetWorkbook,
  evaluateFortuneFormula,
  FortuneSheetType
} from '../utils/fortuneSheetAdapter';
import { SpreadsheetWorkbook } from '../types';

describe('FortuneSheet Adapter & Formula Engine Verification', () => {
  it('1. Calculates =SUM(A1:A2) with 10 in A1 and 20 in A2 -> 30', () => {
    const sheets: FortuneSheetType[] = [
      {
        name: 'Sheet1',
        id: 's1',
        status: 1,
        row: 10,
        column: 10,
        celldata: [
          { r: 0, c: 0, v: { v: 10, m: '10' } }, // A1
          { r: 1, c: 0, v: { v: 20, m: '20' } }, // A2
        ]
      }
    ];

    const result = evaluateFortuneFormula('=SUM(A1:A2)', sheets, 2, 0, 's1');
    expect(result.success).toBe(true);
    expect(result.value).toBe(30);
  });

  it('2. Calculates =A1+B1 after entering values in A1 and B1', () => {
    const sheets: FortuneSheetType[] = [
      {
        name: 'Sheet1',
        id: 's1',
        status: 1,
        row: 10,
        column: 10,
        celldata: [
          { r: 0, c: 0, v: { v: 45, m: '45' } }, // A1
          { r: 0, c: 1, v: { v: 55, m: '55' } }, // B1
        ]
      }
    ];

    const result = evaluateFortuneFormula('=A1+B1', sheets, 0, 2, 's1');
    expect(result.success).toBe(true);
    expect(result.value).toBe(100);
  });

  it('3. Calculates =IF(A1>100,"Pass","Fail") with 150 in A1 -> Pass', () => {
    const sheetsPass: FortuneSheetType[] = [
      {
        name: 'Sheet1',
        id: 's1',
        status: 1,
        row: 10,
        column: 10,
        celldata: [
          { r: 0, c: 0, v: { v: 150, m: '150' } }, // A1
        ]
      }
    ];

    const resultPass = evaluateFortuneFormula('=IF(A1>100,"Pass","Fail")', sheetsPass, 0, 1, 's1');
    expect(resultPass.success).toBe(true);
    expect(resultPass.value).toBe('Pass');

    // Also check Fail condition when A1 <= 100
    const sheetsFail: FortuneSheetType[] = [
      {
        name: 'Sheet1',
        id: 's1',
        status: 1,
        row: 10,
        column: 10,
        celldata: [
          { r: 0, c: 0, v: { v: 75, m: '75' } }, // A1
        ]
      }
    ];

    const resultFail = evaluateFortuneFormula('=IF(A1>100,"Pass","Fail")', sheetsFail, 0, 1, 's1');
    expect(resultFail.success).toBe(true);
    expect(resultFail.value).toBe('Fail');
  });

  it('4. Recalculates dynamically when input values change', () => {
    const makeSheetsWithA1 = (val: number): FortuneSheetType[] => [
      {
        name: 'Sheet1',
        id: 's1',
        status: 1,
        row: 10,
        column: 10,
        celldata: [
          { r: 0, c: 0, v: { v: val, m: String(val) } }, // A1
          { r: 1, c: 0, v: { v: 50, m: '50' } },         // A2
        ]
      }
    ];

    const res1 = evaluateFortuneFormula('=A1*2 + A2', makeSheetsWithA1(10), 2, 0, 's1');
    expect(res1.value).toBe(70); // 10*2 + 50 = 70

    // Value in A1 updated to 25
    const res2 = evaluateFortuneFormula('=A1*2 + A2', makeSheetsWithA1(25), 2, 0, 's1');
    expect(res2.value).toBe(100); // 25*2 + 50 = 100
  });

  it('5. Handles division by zero and invalid syntax cleanly', () => {
    const sheets: FortuneSheetType[] = [
      {
        name: 'Sheet1',
        id: 's1',
        status: 1,
        row: 10,
        column: 10,
        celldata: [
          { r: 0, c: 0, v: { v: 100, m: '100' } }, // A1
          { r: 0, c: 1, v: { v: 0, m: '0' } },     // B1
        ]
      }
    ];

    // Division by zero
    const divZero = evaluateFortuneFormula('=A1/B1', sheets, 0, 2, 's1');
    expect(divZero.value).toContain('DIV/0');

    // Invalid syntax
    const invalidSyntax = evaluateFortuneFormula('=SYNTAX++--', sheets, 0, 2, 's1');
    expect(String(invalidSyntax.value)).toMatch(/#NAME\?|#ERROR!|#VALUE!/);
  });

  it('6. Bidirectional conversion between SpreadsheetWorkbook and FortuneSheet preserves cells and formulas', () => {
    const originalWb: SpreadsheetWorkbook = {
      id: 'wb-test-convert',
      paperId: 'FR',
      title: 'FR Workings',
      activeSheetIndex: 0,
      sheets: [
        {
          id: 'sheet-c1',
          name: 'Consolidation',
          cells: {
            A1: { raw: 'Revenue', format: 'bold' },
            B1: { raw: '1000', format: 'currency' },
            A2: { raw: 'Cost of Sales' },
            B2: { raw: '600', format: 'currency' },
            A3: { raw: 'Gross Profit', format: 'bold' },
            B3: { raw: '=B1-B2', format: 'currency' }
          },
          rowCount: 30,
          colCount: 10
        }
      ],
      createdAt: '2026-10-29T00:00:00Z',
      updatedAt: '2026-10-29T00:00:00Z'
    };

    // Convert to FortuneSheet
    const fortuneSheets = spreadsheetWorkbookToFortuneSheets(originalWb);
    expect(fortuneSheets.length).toBe(1);
    expect(fortuneSheets[0].name).toBe('Consolidation');
    expect(fortuneSheets[0].celldata?.length).toBe(6);

    // Convert back to SpreadsheetWorkbook
    const reconvertedWb = fortuneSheetsToSpreadsheetWorkbook(fortuneSheets, originalWb);
    expect(reconvertedWb.sheets.length).toBe(1);
    expect(reconvertedWb.sheets[0].name).toBe('Consolidation');
    expect(reconvertedWb.sheets[0].cells['B3']?.raw).toBe('=B1-B2');
    expect(reconvertedWb.sheets[0].cells['B1']?.raw).toBe('1000');
    expect(reconvertedWb.fortuneData).toBeDefined();
  });
});
