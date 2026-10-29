import { CellData, CellFormat, SpreadsheetSheet, SpreadsheetWorkbook } from '../types';

/**
 * Converts column index (0-based) to column letter (A, B, C ... AA, AB).
 */
export function colIndexToLetter(index: number): string {
  let letter = '';
  let temp = index;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

/**
 * Converts column letter (A, B, C ...) to 0-based column index.
 */
export function colLetterToIndex(letter: string): number {
  let sum = 0;
  const upper = letter.toUpperCase();
  for (let i = 0; i < upper.length; i++) {
    sum = sum * 26 + (upper.charCodeAt(i) - 64);
  }
  return sum - 1;
}

/**
 * Parses a cell coordinate like "B4" into { col: 1, row: 3, colLetter: 'B', rowNumber: 4 }.
 */
export function parseCellAddress(addr: string): { col: number; row: number; colLetter: string; rowNumber: number } | null {
  const match = addr.trim().toUpperCase().match(/^([A-Z]+)(\d+)$/);
  if (!match) return null;
  const colLetter = match[1];
  const rowNumber = parseInt(match[2], 10);
  return {
    col: colLetterToIndex(colLetter),
    row: rowNumber - 1, // 0-based
    colLetter,
    rowNumber
  };
}

/**
 * Expands a range like "A1:B3" or "Sheet2!A1:B3" into a list of cell coordinates:
 * ["A1", "A2", "A3", "B1", "B2", "B3"] or ["Sheet2!A1", "Sheet2!A2", ...].
 */
export function expandRange(rangeStr: string): string[] {
  let prefix = '';
  let coreRange = rangeStr.trim();

  if (coreRange.includes('!')) {
    const splitIdx = coreRange.lastIndexOf('!');
    prefix = coreRange.substring(0, splitIdx + 1);
    coreRange = coreRange.substring(splitIdx + 1).trim();
  }

  const parts = coreRange.split(':');
  if (parts.length === 1) return [prefix + parts[0].trim().toUpperCase()];
  if (parts.length !== 2) return [];

  const start = parseCellAddress(parts[0]);
  const end = parseCellAddress(parts[1]);
  if (!start || !end) return [];

  const minCol = Math.min(start.col, end.col);
  const maxCol = Math.max(start.col, end.col);
  const minRow = Math.min(start.row, end.row);
  const maxRow = Math.max(start.row, end.row);

  const cells: string[] = [];
  for (let c = minCol; c <= maxCol; c++) {
    const colLetter = colIndexToLetter(c);
    for (let r = minRow; r <= maxRow; r++) {
      cells.push(`${prefix}${colLetter}${r + 1}`);
    }
  }
  return cells;
}

/**
 * Formats a raw/computed value according to the specified CellFormat.
 */
export function formatCellValue(value: any, format?: CellFormat): string {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'string' && value.startsWith('#')) return value; // Error codes like #DIV/0!

  const num = typeof value === 'number' ? value : parseFloat(value);
  if (isNaN(num)) return String(value);

  switch (format) {
    case 'currency':
      return num.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    case 'percent':
      return `${(num * 100).toFixed(1)}%`;
    case 'number':
      return num.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    default:
      // General format: rounded to max 4 decimals if fractional
      return Number.isInteger(num) ? String(num) : Number(num.toFixed(4)).toString();
  }
}

/**
 * Evaluates an expression or formula string within the context of a sheet's cells.
 */
export function evaluateFormula(
  formula: string,
  cells: Record<string, CellData>,
  currentCellId?: string,
  callStack: Set<string> = new Set(),
  allSheets?: SpreadsheetSheet[]
): any {
  const trimmed = formula.trim();
  if (!trimmed.startsWith('=')) {
    // Plain number or text
    const num = Number(trimmed);
    return !isNaN(num) && trimmed !== '' ? num : trimmed;
  }

  // Circular reference detection
  if (currentCellId) {
    if (callStack.has(currentCellId)) {
      return '#CIRCULAR!';
    }
    callStack.add(currentCellId);
  }

  const expr = trimmed.substring(1).trim();

  try {
    const result = evaluateExpression(expr, cells, currentCellId, callStack, allSheets);
    if (currentCellId) callStack.delete(currentCellId);
    return result;
  } catch (err: any) {
    if (currentCellId) callStack.delete(currentCellId);
    if (err.message && err.message.startsWith('#')) return err.message;
    return '#ERROR!';
  }
}

