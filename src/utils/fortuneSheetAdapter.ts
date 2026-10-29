import { SpreadsheetWorkbook, SpreadsheetSheet, CellData, CellFormat } from '../types';
import { colIndexToLetter, colLetterToIndex, parseCellAddress } from './formulaEngine';
import { defaultContext, execfunction } from '@fortune-sheet/core';

export interface FortuneCell {
  v?: any;
  m?: string;
  f?: string;
  ct?: { fa?: string; t?: string };
  bl?: number; // bold
  it?: number; // italic
  bg?: string; // background color
  fc?: string; // font color
  [key: string]: any;
}

export interface FortuneSheetType {
  name: string;
  id: string;
  status?: number;
  order?: number;
  row?: number;
  column?: number;
  celldata?: Array<{ r: number; c: number; v: FortuneCell | null }>;
  data?: Array<Array<FortuneCell | null>>;
  config?: any;
  [key: string]: any;
}

/**
 * Creates default ACCA CBE financial template sheets
 */
export function createDefaultFortuneSheets(paperId: string = 'FR', title?: string): FortuneSheetType[] {
  return [
    {
      name: 'Workings 1',
      id: 'sheet-1',
      status: 1,
      order: 0,
      row: 35,
      column: 14,
      celldata: [
        {
          r: 0,
          c: 0,
          v: {
            v: `ACCA CBE Financial Workings Schedule — ${paperId}${title ? ` (${title})` : ''}`,
            m: `ACCA CBE Financial Workings Schedule — ${paperId}${title ? ` (${title})` : ''}`,
            bl: 1,
            ct: { fa: 'General', t: 'g' }
          }
        },
        { r: 2, c: 0, v: { v: 'Line Item', m: 'Line Item', bl: 1 } },
        { r: 2, c: 1, v: { v: 'Amount ($)', m: 'Amount ($)', bl: 1 } },
        { r: 3, c: 0, v: { v: 'Consideration Transferred', m: 'Consideration Transferred' } },
        { r: 3, c: 1, v: { v: 120000, m: '120,000.00', ct: { fa: '$#,##0.00', t: 'n' } } },
        { r: 4, c: 0, v: { v: 'Fair Value of Non-Controlling Interest (NCI)', m: 'Fair Value of Non-Controlling Interest (NCI)' } },
        { r: 4, c: 1, v: { v: 30000, m: '30,000.00', ct: { fa: '$#,##0.00', t: 'n' } } },
        { r: 5, c: 0, v: { v: 'Total Aggregate Value', m: 'Total Aggregate Value', bl: 1 } },
        { r: 5, c: 1, v: { f: '=SUM(B4:B5)', v: 150000, m: '150,000.00', bl: 1, ct: { fa: '$#,##0.00', t: 'n' } } },
        { r: 6, c: 0, v: { v: 'Net Identifiable Assets Acquired', m: 'Net Identifiable Assets Acquired' } },
        { r: 6, c: 1, v: { v: 110000, m: '110,000.00', ct: { fa: '$#,##0.00', t: 'n' } } },
        { r: 7, c: 0, v: { v: 'Goodwill on Acquisition', m: 'Goodwill on Acquisition', bl: 1 } },
        { r: 7, c: 1, v: { f: '=B6-B7', v: 40000, m: '40,000.00', bl: 1, ct: { fa: '$#,##0.00', t: 'n' } } },
        { r: 9, c: 0, v: { v: 'Status Check', m: 'Status Check' } },
        { r: 9, c: 1, v: { f: '=IF(B8>0,"Positive Goodwill","Bargain Purchase")', v: 'Positive Goodwill', m: 'Positive Goodwill' } },
      ]
    },
    {
      name: 'Notes & Assumptions',
      id: 'sheet-2',
      status: 0,
      order: 1,
      row: 35,
      column: 14,
      celldata: [
        { r: 0, c: 0, v: { v: 'Accounting Notes & Basis of Preparation', m: 'Accounting Notes & Basis of Preparation', bl: 1 } },
        { r: 2, c: 0, v: { v: 'Standard', m: 'Standard', bl: 1 } },
        { r: 2, c: 1, v: { v: 'Application Notes', m: 'Application Notes', bl: 1 } },
        { r: 3, c: 0, v: { v: 'IFRS 3 Business Combinations', m: 'IFRS 3 Business Combinations' } },
        { r: 3, c: 1, v: { v: 'NCI measured at proportionate share of net assets or fair value at acquisition date.', m: 'NCI measured at proportionate share of net assets or fair value at acquisition date.' } }
      ]
    }
  ];
}

