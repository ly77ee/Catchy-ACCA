import { describe, it, expect } from 'vitest';
import {
  evaluateFormula,
  recomputeSheet,
  recomputeWorkbook,
  exportSheetToCsv,
  importCsvToSheet,
  calculateIRR,
  formatCellValue
} from '../utils/formulaEngine';
import { CellData, SpreadsheetSheet, SpreadsheetWorkbook } from '../types';

describe('Spreadsheet Formula Engine & Financial Calculations', () => {
  it('evaluates basic arithmetic and operator precedence', () => {
    const cells: Record<string, CellData> = {};

    expect(evaluateFormula('=10 + 20', cells)).toBe(30);
    expect(evaluateFormula('=10 + 20 * 2', cells)).toBe(50);
    expect(evaluateFormula('=(10 + 20) * 2', cells)).toBe(60);
    expect(evaluateFormula('=2^3', cells)).toBe(8);
    expect(evaluateFormula('=100 / 4 - 5', cells)).toBe(20);
  });

  it('evaluates cell references accurately', () => {
    const cells: Record<string, CellData> = {
      A1: { raw: '100' },
      A2: { raw: '250' },
      B1: { raw: '=A1 + A2' }
    };

    expect(evaluateFormula('=A1 + A2', cells)).toBe(350);
    expect(evaluateFormula('=B1 * 2', cells)).toBe(700);
  });

  it('evaluates SUM, AVERAGE, MIN, MAX, and COUNT functions', () => {
    const cells: Record<string, CellData> = {
      A1: { raw: '10' },
      A2: { raw: '20' },
      A3: { raw: '30' },
      A4: { raw: '40' },
    };

    expect(evaluateFormula('=SUM(A1:A4)', cells)).toBe(100);
    expect(evaluateFormula('=AVERAGE(A1:A4)', cells)).toBe(25);
    expect(evaluateFormula('=MIN(A1:A4)', cells)).toBe(10);
    expect(evaluateFormula('=MAX(A1:A4)', cells)).toBe(40);
    expect(evaluateFormula('=COUNT(A1:A4)', cells)).toBe(4);
  });

  it('calculates Net Present Value (NPV) matching official DCF test vectors', () => {
    // Discount rate = 10% (0.10)
    // Cash flows: Year 1 = 35000, Year 2 = 45000, Year 3 = 50000
    // Present Values:
    // Y1 = 35000 / 1.10 = 31818.18
    // Y2 = 45000 / 1.10^2 = 37190.08
    // Y3 = 50000 / 1.10^3 = 37565.74
    // Expected Sum = 106574.00
    const cells: Record<string, CellData> = {
      A1: { raw: '0.10' },
      B1: { raw: '35000' },
      B2: { raw: '45000' },
      B3: { raw: '50000' },
    };

    const npv = evaluateFormula('=NPV(A1, B1:B3)', cells);
    expect(npv).toBe(106574);
  });

  it('calculates Internal Rate of Return (IRR) with Newton-Raphson', () => {
    // Investment of $1000, returns of $300, $420, $680
    // Verified financial rate: ~15.93% (0.1593)
    const cashFlows = [-1000, 300, 420, 680];
    const irr = calculateIRR(cashFlows);
    expect(typeof irr).toBe('number');
    expect(irr).toBeCloseTo(0.1593, 2);
  });

  it('evaluates logical IF and ROUND functions', () => {
    const cells: Record<string, CellData> = {
      A1: { raw: '75' },
    };

    expect(evaluateFormula('=IF(A1 >= 50, 100, 0)', cells)).toBe(100);
    expect(evaluateFormula('=IF(A1 < 50, 100, 0)', cells)).toBe(0);

    expect(evaluateFormula('=ROUND(123.456, 2)', cells)).toBe(123.46);
    expect(evaluateFormula('=ROUND(123.456, 0)', cells)).toBe(123);
  });

  it('detects division by zero and returns #DIV/0!', () => {
    const cells: Record<string, CellData> = {
      A1: { raw: '100' },
      A2: { raw: '0' },
    };

    expect(evaluateFormula('=A1 / A2', cells)).toBe('#DIV/0!');
    expect(evaluateFormula('=A1 / 0', cells)).toBe('#DIV/0!');
  });

  it('detects circular references and returns #CIRCULAR!', () => {
    const cells: Record<string, CellData> = {
      A1: { raw: '=B1 + 10' },
      B1: { raw: '=A1 * 2' },
    };

    expect(evaluateFormula('=B1 + 10', cells, 'A1')).toBe('#CIRCULAR!');
  });

  it('handles unknown functions with #NAME?', () => {
    const cells: Record<string, CellData> = {};
    expect(evaluateFormula('=NONEXISTENT_FN(10)', cells)).toBe('#NAME?');
  });

  it('exports to CSV and correctly re-imports with formulas', () => {
    const sheet: SpreadsheetSheet = {
      id: 'test-sheet',
      name: 'Cash Flow',
      cells: {
        A1: { raw: 'Revenue' },
        B1: { raw: '50000' },
        A2: { raw: 'Costs' },
        B2: { raw: '30000' },
        A3: { raw: 'Profit' },
        B3: { raw: '=B1-B2' },
      },
      rowCount: 5,
      colCount: 3
    };

    const recomputed = recomputeSheet(sheet);
    expect(recomputed.cells['B3']?.computed).toBe(20000);

    const csv = exportSheetToCsv(recomputed);
    expect(csv).toContain('Revenue');
    expect(csv).toContain('50000');

    const imported = importCsvToSheet(csv, 'Reopened');
    expect(imported.name).toBe('Reopened');
    expect(imported.cells['A1']?.raw).toBe('Revenue');
    expect(imported.cells['B1']?.computed).toBe(50000);
  });

  it('formats cell values according to currency and percentage rules', () => {
    expect(formatCellValue(1250.5, 'currency')).toBe('$1,250.50');
    expect(formatCellValue(0.125, 'percent')).toBe('12.5%');
    expect(formatCellValue('#DIV/0!', 'currency')).toBe('#DIV/0!');
  });

  it('evaluates COUNTA on mixed text, number, and empty cells', () => {
    const cells: Record<string, CellData> = {
      A1: { raw: 'Revenue' },
      A2: { raw: '50000' },
      A3: { raw: '' },
      A4: { raw: 'Overhead' },
      A5: { raw: '1200' }
    };

    expect(evaluateFormula('=COUNTA(A1:A5)', cells)).toBe(4);
  });

  it('evaluates loan payment PMT, PV, and FV financial functions matching Excel sign convention', () => {
    const cells: Record<string, CellData> = {};

    // PMT: $10,000 loan at 8% annual (0.08) over 5 years
    // Official Excel: PMT(0.08, 5, 10000) = -2504.56 (cash outflow)
    const pmtLoan = evaluateFormula('=PMT(0.08, 5, 10000)', cells);
    expect(pmtLoan).toBe(-2504.56);

    // PMT: Investing -$10,000 at 8% annual over 5 years returns positive +2504.56 annuity
    const pmtInvestment = evaluateFormula('=PMT(0.08, 5, -10000)', cells);
    expect(pmtInvestment).toBe(2504.56);

    // PV: 5% discount rate, 5 periods, -100 payment per period
    // PV = ~432.95
    const pv = evaluateFormula('=PV(0.05, 5, -100)', cells);
    expect(pv).toBe(432.95);

    // FV: 5% interest rate, 5 periods, -100 payment per period
    // FV = ~552.56
    const fv = evaluateFormula('=FV(0.05, 5, -100)', cells);
    expect(fv).toBe(552.56);
  });

  it('propagates cell calculation errors through SUM, AVERAGE, and expressions', () => {
    const cells: Record<string, CellData> = {
      A1: { raw: '100' },
      A2: { raw: '=A1 / 0', computed: '#DIV/0!' },
      A3: { raw: '50' }
    };

    expect(evaluateFormula('=SUM(A1:A3)', cells)).toBe('#DIV/0!');
    expect(evaluateFormula('=AVERAGE(A1:A3)', cells)).toBe('#DIV/0!');
    expect(evaluateFormula('=A1 + A2', cells)).toBe('#DIV/0!');
  });

  it('handles absolute cell references like $A$1 and mixed references', () => {
    const cells: Record<string, CellData> = {
      A1: { raw: '200' },
      B1: { raw: '50' }
    };

    expect(evaluateFormula('=$A$1 + $B$1', cells)).toBe(250);
    expect(evaluateFormula('=A$1 * $B1', cells)).toBe(10000);
  });

  it('surfaces #NUM! for IRR failure to converge or invalid cash flows', () => {
    // All positive cash flows -> no IRR possible -> #NUM!
    expect(calculateIRR([100, 200, 300])).toBe('#NUM!');
    // Single cash flow -> #NUM!
    expect(calculateIRR([-100])).toBe('#NUM!');
  });

  it('evaluates cross-sheet references and recomputes multi-sheet workbooks', () => {
    const sheet1: SpreadsheetSheet = {
      id: 'sheet-1',
      name: 'Summary',
      cells: {
        A1: { raw: 'Total Profit' },
        B1: { raw: "=Working!B4 + 'Tax Sheet'!A1" }
      },
      rowCount: 10,
      colCount: 5
    };

    const sheet2: SpreadsheetSheet = {
      id: 'sheet-2',
      name: 'Working',
      cells: {
        B4: { raw: '45000' }
      },
      rowCount: 10,
      colCount: 5
    };

    const sheet3: SpreadsheetSheet = {
      id: 'sheet-3',
      name: 'Tax Sheet',
      cells: {
        A1: { raw: '5000' }
      },
      rowCount: 10,
      colCount: 5
    };

    const workbook: SpreadsheetWorkbook = {
      id: 'wb-1',
      paperId: 'FM',
      title: 'Financial Model',
      activeSheetIndex: 0,
      sheets: [sheet1, sheet2, sheet3],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const recomputed = recomputeWorkbook(workbook);
    expect(recomputed.sheets[0].cells['B1']?.computed).toBe(50000);
  });
});