/**
 * Helper to resolve raw cell text for COUNTA or presence checks.
 */
function resolveRawCell(
  addr: string,
  cells: Record<string, CellData>,
  allSheets?: SpreadsheetSheet[]
): string | undefined {
  let targetCells = cells;
  let cleanAddr = addr.trim().replace(/\$/g, '');

  if (cleanAddr.includes('!')) {
    const splitIdx = cleanAddr.lastIndexOf('!');
    const sheetName = cleanAddr.substring(0, splitIdx).replace(/^['"]|['"]$/g, '');
    cleanAddr = cleanAddr.substring(splitIdx + 1);

    if (allSheets && allSheets.length > 0) {
      const foundSheet = allSheets.find(
        s => s.name.toLowerCase() === sheetName.toLowerCase() || s.id.toLowerCase() === sheetName.toLowerCase()
      );
      if (foundSheet) {
        targetCells = foundSheet.cells;
      } else {
        return undefined;
      }
    } else {
      return undefined;
    }
  }

  const cell = targetCells[cleanAddr.toUpperCase()];
  return cell ? cell.raw : undefined;
}

/**
 * Parses and evaluates an expression supporting functions, operations, ranges, and cell references.
 */
function evaluateExpression(
  expr: string,
  cells: Record<string, CellData>,
  currentCellId?: string,
  callStack: Set<string> = new Set(),
  allSheets?: SpreadsheetSheet[]
): any {
  // Check for functions: FUNCTION_NAME(...)
  const fnMatch = expr.match(/^([A-Za-z_][A-Za-z0-9_\.]*)\((.*)\)$/s);
  if (fnMatch) {
    const fnName = fnMatch[1].toUpperCase();
    const argsRaw = splitArguments(fnMatch[2]);
    return executeFunction(fnName, argsRaw, cells, currentCellId, callStack, allSheets);
  }

  // Handle arithmetic and logic expression using a clean recursive descent tokenizer
  return parseArithmetic(expr, cells, currentCellId, callStack, allSheets);
}

/**
 * Splits function arguments respecting nested parentheses.
 */
function splitArguments(argString: string): string[] {
  const args: string[] = [];
  let depth = 0;
  let current = '';

  for (let i = 0; i < argString.length; i++) {
    const char = argString[i];
    if (char === '(') depth++;
    else if (char === ')') depth--;

    if (char === ',' && depth === 0) {
      args.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim().length > 0) {
    args.push(current.trim());
  }
  return args;
}

/**
 * Executes a recognized spreadsheet financial/mathematical function.
 */
function executeFunction(
  fnName: string,
  args: string[],
  cells: Record<string, CellData>,
  currentCellId?: string,
  callStack: Set<string> = new Set(),
  allSheets?: SpreadsheetSheet[]
): any {
  // Resolve numeric list from arguments (expanding ranges)
  const getValues = (): number[] => {
    const vals: number[] = [];
    for (const arg of args) {
      if (arg.includes(':')) {
        const rangeCells = expandRange(arg);
        for (const addr of rangeCells) {
          const val = resolveCellValue(addr, cells, currentCellId, callStack, allSheets);
          if (typeof val === 'number' && !isNaN(val)) vals.push(val);
        }
      } else {
        const val = evaluateExpression(arg, cells, currentCellId, callStack, allSheets);
        if (typeof val === 'number' && !isNaN(val)) vals.push(val);
      }
    }
    return vals;
  };

  switch (fnName) {
    case 'SUM': {
      const vals = getValues();
      return vals.reduce((a, b) => a + b, 0);
    }

    case 'AVERAGE': {
      const vals = getValues();
      if (vals.length === 0) return '#DIV/0!';
      return vals.reduce((a, b) => a + b, 0) / vals.length;
    }

    case 'COUNT': {
      const vals = getValues();
      return vals.length;
    }

    case 'COUNTA': {
      let count = 0;
      for (const arg of args) {
        if (arg.includes(':')) {
          const rangeCells = expandRange(arg);
          for (const addr of rangeCells) {
            const rawVal = resolveRawCell(addr, cells, allSheets);
            if (rawVal !== undefined && rawVal !== null && rawVal.trim() !== '') {
              count++;
            }
          }
        } else {
          const val = evaluateExpression(arg, cells, currentCellId, callStack, allSheets);
          if (val !== null && val !== undefined && val !== '' && val !== '#ERROR!') {
            count++;
          }
        }
      }
      return count;
    }

    case 'MIN': {
      const vals = getValues();
      return vals.length === 0 ? 0 : Math.min(...vals);
    }

    case 'MAX': {
      const vals = getValues();
      return vals.length === 0 ? 0 : Math.max(...vals);
    }

    case 'ABS': {
      if (args.length !== 1) return '#VALUE!';
      const val = evaluateExpression(args[0], cells, currentCellId, callStack, allSheets);
      if (typeof val !== 'number') return '#VALUE!';
      return Math.abs(val);
    }

    case 'ROUND': {
      if (args.length < 1 || args.length > 2) return '#VALUE!';
      const num = evaluateExpression(args[0], cells, currentCellId, callStack, allSheets);
      const decimals = args[1] ? evaluateExpression(args[1], cells, currentCellId, callStack, allSheets) : 0;
      if (typeof num !== 'number' || typeof decimals !== 'number') return '#VALUE!';
      const factor = Math.pow(10, decimals);
      return Math.round(num * factor) / factor;
    }

    case 'IF': {
      if (args.length < 2 || args.length > 3) return '#VALUE!';
      const condition = evaluateExpression(args[0], cells, currentCellId, callStack, allSheets);
      const isTrue = condition === true || (typeof condition === 'number' && condition !== 0);
      if (isTrue) {
        return evaluateExpression(args[1], cells, currentCellId, callStack, allSheets);
      } else {
        return args[2] ? evaluateExpression(args[2], cells, currentCellId, callStack, allSheets) : 0;
      }
    }

    case 'NPV': {
      // Syntax: NPV(discount_rate, val1, val2...) or NPV(rate, range)
      // ACCA Formula: Sum of CF_t / (1 + r)^t
      if (args.length < 2) return '#VALUE!';
      const rate = evaluateExpression(args[0], cells, currentCellId, callStack, allSheets);
      if (typeof rate !== 'number' || rate <= -1) return '#VALUE!';

      const cashFlowArgs = args.slice(1);
      const cashFlows: number[] = [];
      for (const cfArg of cashFlowArgs) {
        if (cfArg.includes(':')) {
          const addrs = expandRange(cfArg);
          for (const addr of addrs) {
            const v = resolveCellValue(addr, cells, currentCellId, callStack, allSheets);
            if (typeof v === 'number') cashFlows.push(v);
          }
        } else {
          const v = evaluateExpression(cfArg, cells, currentCellId, callStack, allSheets);
          if (typeof v === 'number') cashFlows.push(v);
        }
      }

      let npv = 0;
      for (let t = 0; t < cashFlows.length; t++) {
        npv += cashFlows[t] / Math.pow(1 + rate, t + 1);
      }
      return Math.round(npv * 100) / 100;
    }

    case 'IRR': {
      // Syntax: IRR(range, [guess])
      if (args.length < 1) return '#VALUE!';
      const cashFlows: number[] = [];
      if (args[0].includes(':')) {
        const addrs = expandRange(args[0]);
        for (const addr of addrs) {
          const v = resolveCellValue(addr, cells, currentCellId, callStack, allSheets);
          if (typeof v === 'number') cashFlows.push(v);
        }
      } else {
        return '#VALUE!';
      }

      const guess = args[1] ? evaluateExpression(args[1], cells, currentCellId, callStack, allSheets) : 0.1;
      return calculateIRR(cashFlows, typeof guess === 'number' ? guess : 0.1);
    }

    case 'PMT': {
      // Syntax: PMT(rate, nper, pv)
      if (args.length < 3) return '#VALUE!';
      const rate = evaluateExpression(args[0], cells, currentCellId, callStack, allSheets);
      const nper = evaluateExpression(args[1], cells, currentCellId, callStack, allSheets);
      const pv = evaluateExpression(args[2], cells, currentCellId, callStack, allSheets);

      if (typeof rate !== 'number' || typeof nper !== 'number' || typeof pv !== 'number') return '#VALUE!';
      if (rate === 0) return -pv / nper;

      const pmt = (pv * rate * Math.pow(1 + rate, nper)) / (Math.pow(1 + rate, nper) - 1);
      return Math.round(pmt * 100) / 100;
    }

    case 'PV': {
      // Syntax: PV(rate, nper, pmt, [fv], [type])
      if (args.length < 3) return '#VALUE!';
      const rate = evaluateExpression(args[0], cells, currentCellId, callStack, allSheets);
      const nper = evaluateExpression(args[1], cells, currentCellId, callStack, allSheets);
      const pmt = evaluateExpression(args[2], cells, currentCellId, callStack, allSheets);
      const fv = args[3] ? evaluateExpression(args[3], cells, currentCellId, callStack, allSheets) : 0;
      const type = args[4] ? evaluateExpression(args[4], cells, currentCellId, callStack, allSheets) : 0;

      if (typeof rate !== 'number' || typeof nper !== 'number' || typeof pmt !== 'number' || typeof fv !== 'number') {
        return '#VALUE!';
      }

      let pv = 0;
      if (rate === 0) {
        pv = -(fv + pmt * nper);
      } else {
        const factor = Math.pow(1 + rate, nper);
        pv = -(pmt * (1 + rate * (type ? 1 : 0)) * ((factor - 1) / rate) + fv) / factor;
      }
      return Math.round(pv * 100) / 100;
    }

    case 'FV': {
      // Syntax: FV(rate, nper, pmt, [pv], [type])
      if (args.length < 3) return '#VALUE!';
      const rate = evaluateExpression(args[0], cells, currentCellId, callStack, allSheets);
      const nper = evaluateExpression(args[1], cells, currentCellId, callStack, allSheets);
      const pmt = evaluateExpression(args[2], cells, currentCellId, callStack, allSheets);
      const pv = args[3] ? evaluateExpression(args[3], cells, currentCellId, callStack, allSheets) : 0;
      const type = args[4] ? evaluateExpression(args[4], cells, currentCellId, callStack, allSheets) : 0;

      if (typeof rate !== 'number' || typeof nper !== 'number' || typeof pmt !== 'number' || typeof pv !== 'number') {
        return '#VALUE!';
      }

      let fv = 0;
      if (rate === 0) {
        fv = -(pv + pmt * nper);
      } else {
        const factor = Math.pow(1 + rate, nper);
        fv = -(pv * factor + pmt * (1 + rate * (type ? 1 : 0)) * ((factor - 1) / rate));
      }
      return Math.round(fv * 100) / 100;
    }

    default:
      return '#NAME?';
  }
}

/**
 * Calculates Internal Rate of Return (IRR) using the Newton-Raphson approximation.
 */
export function calculateIRR(cashFlows: number[], guess: number = 0.1): number | string {
  if (cashFlows.length < 2) return '#NUM!';
  const hasPositive = cashFlows.some(cf => cf > 0);
  const hasNegative = cashFlows.some(cf => cf < 0);
  if (!hasPositive || !hasNegative) return '#NUM!';

  let rate = guess;
  const maxIterations = 100;
  const precision = 1e-7;

  for (let i = 0; i < maxIterations; i++) {
    let npv = 0;
    let dNpv = 0;

    for (let t = 0; t < cashFlows.length; t++) {
      const factor = Math.pow(1 + rate, t);
      npv += cashFlows[t] / factor;
      if (t > 0) {
        dNpv -= (t * cashFlows[t]) / Math.pow(1 + rate, t + 1);
      }
    }

    if (Math.abs(npv) < precision) {
      return Math.round(rate * 10000) / 10000;
    }

    if (Math.abs(dNpv) < 1e-12) return '#NUM!';
    const newRate = rate - npv / dNpv;
    if (isNaN(newRate) || !isFinite(newRate)) return '#NUM!';
    if (Math.abs(newRate - rate) < precision) {
      return Math.round(newRate * 10000) / 10000;
    }
    rate = newRate;
  }

  return Math.round(rate * 10000) / 10000;
}

/**
 * Evaluates standard arithmetic expressions with cell reference substitution.
 */
function parseArithmetic(
  expr: string,
  cells: Record<string, CellData>,
  currentCellId?: string,
  callStack: Set<string> = new Set(),
  allSheets?: SpreadsheetSheet[]
): any {
  // Replace cell references (like A1, Sheet2!B12, 'Sheet 1'!A1, $A$1) with their evaluated numeric or string values
  const substituted = expr.replace(/(?:(?:'([^']+)'|([A-Za-z0-9_]+))!\$?([A-Z]+)\$?([0-9]+)|\$?([A-Z]+)\$?([0-9]+))/gi, (match) => {
    const val = resolveCellValue(match, cells, currentCellId, callStack, allSheets);
    if (typeof val === 'string' && val.startsWith('#')) {
      throw new Error(val);
    }
    return typeof val === 'number' ? String(val) : JSON.stringify(val ?? 0);
  });

  // Evaluate simple arithmetic expression safely
  return safeMathEval(substituted);
}

/**
 * Safe deterministic parser for arithmetic (+, -, *, /, ^, parentheses, comparisons).
 */
function safeMathEval(expr: string): any {
  const clean = expr.trim();
  if (/^[0-9]+(?:\.[0-9]+)?$/.test(clean)) {
    return Number(clean);
  }

  // Handle comparison operators (>, <, >=, <=, =, <>)
  const compMatch = clean.match(/^(.*?)(>=|<=|<>|>|<|=)(.*)$/);
  if (compMatch) {
    const left = safeMathEval(compMatch[1]);
    const op = compMatch[2];
    const right = safeMathEval(compMatch[3]);
    if (op === '=') return left == right;
    if (op === '<>') return left != right;
    if (op === '>') return left > right;
    if (op === '<') return left < right;
    if (op === '>=') return left >= right;
    if (op === '<=') return left <= right;
  }

  // Tokenize arithmetic
  const tokens = tokenizeMath(clean);
  if (!tokens || tokens.length === 0) return 0;
  return evaluateTokens(tokens);
}

function tokenizeMath(expr: string): string[] | null {
  const regex = /\s*([0-9]+(?:\.[0-9]+)?|[A-Za-z_]+|[+\-*/^()]|"[^"]*")\s*/g;
  const tokens: string[] = [];
  let match: RegExpExecArray | null;
  let lastIndex = 0;

  while ((match = regex.exec(expr)) !== null) {
    if (match.index !== lastIndex) return null; // unparseable character
    tokens.push(match[1]);
    lastIndex = regex.lastIndex;
  }
  return lastIndex === expr.length ? tokens : null;
}

function evaluateTokens(tokens: string[]): number {
  let pos = 0;

  function parseExpression(): number {
    let result = parseTerm();
    while (pos < tokens.length && (tokens[pos] === '+' || tokens[pos] === '-')) {
      const op = tokens[pos++];
      const nextTerm = parseTerm();
      if (op === '+') result += nextTerm;
      else result -= nextTerm;
    }
    return result;
  }

  function parseTerm(): number {
    let result = parseFactor();
    while (pos < tokens.length && (tokens[pos] === '*' || tokens[pos] === '/' || tokens[pos] === '^')) {
      const op = tokens[pos++];
      const nextFactor = parseFactor();
      if (op === '*') result *= nextFactor;
      else if (op === '/') {
        if (nextFactor === 0) throw new Error('#DIV/0!');
        result /= nextFactor;
      } else if (op === '^') {
        result = Math.pow(result, nextFactor);
      }
    }
    return result;
  }

  function parseFactor(): number {
    if (pos >= tokens.length) return 0;
    const token = tokens[pos++];

    if (token === '-') {
      return -parseFactor();
    }
    if (token === '+') {
      return parseFactor();
    }
    if (token === '(') {
      const result = parseExpression();
      if (pos < tokens.length && tokens[pos] === ')') {
        pos++;
      }
      return result;
    }

    const num = Number(token);
    if (!isNaN(num)) return num;

    throw new Error('#VALUE!');
  }

  return parseExpression();
}

/**
 * Resolves the computed value of a cell address, supporting cross-sheet references (e.g. Sheet2!A1).
 */
export function resolveCellValue(
  addr: string,
  cells: Record<string, CellData>,
  currentCellId?: string,
  callStack: Set<string> = new Set(),
  allSheets?: SpreadsheetSheet[]
): any {
  let targetCells = cells;
  let cleanAddr = addr.trim().replace(/\$/g, '');

  if (cleanAddr.includes('!')) {
    const splitIdx = cleanAddr.lastIndexOf('!');
    const sheetName = cleanAddr.substring(0, splitIdx).replace(/^['"]|['"]$/g, '');
    cleanAddr = cleanAddr.substring(splitIdx + 1);

    if (allSheets && allSheets.length > 0) {
      const foundSheet = allSheets.find(
        s => s.name.toLowerCase() === sheetName.toLowerCase() || s.id.toLowerCase() === sheetName.toLowerCase()
      );
      if (foundSheet) {
        targetCells = foundSheet.cells;
      } else {
        return '#REF!';
      }
    } else {
      return '#REF!';
    }
  }

  const key = cleanAddr.toUpperCase();
  const cell = targetCells[key];
  if (!cell) return 0;

  if (cell.raw && cell.raw.startsWith('=')) {
    return evaluateFormula(cell.raw, targetCells, key, callStack, allSheets);
  }

  const num = Number(cell.raw);
  return !isNaN(num) && cell.raw.trim() !== '' ? num : cell.raw;
}

/**
 * Recomputes all cells in a sheet, populating cell.computed.
 */
export function recomputeSheet(sheet: SpreadsheetSheet, allSheets?: SpreadsheetSheet[]): SpreadsheetSheet {
  const updatedCells: Record<string, CellData> = {};

  for (const [addr, cell] of Object.entries(sheet.cells)) {
    if (!cell) continue;
    if (cell.raw.startsWith('=')) {
      const computed = evaluateFormula(cell.raw, sheet.cells, addr, new Set(), allSheets);
      updatedCells[addr] = { ...cell, computed };
    } else {
      const num = Number(cell.raw);
      const computed = !isNaN(num) && cell.raw.trim() !== '' ? num : cell.raw;
      updatedCells[addr] = { ...cell, computed };
    }
  }

  return {
    ...sheet,
    cells: updatedCells
  };
}

/**
 * Recomputes all sheets across a workbook preserving cross-sheet formulas.
 */
export function recomputeWorkbook(workbook: SpreadsheetWorkbook): SpreadsheetWorkbook {
  const updatedSheets = workbook.sheets.map(sheet => recomputeSheet(sheet, workbook.sheets));
  return {
    ...workbook,
    sheets: updatedSheets,
    updatedAt: new Date().toISOString()
  };
}

/**
 * Converts a sheet into CSV format.
 */
export function exportSheetToCsv(sheet: SpreadsheetSheet): string {
  const maxRow = Math.max(10, sheet.rowCount);
  const maxCol = Math.max(8, sheet.colCount);

  const rows: string[] = [];
  for (let r = 1; r <= maxRow; r++) {
    const rowVals: string[] = [];
    for (let c = 0; c < maxCol; c++) {
      const addr = `${colIndexToLetter(c)}${r}`;
      const cell = sheet.cells[addr];
      const val = cell ? (cell.computed !== undefined ? String(cell.computed) : cell.raw) : '';
      // Escape CSV double quotes
      rowVals.push(`"${val.replace(/"/g, '""')}"`);
    }
    rows.push(rowVals.join(','));
  }
  return rows.join('\n');
}

/**
 * Parses a CSV string and loads it into a new sheet.
 */
export function importCsvToSheet(csvContent: string, sheetName: string = 'Imported Sheet'): SpreadsheetSheet {
  const lines = csvContent.split(/\r?\n/).filter(line => line.trim().length > 0);
  const cells: Record<string, CellData> = {};

  let maxCol = 8;
  const rowCount = Math.max(20, lines.length);

  lines.forEach((line, rIdx) => {
    // Simple CSV parser supporting quotes
    const regex = /(?:^|,)(?:"([^"]*(?:""[^"]*)*)"|([^",]*))/g;
    let match: RegExpExecArray | null;
    let cIdx = 0;

    while ((match = regex.exec(line)) !== null) {
      const rawVal = match[1] !== undefined ? match[1].replace(/""/g, '"') : match[2] || '';
      if (rawVal.trim().length > 0) {
        const addr = `${colIndexToLetter(cIdx)}${rIdx + 1}`;
        cells[addr] = {
          raw: rawVal,
          computed: rawVal.startsWith('=') ? undefined : isNaN(Number(rawVal)) ? rawVal : Number(rawVal)
        };
      }
      cIdx++;
      if (cIdx > maxCol) maxCol = cIdx;
    }
  });

  const sheet: SpreadsheetSheet = {
    id: 'sheet-' + Date.now(),
    name: sheetName,
    cells,
    rowCount,
    colCount: maxCol
  };

  return recomputeSheet(sheet);
}