/**
 * Converts a standard SpreadsheetWorkbook into FortuneSheet sheets
 */
export function spreadsheetWorkbookToFortuneSheets(wb: SpreadsheetWorkbook): FortuneSheetType[] {
  if (wb.fortuneData && Array.isArray(wb.fortuneData) && wb.fortuneData.length > 0) {
    return wb.fortuneData;
  }

  if (!wb.sheets || wb.sheets.length === 0) {
    return createDefaultFortuneSheets(wb.paperId, wb.title);
  }

  return wb.sheets.map((sheet, idx) => {
    const celldata: Array<{ r: number; c: number; v: FortuneCell | null }> = [];

    Object.entries(sheet.cells || {}).forEach(([addr, cell]) => {
      try {
        const parsed = parseCellAddress(addr);
        if (!parsed) return;
        const r = parsed.row; // 0-based row
        const c = parsed.col; // 0-based col
        const isFormula = typeof cell.raw === 'string' && cell.raw.startsWith('=');
        const numVal = Number(cell.raw);
        const val = isFormula
          ? (cell.computed !== undefined ? cell.computed : null)
          : (!isNaN(numVal) && cell.raw.trim() !== '' ? numVal : cell.raw);

        const formatType = cell.format;
        const ct = formatType === 'currency'
          ? { fa: '$#,##0.00', t: 'n' }
          : formatType === 'percent'
          ? { fa: '0.00%', t: 'n' }
          : formatType === 'number'
          ? { fa: '#,##0.00', t: 'n' }
          : { fa: 'General', t: typeof val === 'number' ? 'n' : 'g' };

        celldata.push({
          r,
          c,
          v: {
            v: val,
            m: cell.computed !== undefined ? String(cell.computed) : cell.raw,
            f: isFormula ? cell.raw : undefined,
            bl: formatType === 'bold' || formatType === 'header' ? 1 : 0,
            ct
          }
        });
      } catch {
        // Skip invalid addresses
      }
    });

    return {
      name: sheet.name || `Sheet ${idx + 1}`,
      id: sheet.id || `sheet-${idx + 1}`,
      status: idx === (wb.activeSheetIndex || 0) ? 1 : 0,
      order: idx,
      row: Math.max(sheet.rowCount || 35, 35),
      column: Math.max(sheet.colCount || 14, 14),
      celldata
    };
  });
}

/**
 * Converts FortuneSheet sheets back into a persisted SpreadsheetWorkbook
 */
