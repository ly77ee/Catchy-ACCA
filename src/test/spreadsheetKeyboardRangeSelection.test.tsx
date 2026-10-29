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
});
