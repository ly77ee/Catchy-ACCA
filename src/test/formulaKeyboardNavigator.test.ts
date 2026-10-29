import { describe, it, expect } from 'vitest';
import {
  parseFormulaReferenceState,
  formatRangeText,
  computeNextFormulaReference
} from '../utils/formulaKeyboardNavigator';

describe('Formula Keyboard Navigator Unit Tests', () => {
  it('1. Correctly detects when formula is in cell-referencing state', () => {
    // True cases: trailing operator or opening bracket
    expect(parseFormulaReferenceState('=SUM(').canReference).toBe(true);
    expect(parseFormulaReferenceState('=SUM(').prefix).toBe('=SUM(');

    expect(parseFormulaReferenceState('=A1+').canReference).toBe(true);
    expect(parseFormulaReferenceState('=A1+').prefix).toBe('=A1+');

    expect(parseFormulaReferenceState('=').canReference).toBe(true);
    expect(parseFormulaReferenceState('=').prefix).toBe('=');

    expect(parseFormulaReferenceState('=IF(A1>100,').canReference).toBe(true);
    expect(parseFormulaReferenceState('=IF(A1>100,').prefix).toBe('=IF(A1>100,');

    // True cases: existing trailing reference
    const withRef = parseFormulaReferenceState('=SUM(A5');
    expect(withRef.canReference).toBe(true);
    expect(withRef.prefix).toBe('=SUM(');
    expect(withRef.existingRef).toBe('A5');

    const withRange = parseFormulaReferenceState('=SUM(A1:A5');
    expect(withRange.canReference).toBe(true);
    expect(withRange.prefix).toBe('=SUM(');
    expect(withRange.existingRef).toBe('A1:A5');

    // False cases: normal text or closed formula
    expect(parseFormulaReferenceState('100+20').canReference).toBe(false);
    expect(parseFormulaReferenceState('Revenue Forecast').canReference).toBe(false);
    expect(parseFormulaReferenceState('=SUM(A1:A5)').canReference).toBe(false);
  });

  it('2. Formats range text properly for single and multi-cell ranges', () => {
    expect(formatRangeText({ r: 0, c: 0 }, { r: 0, c: 0 }).text).toBe('A1');
    expect(formatRangeText({ r: 0, c: 0 }, { r: 4, c: 0 }).text).toBe('A1:A5');
    expect(formatRangeText({ r: 4, c: 0 }, { r: 0, c: 0 }).text).toBe('A1:A5'); // Order-independent
    expect(formatRangeText({ r: 1, c: 1 }, { r: 5, c: 3 }).text).toBe('B2:D6');
  });

  it('3. Simulates full keyboard navigation: typing =SUM(, navigating cells, extending range with Shift', () => {
    const editingCell = { r: 5, c: 0 }; // A6

    // Step 1: User types "=SUM(" and presses ArrowUp
    const step1 = computeNextFormulaReference('=SUM(', 'ArrowUp', false, null, editingCell);
    expect(step1).not.toBeNull();
    expect(step1?.updatedFormula).toBe('=SUM(A5');
    expect(step1?.nextState.rangeText).toBe('A5');

    // Step 2: User presses ArrowUp again -> moves to A4
    const step2 = computeNextFormulaReference(step1!.updatedFormula, 'ArrowUp', false, step1!.nextState, editingCell);
    expect(step2).not.toBeNull();
    expect(step2?.updatedFormula).toBe('=SUM(A4');
    expect(step2?.nextState.rangeText).toBe('A4');

    // Step 3: User holds Shift and presses ArrowDown -> extends to A4:A5
    const step3 = computeNextFormulaReference(step2!.updatedFormula, 'ArrowDown', true, step2!.nextState, editingCell);
    expect(step3).not.toBeNull();
    expect(step3?.updatedFormula).toBe('=SUM(A4:A5');
    expect(step3?.nextState.rangeText).toBe('A4:A5');
    expect(step3?.nextState.isMultiCell).toBe(true);

    // Step 4: User holds Shift and presses ArrowDown again -> extends to A4:A6
    const step4 = computeNextFormulaReference(step3!.updatedFormula, 'ArrowDown', true, step3!.nextState, editingCell);
    expect(step4).not.toBeNull();
    expect(step4?.updatedFormula).toBe('=SUM(A4:A6');
    expect(step4?.nextState.rangeText).toBe('A4:A6');

    // Step 5: User holds Shift and presses ArrowRight -> extends rectangular range to A4:B6
    const step5 = computeNextFormulaReference(step4!.updatedFormula, 'ArrowRight', true, step4!.nextState, editingCell);
    expect(step5).not.toBeNull();
    expect(step5?.updatedFormula).toBe('=SUM(A4:B6');
    expect(step5?.nextState.rangeText).toBe('A4:B6');
  });

  it('4. Navigates from existing mouse-selected cell reference seamlessly', () => {
    const editingCell = { r: 2, c: 2 }; // C3
    // Suppose mouse clicked B2, formula is "=SUM(B2"
    const step1 = computeNextFormulaReference('=SUM(B2', 'ArrowDown', true, null, editingCell);
    expect(step1).not.toBeNull();
    expect(step1?.updatedFormula).toBe('=SUM(B2:B3');

    const step2 = computeNextFormulaReference(step1!.updatedFormula, 'ArrowDown', true, step1!.nextState, editingCell);
    expect(step2?.updatedFormula).toBe('=SUM(B2:B4');
  });

  it('5. Ignores arrow keys when editing normal values, keeping cursor navigation normal', () => {
    const res = computeNextFormulaReference('General Ledger Balance', 'ArrowRight', false, null, { r: 0, c: 0 });
    expect(res).toBeNull();

    const resNum = computeNextFormulaReference('12500.50', 'ArrowLeft', false, null, { r: 0, c: 0 });
    expect(resNum).toBeNull();
  });
});
