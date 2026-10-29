import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { SpreadsheetWorkspace } from '../components/spreadsheet/SpreadsheetWorkspace';
import { db } from '../db';
import { QUALIFICATION_VERSIONS } from '../config/accaStructure';
import {
  computeNextFormulaReference,
  parseFormulaReferenceState,
  formatRangeText
} from '../utils/formulaKeyboardNavigator';
import {
  evaluateFortuneFormula,
  createDefaultFortuneSheets,
  fortuneSheetsToSpreadsheetWorkbook
} from '../utils/fortuneSheetAdapter';

import * as fortuneCore from '@fortune-sheet/core';

// Safeguard moveToEnd if element unmounts during setTimeout in test runner
if (fortuneCore && (fortuneCore as any).moveToEnd) {
  const origMoveToEnd = (fortuneCore as any).moveToEnd;
  (fortuneCore as any).moveToEnd = (obj: any) => {
    if (!obj) return;
    return origMoveToEnd(obj);
  };
}
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

describe('FortuneSheet Keyboard Cell-Range Selection Acceptance Tests', () => {
  beforeEach(async () => {
    await db.spreadsheets.clear();
    vi.clearAllMocks();
  });

  it('1. Enter =SUM( and select a single cell using the keyboard (e.g. from A6, ArrowUp -> =SUM(A5)', () => {
    const editingCell = { r: 5, c: 0 }; // Cell A6 (0-indexed: row 5, col 0)
    const initialInput = '=SUM(';

    // Press ArrowUp
    const step = computeNextFormulaReference(initialInput, 'ArrowUp', false, null, editingCell);
    expect(step).not.toBeNull();
    expect(step?.updatedFormula).toBe('=SUM(A5');
    expect(step?.nextState.anchor).toEqual({ r: 4, c: 0 }); // A5
    expect(step?.nextState.lead).toEqual({ r: 4, c: 0 });   // A5
    expect(step?.nextState.rangeText).toBe('A5');
  });

  it('2. Enter =SUM( and select a multi-cell range using Shift plus arrow keys (e.g. A1:A5)', () => {
    const editingCell = { r: 5, c: 0 }; // Cell A6

    // User types =SUM( and presses ArrowUp 5 times to reach A1
    let state = computeNextFormulaReference('=SUM(', 'ArrowUp', false, null, editingCell);
    expect(state?.updatedFormula).toBe('=SUM(A5');

    state = computeNextFormulaReference(state!.updatedFormula, 'ArrowUp', false, state!.nextState, editingCell);
    expect(state?.updatedFormula).toBe('=SUM(A4');

    state = computeNextFormulaReference(state!.updatedFormula, 'ArrowUp', false, state!.nextState, editingCell);
    expect(state?.updatedFormula).toBe('=SUM(A3');

    state = computeNextFormulaReference(state!.updatedFormula, 'ArrowUp', false, state!.nextState, editingCell);
    expect(state?.updatedFormula).toBe('=SUM(A2');

    state = computeNextFormulaReference(state!.updatedFormula, 'ArrowUp', false, state!.nextState, editingCell);
    expect(state?.updatedFormula).toBe('=SUM(A1');
    expect(state?.nextState.rangeText).toBe('A1');

    // User holds Shift and presses ArrowDown 4 times to extend range from A1 to A5
    state = computeNextFormulaReference(state!.updatedFormula, 'ArrowDown', true, state!.nextState, editingCell);
    expect(state?.updatedFormula).toBe('=SUM(A1:A2');

    state = computeNextFormulaReference(state!.updatedFormula, 'ArrowDown', true, state!.nextState, editingCell);
    expect(state?.updatedFormula).toBe('=SUM(A1:A3');

    state = computeNextFormulaReference(state!.updatedFormula, 'ArrowDown', true, state!.nextState, editingCell);
    expect(state?.updatedFormula).toBe('=SUM(A1:A4');

    state = computeNextFormulaReference(state!.updatedFormula, 'ArrowDown', true, state!.nextState, editingCell);
    expect(state?.updatedFormula).toBe('=SUM(A1:A5');
    expect(state?.nextState.isMultiCell).toBe(true);
    expect(state?.nextState.rangeText).toBe('A1:A5');
  });

  it('3. Completes the keyboard-selected formula =SUM(A1:A5) and calculates the exact sum', () => {
    // Populate sheet with values 10, 20, 30, 40, 50 in A1..A5
    const sheets = createDefaultFortuneSheets('FR');
    sheets[0].celldata = [
      { r: 0, c: 0, v: { v: 10, m: '10' } },  // A1
      { r: 1, c: 0, v: { v: 20, m: '20' } },  // A2
      { r: 2, c: 0, v: { v: 30, m: '30' } },  // A3
      { r: 3, c: 0, v: { v: 40, m: '40' } },  // A4
      { r: 4, c: 0, v: { v: 50, m: '50' } },  // A5
    ];

    // Compute formula =SUM(A1:A5)
    const result = evaluateFortuneFormula('=SUM(A1:A5)', sheets, 5, 0, sheets[0].id);
    expect(result.success).toBe(true);
    expect(result.value).toBe(150); // 10 + 20 + 30 + 40 + 50 = 150
  });

  it('4. Dynamic recalculation when a cell in the selected range changes', () => {
    const makeSheetsWithA3 = (val: number) => {
      const sheets = createDefaultFortuneSheets('FR');
      sheets[0].celldata = [
        { r: 0, c: 0, v: { v: 10, m: '10' } },
        { r: 1, c: 0, v: { v: 20, m: '20' } },
        { r: 2, c: 0, v: { v: val, m: String(val) } }, // A3 modified
        { r: 3, c: 0, v: { v: 40, m: '40' } },
        { r: 4, c: 0, v: { v: 50, m: '50' } },
      ];
      return sheets;
    };

    // With A3 = 30 -> 150
    const res1 = evaluateFortuneFormula('=SUM(A1:A5)', makeSheetsWithA3(30), 5, 0);
    expect(res1.value).toBe(150);

    // With A3 changed to 100 -> 220
    const res2 = evaluateFortuneFormula('=SUM(A1:A5)', makeSheetsWithA3(100), 5, 0);
    expect(res2.value).toBe(220);
  });

  it('5. Mouse range selection integration: supports mouse selection, followed by keyboard continuation', () => {
    // Suppose user clicked B2 with mouse: formula has "=SUM(B2"
    const editingCell = { r: 5, c: 1 }; // B6
    const mouseFormula = '=SUM(B2';

    // Now user holds Shift and presses ArrowDown via keyboard
    const step1 = computeNextFormulaReference(mouseFormula, 'ArrowDown', true, null, editingCell);
    expect(step1?.updatedFormula).toBe('=SUM(B2:B3');

    // User presses Shift + ArrowRight -> rectangular range B2:C3
    const step2 = computeNextFormulaReference(step1!.updatedFormula, 'ArrowRight', true, step1!.nextState, editingCell);
    expect(step2?.updatedFormula).toBe('=SUM(B2:C3');
  });

  it('6. Does not interfere with ordinary text editing or navigation outside formula mode', () => {
    // Normal text without leading "="
    const textRes = computeNextFormulaReference('Administrative Expenses', 'ArrowLeft', false, null, { r: 0, c: 0 });
    expect(textRes).toBeNull();

    // Closed formula with trailing parenthesis
    const closedRes = computeNextFormulaReference('=SUM(A1:A5)', 'ArrowRight', false, null, { r: 0, c: 0 });
    expect(closedRes).toBeNull();
  });

  it('7. Interactive DOM test: mounts SpreadsheetWorkspace and verifies keydown capture handler handles formula keys', async () => {
    const { container } = render(
      <SpreadsheetWorkspace
        version={mockVersion}
        allQuestions={[]}
        initialPaperId="FR"
      />
    );

    await waitFor(() => {
      expect(container.querySelector('.catchy-spreadsheet-host')).not.toBeNull();
      expect(container.querySelector('.fortune-container')).not.toBeNull();
    });

    const host = container.querySelector('.catchy-spreadsheet-host') as HTMLDivElement;
    expect(host).toBeDefined();

    // Simulate typing a cell input in the container
    let cellInput = container.querySelector('.luckysheet-cell-input') as HTMLDivElement;
    if (!cellInput) {
      cellInput = document.createElement('div');
      cellInput.className = 'luckysheet-cell-input';
      cellInput.setAttribute('contenteditable', 'true');
      cellInput.tabIndex = 0;
      host.appendChild(cellInput);
    } else {
      cellInput.tabIndex = 0;
    }

    cellInput.innerText = '=SUM(';
    cellInput.focus();

    // Fire keydown ArrowUp: targeted at active cellInput
    const arrowUpEvent = new KeyboardEvent('keydown', {
      key: 'ArrowUp',
      bubbles: true,
      cancelable: true
    });

    cellInput.dispatchEvent(arrowUpEvent);

    // Verify cellInput was updated to include reference
    expect(cellInput.innerText).toMatch(/^=SUM\([A-Z]+[0-9]+/);

    // Fire keydown Enter: verifies balancing parenthesis
    const enterEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true
    });

    cellInput.dispatchEvent(enterEvent);
    expect(cellInput.innerText).toMatch(/\)$/);
  });

  it('8. User Acceptance Scenario: A1=10, A2=20, A3=SUM(A1:A2) = 30, change A1=15 -> 35', () => {
    // 1. Initial state: A1=10, A2=20
    const sheets = createDefaultFortuneSheets('FR');
    sheets[0].celldata = [
      { r: 0, c: 0, v: { v: 10, m: '10' } }, // A1
      { r: 1, c: 0, v: { v: 20, m: '20' } }, // A2
    ];

    // 2. Select A3 (row 2, col 0), enter "=SUM("
    const editingCell = { r: 2, c: 0 };
    let input = '=SUM(';

    // 3. Press ArrowUp to navigate to A2
    const step1 = computeNextFormulaReference(input, 'ArrowUp', false, null, editingCell);
    expect(step1).not.toBeNull();
    expect(step1?.updatedFormula).toBe('=SUM(A2');

    // 4. Press ArrowUp again to navigate to A1
    const step2 = computeNextFormulaReference(step1!.updatedFormula, 'ArrowUp', false, step1!.nextState, editingCell);
    expect(step2).not.toBeNull();
    expect(step2?.updatedFormula).toBe('=SUM(A1');

    // 5. Press Shift + ArrowDown to extend range to A1:A2
    const step3 = computeNextFormulaReference(step2!.updatedFormula, 'ArrowDown', true, step2!.nextState, editingCell);
    expect(step3).not.toBeNull();
    expect(step3?.updatedFormula).toBe('=SUM(A1:A2');

    // 6. Complete formula with closing parenthesis: "=SUM(A1:A2)"
    const completedFormula = `${step3!.updatedFormula})`;
    expect(completedFormula).toBe('=SUM(A1:A2)');

    // 7. Calculate result in A3 -> must equal 30
    const evalResult1 = evaluateFortuneFormula(completedFormula, sheets, 2, 0, sheets[0].id);
    expect(evalResult1.success).toBe(true);
    expect(evalResult1.value).toBe(30);

    // 8. Change input cell A1 to 15
    sheets[0].celldata[0].v = { v: 15, m: '15' };

    // 9. Dynamic recalculation -> A3 must now equal 35
    const evalResult2 = evaluateFortuneFormula(completedFormula, sheets, 2, 0, sheets[0].id);
    expect(evalResult2.success).toBe(true);
    expect(evalResult2.value).toBe(35);
  });

  it('9. Works with other formulas: =AVERAGE(, =MAX(, =MIN(, and =A1+B1', () => {
    const sheets = createDefaultFortuneSheets('FR');
    sheets[0].celldata = [
      { r: 0, c: 0, v: { v: 15, m: '15' } }, // A1
      { r: 1, c: 0, v: { v: 25, m: '25' } }, // A2
      { r: 0, c: 1, v: { v: 10, m: '10' } }, // B1
    ];
    const editingCell = { r: 2, c: 0 };

    // =AVERAGE(
    const avgStep = computeNextFormulaReference('=AVERAGE(', 'ArrowUp', false, null, editingCell);
    expect(avgStep?.updatedFormula).toBe('=AVERAGE(A2');
    const avgRange = computeNextFormulaReference(avgStep!.updatedFormula, 'ArrowUp', true, avgStep!.nextState, editingCell);
    expect(avgRange?.updatedFormula).toBe('=AVERAGE(A1:A2');
    const avgCalc = evaluateFortuneFormula(`${avgRange!.updatedFormula})`, sheets, 2, 0);
    expect(avgCalc.value).toBe(20); // (15 + 25) / 2 = 20

    // =MAX(
    const maxCalc = evaluateFortuneFormula('=MAX(A1:A2)', sheets, 2, 0);
    expect(maxCalc.value).toBe(25);

    // =MIN(
    const minCalc = evaluateFortuneFormula('=MIN(A1:A2)', sheets, 2, 0);
    expect(minCalc.value).toBe(15);

    // Arithmetic expression: =A1+B1
    const addCalc = evaluateFortuneFormula('=A1+B1', sheets, 2, 0);
    expect(addCalc.value).toBe(25);
  });

  it('10. Repeated arrow key interactions do not crash and handle fast directional changes cleanly', async () => {
    const editingCell = { r: 5, c: 5 }; // F6
    let currentFormula = '=SUM(';
    let state: any = null;

    // Simulate 20 rapid arrow navigations in various directions with and without shift
    const directions: Array<{ key: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight'; shift: boolean }> = [
      { key: 'ArrowUp', shift: false },
      { key: 'ArrowUp', shift: false },
      { key: 'ArrowLeft', shift: false },
      { key: 'ArrowDown', shift: true },
      { key: 'ArrowDown', shift: true },
      { key: 'ArrowRight', shift: true },
      { key: 'ArrowRight', shift: true },
      { key: 'ArrowUp', shift: false },
      { key: 'ArrowLeft', shift: false },
      { key: 'ArrowDown', shift: false },
      { key: 'ArrowRight', shift: true },
    ];

    expect(() => {
      for (const d of directions) {
        const next = computeNextFormulaReference(currentFormula, d.key, d.shift, state, editingCell);
        expect(next).not.toBeNull();
        currentFormula = next!.updatedFormula;
        state = next!.nextState;
      }
    }).not.toThrow();

    expect(currentFormula).toMatch(/^=SUM\([A-Z]+[0-9]+(:[A-Z]+[0-9]+)?$/);
  });

  it('11. Visual range highlight box is created and cleaned up on Enter or Escape', async () => {
    const { container } = render(
      <SpreadsheetWorkspace
        version={mockVersion}
        allQuestions={[]}
        initialPaperId="FR"
      />
    );

    await waitFor(() => {
      expect(container.querySelector('.catchy-spreadsheet-host')).not.toBeNull();
    });

    const host = container.querySelector('.catchy-spreadsheet-host') as HTMLDivElement;
    let cellInput = container.querySelector('.luckysheet-cell-input') as HTMLDivElement;
    if (!cellInput) {
      cellInput = document.createElement('div');
      cellInput.className = 'luckysheet-cell-input';
      cellInput.tabIndex = 0;
      host.appendChild(cellInput);
    }

    cellInput.innerText = '=SUM(';
    cellInput.focus();

    // ArrowUp triggers visual highlight creation
    cellInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(container.querySelector('#catchy-formula-keyboard-range')).not.toBeNull();

    // Escape cleans up visual highlight
    cellInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(container.querySelector('#catchy-formula-keyboard-range')).toBeNull();
  });
});