export function fortuneSheetsToSpreadsheetWorkbook(
  fortuneSheets: FortuneSheetType[],
  currentWb: SpreadsheetWorkbook
): SpreadsheetWorkbook {
  const convertedSheets: SpreadsheetSheet[] = fortuneSheets.map((fs, idx) => {
    const cells: Record<string, CellData> = {};

    // 1. Process 2D data matrix if present
    if (Array.isArray(fs.data) && fs.data.length > 0) {
      for (let r = 0; r < fs.data.length; r++) {
        const row = fs.data[r];
        if (!Array.isArray(row)) continue;
        for (let c = 0; c < row.length; c++) {
          const cell = row[c];
          if (!cell) continue;

          const hasFormula = Boolean(cell.f && String(cell.f).trim().length > 0);
          const hasVal = cell.v !== null && cell.v !== undefined && String(cell.v).trim().length > 0;

          if (hasFormula || hasVal) {
            const addr = `${colIndexToLetter(c)}${r + 1}`;
            const raw = hasFormula ? String(cell.f) : String(cell.v);
            const computed = cell.v;
            let format: CellFormat = 'general';
            if (cell.ct?.fa?.includes('$')) format = 'currency';
            else if (cell.ct?.fa?.includes('%')) format = 'percent';
            else if (cell.bl) format = 'bold';

            cells[addr] = { raw, computed, format };
          }
        }
      }
    }

    // 2. Process celldata sparse list if present (and merge/overwrite)
    if (Array.isArray(fs.celldata)) {
      for (const item of fs.celldata) {
        if (!item || item.v === null || item.v === undefined) continue;
        const r = item.r;
        const c = item.c;
        const cell = item.v;

        const hasFormula = Boolean(cell.f && String(cell.f).trim().length > 0);
        const hasVal = cell.v !== null && cell.v !== undefined && String(cell.v).trim().length > 0;

        if (hasFormula || hasVal) {
          const addr = `${colIndexToLetter(c)}${r + 1}`;
          const raw = hasFormula ? String(cell.f) : String(cell.v);
          const computed = cell.v;
          let format: CellFormat = 'general';
          if (cell.ct?.fa?.includes('$')) format = 'currency';
          else if (cell.ct?.fa?.includes('%')) format = 'percent';
          else if (cell.bl) format = 'bold';

          cells[addr] = { raw, computed, format };
        }
      }
    }

    return {
      id: fs.id || `sheet-${idx + 1}`,
      name: fs.name || `Sheet ${idx + 1}`,
      cells,
      rowCount: fs.row || (fs.data ? fs.data.length : 35),
      colCount: fs.column || (fs.data && fs.data[0] ? fs.data[0].length : 14)
    };
  });

  const activeIndex = fortuneSheets.findIndex(s => s.status === 1);

  return {
    ...currentWb,
    activeSheetIndex: activeIndex >= 0 ? activeIndex : 0,
    sheets: convertedSheets,
    fortuneData: fortuneSheets,
    updatedAt: new Date().toISOString()
  };
}

/**
 * Calculates a formula using FortuneSheet's core calculation engine
 */
export function evaluateFortuneFormula(
  formula: string,
  sheets: FortuneSheetType[] = createDefaultFortuneSheets('FR'),
  targetRow: number = 0,
  targetCol: number = 0,
  targetSheetId?: string
): { success: boolean; value: any; rawFormula: string } {
  try {
    const ctx = (defaultContext as any)({
      globalCache: {},
      cellInput: { current: null },
      fxInput: { current: null },
      canvas: { current: null },
      cellArea: { current: null },
      workbookContainer: { current: null }
    });
    // Prepare sheets in context
    ctx.luckysheetfile = sheets.map(s => {
      const rowCount = s.row || 35;
      const colCount = s.column || 14;
      const data: Array<Array<FortuneCell | null>> = s.data || Array.from({ length: rowCount }, () =>
        Array.from({ length: colCount }, () => null)
      );

      if (s.celldata) {
        for (const item of s.celldata) {
          if (data[item.r] && data[item.r][item.c] !== undefined) {
            data[item.r][item.c] = item.v;
          }
        }
      }

      return {
        ...s,
        data,
        status: s.status || 1
      };
    });

    const sheetId = targetSheetId || sheets[0]?.id || 'sheet-1';
    const result = execfunction(ctx, formula, targetRow, targetCol, sheetId);

    if (Array.isArray(result)) {
      return {
        success: Boolean(result[0]),
        value: result[1],
        rawFormula: result[2] || formula
      };
    }

    return {
      success: true,
      value: result,
      rawFormula: formula
    };
  } catch (err: any) {
    return {
      success: false,
      value: '#ERROR!',
      rawFormula: formula
    };
  }
}
