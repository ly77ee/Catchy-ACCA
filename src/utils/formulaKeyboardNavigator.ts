import { colIndexToLetter, colLetterToIndex, parseCellAddress } from './formulaEngine';

export interface ActiveCellRef {
  r: number;
  c: number;
}

export interface FormulaRangeState {
  prefix: string;
  anchor: ActiveCellRef;
  lead: ActiveCellRef;
  rangeText: string;
  isMultiCell: boolean;
}

// Operators that precede a new cell reference in Excel
const REGEX_TRAILING_OP = /^(.*(?:=|\(|\+|-|\*|\/|\^|&|,|>|<|:)\s*)$/;

// Existing trailing cell reference or range reference (e.g. "=SUM(A1" or "=SUM(A1:A5" or "=A1+B2")
const REGEX_TRAILING_REF = /^(.*(?:=|\(|\+|-|\*|\/|\^|&|,|>|<)\s*)([A-Za-z]+[0-9]+(?::[A-Za-z]+[0-9]+)?)$/;

/**
 * Parses formula text to see if the cursor is in a cell-referencing position.
 */
export function parseFormulaReferenceState(
  formulaText: string,
  originCell: ActiveCellRef = { r: 0, c: 0 }
): { canReference: boolean; prefix: string; existingRef?: string } {
  if (!formulaText || !formulaText.trim().startsWith('=')) {
    return { canReference: false, prefix: '' };
  }

  const cleanText = formulaText.trimEnd();

  // 1. Check if formula ends with an existing cell or range reference
  const refMatch = cleanText.match(REGEX_TRAILING_REF);
  if (refMatch) {
    return {
      canReference: true,
      prefix: refMatch[1],
      existingRef: refMatch[2].toUpperCase()
    };
  }

  // 2. Check if formula ends with an operator or opening bracket
  const opMatch = cleanText.match(REGEX_TRAILING_OP);
  if (opMatch) {
    return {
      canReference: true,
      prefix: opMatch[1]
    };
  }

  return { canReference: false, prefix: '' };
}

/**
 * Converts a cell coordinate or range to Excel string notation (e.g. "A1" or "A1:A5")
 */
export function formatRangeText(anchor: ActiveCellRef, lead: ActiveCellRef): { text: string; isMulti: boolean } {
  const rMin = Math.min(anchor.r, lead.r);
  const rMax = Math.max(anchor.r, lead.r);
  const cMin = Math.min(anchor.c, lead.c);
  const cMax = Math.max(anchor.c, lead.c);

  const startCol = colIndexToLetter(cMin);
  const startRow = rMin + 1;

  if (rMin === rMax && cMin === cMax) {
    return {
      text: `${startCol}${startRow}`,
      isMulti: false
    };
  }

  const endCol = colIndexToLetter(cMax);
  const endRow = rMax + 1;

  return {
    text: `${startCol}${startRow}:${endCol}${endRow}`,
    isMulti: true
  };
}

/**
 * Computes the next reference state when an arrow key is pressed during formula editing.
 */
export function computeNextFormulaReference(
  currentFormula: string,
  key: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight',
  shiftKey: boolean,
  currentRangeState: FormulaRangeState | null,
  editingCell: ActiveCellRef,
  maxRows: number = 1000,
  maxCols: number = 1000
): { updatedFormula: string; nextState: FormulaRangeState } | null {
  const parsed = parseFormulaReferenceState(currentFormula, editingCell);
  if (!parsed.canReference) return null;

  // Determine direction offset
  let dr = 0;
  let dc = 0;
  if (key === 'ArrowUp') dr = -1;
  else if (key === 'ArrowDown') dr = 1;
  else if (key === 'ArrowLeft') dc = -1;
  else if (key === 'ArrowRight') dc = 1;

  let anchor: ActiveCellRef;
  let lead: ActiveCellRef;

  if (currentRangeState && parsed.existingRef === currentRangeState.rangeText) {
    // Continuing navigation from current range state
    if (shiftKey) {
      // Hold shift: anchor stays fixed, lead moves
      anchor = currentRangeState.anchor;
      lead = {
        r: Math.max(0, Math.min(maxRows - 1, currentRangeState.lead.r + dr)),
        c: Math.max(0, Math.min(maxCols - 1, currentRangeState.lead.c + dc))
      };
    } else {
      // No shift: both anchor and lead move together
      const newR = Math.max(0, Math.min(maxRows - 1, currentRangeState.lead.r + dr));
      const newC = Math.max(0, Math.min(maxCols - 1, currentRangeState.lead.c + dc));
      anchor = { r: newR, c: newC };
      lead = { r: newR, c: newC };
    }
  } else if (parsed.existingRef) {
    // There is an existing reference in the formula text (e.g. from mouse click or typing)
    const parts = parsed.existingRef.split(':');
    if (parts.length === 2) {
      // Range e.g. A1:B3
      const p1 = parseCellAddress(parts[0]);
      const p2 = parseCellAddress(parts[1]);
      const r1 = p1 ? p1.row : editingCell.r;
      const c1 = p1 ? p1.col : editingCell.c;
      const r2 = p2 ? p2.row : editingCell.r;
      const c2 = p2 ? p2.col : editingCell.c;

      anchor = { r: r1, c: c1 };
      if (shiftKey) {
        lead = {
          r: Math.max(0, Math.min(maxRows - 1, r2 + dr)),
          c: Math.max(0, Math.min(maxCols - 1, c2 + dc))
        };
      } else {
        const newR = Math.max(0, Math.min(maxRows - 1, r2 + dr));
        const newC = Math.max(0, Math.min(maxCols - 1, c2 + dc));
        anchor = { r: newR, c: newC };
        lead = { r: newR, c: newC };
      }
    } else {
      // Single cell e.g. A5
      const p = parseCellAddress(parts[0]);
      const r = p ? p.row : editingCell.r;
      const c = p ? p.col : editingCell.c;
      anchor = { r, c };
      if (shiftKey) {
        lead = {
          r: Math.max(0, Math.min(maxRows - 1, r + dr)),
          c: Math.max(0, Math.min(maxCols - 1, c + dc))
        };
      } else {
        const newR = Math.max(0, Math.min(maxRows - 1, r + dr));
        const newC = Math.max(0, Math.min(maxCols - 1, c + dc));
        anchor = { r: newR, c: newC };
        lead = { r: newR, c: newC };
      }
    }
  } else {
    // Starting fresh reference from editing cell
    const startR = Math.max(0, Math.min(maxRows - 1, editingCell.r + dr));
    const startC = Math.max(0, Math.min(maxCols - 1, editingCell.c + dc));
    anchor = { r: startR, c: startC };
    lead = { r: startR, c: startC };
  }

  const { text: rangeText, isMulti } = formatRangeText(anchor, lead);
  const updatedFormula = `${parsed.prefix}${rangeText}`;

  return {
    updatedFormula,
    nextState: {
      prefix: parsed.prefix,
      anchor,
      lead,
      rangeText,
      isMultiCell: isMulti
    }
  };
}
