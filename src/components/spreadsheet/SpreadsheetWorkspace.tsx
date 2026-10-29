import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Workbook, WorkbookInstance } from '@fortune-sheet/react';
import '@fortune-sheet/react/dist/index.css';
import { ErrorBoundary } from '../common/ErrorBoundary';
import {
  SpreadsheetWorkbook,
  QuestionRecord,
  QualificationVersion
} from '../../types';
import {
  createDefaultFortuneSheets,
  spreadsheetWorkbookToFortuneSheets,
  fortuneSheetsToSpreadsheetWorkbook,
  FortuneSheetType
} from '../../utils/fortuneSheetAdapter';
import {
  computeNextFormulaReference,
  FormulaRangeState
} from '../../utils/formulaKeyboardNavigator';
import { parseCellAddress } from '../../utils/formulaEngine';
import { db, logActivity } from '../../db';
import {
  Table2,
  Save,
  RotateCcw,
  Download,
  Upload,
  Check,
  Clock,
  FileText,
  AlertCircle,
  HelpCircle
} from 'lucide-react';

interface SpreadsheetWorkspaceProps {
  version: QualificationVersion;
  allQuestions: QuestionRecord[];
  initialQuestionId?: string;
  initialPaperId?: string;
  examAttemptId?: string;
  onSelectQuestion?: (questionId: string) => void;
  onOpenWriter?: () => void;
}

export const SpreadsheetWorkspace: React.FC<SpreadsheetWorkspaceProps> = ({
  version,
  allQuestions,
  initialQuestionId,
  initialPaperId = 'FR',
  examAttemptId,
  onSelectQuestion,
  onOpenWriter
}) => {
  const [selectedPaperId, setSelectedPaperId] = useState<string>(initialPaperId);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>(initialQuestionId || '');

  // Workbook Persistence State
  const [workbookRecord, setWorkbookRecord] = useState<SpreadsheetWorkbook | null>(null);
  const [sheetData, setSheetData] = useState<FortuneSheetType[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'dirty' | 'failed'>('saved');
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);

  const workbookRef = useRef<WorkbookInstance | null>(null);
  const hostContainerRef = useRef<HTMLDivElement | null>(null);
  const rangeNavigationStateRef = useRef<FormulaRangeState | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const workbookRecordRef = useRef<SpreadsheetWorkbook | null>(null);
  const latestDataRef = useRef<FortuneSheetType[]>([]);
  const isSavingRef = useRef<boolean>(false);
  const suppressDirtyUntilRef = useRef<number>(0);

  // Sync ref with state
  useEffect(() => {
    workbookRecordRef.current = workbookRecord;
  }, [workbookRecord]);

  // Available questions for selected paper
  const paperQuestions = allQuestions.filter(q => q.paperId === selectedPaperId);
  const selectedQuestion = allQuestions.find(q => q.id === selectedQuestionId);

  // Core Workbook Save Function
  const saveCurrentWorkbook = useCallback(async (trigger: 'auto' | 'manual' = 'manual') => {
    if (isSavingRef.current) return;
    const currentWb = workbookRecordRef.current;
    if (!currentWb) return;

    // If manual save, commit any active cell editing input
    if (trigger === 'manual') {
      const cellInput = hostContainerRef.current?.querySelector<HTMLDivElement>('.luckysheet-cell-input');
      if (cellInput && document.activeElement === cellInput) {
        cellInput.blur();
      }
    }

    isSavingRef.current = true;
    setSaveStatus('saving');
    setSaveErrorMessage(null);

    try {
      // Gather latest sheets from FortuneSheet API if available, fallback to latestDataRef or sheetData
      const apiSheets = workbookRef.current?.getAllSheets();
      const rawSheets = (apiSheets && apiSheets.length > 0
        ? apiSheets
        : latestDataRef.current && latestDataRef.current.length > 0
        ? latestDataRef.current
        : sheetData) as FortuneSheetType[];

      const updatedWb = fortuneSheetsToSpreadsheetWorkbook(rawSheets, currentWb);
      await db.spreadsheets.put(updatedWb);

      workbookRecordRef.current = updatedWb;
      setWorkbookRecord(updatedWb);
      setLastSavedTime(updatedWb.updatedAt);
      suppressDirtyUntilRef.current = Date.now() + 500;
      setSaveStatus('saved');

      if (trigger === 'manual') {
        await logActivity('Spreadsheet Saved', `Saved Excel spreadsheet for ${selectedPaperId}`, 'workspace');
      }
    } catch (err: any) {
      console.error('Save failed:', err);
      setSaveStatus('failed');
      setSaveErrorMessage(err?.message || 'Failed to save to database');
    } finally {
      isSavingRef.current = false;
    }
  }, [selectedPaperId, sheetData]);

  // Load workbook from IndexedDB
  useEffect(() => {
    let isCancelled = false;

    const loadWorkbook = async () => {
      setIsLoading(true);
      try {
        let list = await db.spreadsheets.where('paperId').equals(selectedPaperId).toArray();

        // Scope by examAttemptId if in an exam attempt, or filter by question
        if (examAttemptId) {
          list = list.filter(w => w.examAttemptId === examAttemptId);
        } else if (selectedQuestionId) {
          list = list.filter(w => w.questionId === selectedQuestionId && !w.examAttemptId);
        } else {
          list = list.filter(w => !w.questionId && !w.examAttemptId);
        }

        if (isCancelled) return;

        if (list.length > 0) {
          const loadedWb = list[0];
          workbookRecordRef.current = loadedWb;
          setWorkbookRecord(loadedWb);
          const converted = spreadsheetWorkbookToFortuneSheets(loadedWb);
          latestDataRef.current = converted;
          setSheetData(converted);
          setLastSavedTime(loadedWb.updatedAt);
        } else {
          // Initialize fresh workbook with default ACCA financial schedule
          const initialSheets = createDefaultFortuneSheets(selectedPaperId, selectedQuestion?.title);
          const newWb: SpreadsheetWorkbook = {
            id: examAttemptId
              ? `wb-exam-${examAttemptId}-${selectedQuestionId || 'general'}`
              : `wb-${selectedPaperId}-${selectedQuestionId || 'general'}-${Date.now()}`,
            questionId: selectedQuestionId || undefined,
            paperId: selectedPaperId,
            examAttemptId: examAttemptId || undefined,
            title: `${selectedPaperId} Financial Workings`,
            activeSheetIndex: 0,
            sheets: [],
            fortuneData: initialSheets,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          const completeWb = fortuneSheetsToSpreadsheetWorkbook(initialSheets, newWb);
          await db.spreadsheets.put(completeWb);

          if (isCancelled) return;
          workbookRecordRef.current = completeWb;
          setWorkbookRecord(completeWb);
          latestDataRef.current = initialSheets;
          setSheetData(initialSheets);
          setLastSavedTime(completeWb.updatedAt);
        }
        suppressDirtyUntilRef.current = Date.now() + 500;
        setSaveStatus('saved');
      } catch (err) {
        console.error('Error loading spreadsheet workbook:', err);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    loadWorkbook();

    return () => {
      isCancelled = true;
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [selectedPaperId, selectedQuestionId, examAttemptId]);

  // Keyboard Cell-Range Selection Handler while Editing Formulas
  useEffect(() => {
    const container = hostContainerRef.current;
    if (!container) return;

    const clearVisualRangeBox = () => {
      const existing = container.querySelector('#catchy-formula-keyboard-range');
      if (existing) {
        existing.remove();
      }
    };

    const updateVisualRangeBox = (
      rMin: number,
      rMax: number,
      cMin: number,
      cMax: number
    ) => {
      const cellArea = container.querySelector('.fortune-cell-area') || container;
      if (!cellArea) return;

      // FortuneSheet default row height is 20px and col width is 74px
      const defaultRowHeight = 20;
      const defaultColWidth = 74;

      const top = rMin * defaultRowHeight;
      const left = cMin * defaultColWidth;
      const height = (rMax - rMin + 1) * defaultRowHeight;
      const width = (cMax - cMin + 1) * defaultColWidth;

      let box = cellArea.querySelector<HTMLDivElement>('#catchy-formula-keyboard-range');
      if (!box) {
        box = document.createElement('div');
        box.id = 'catchy-formula-keyboard-range';
        box.className = 'fortune-selection-highlight catchy-formula-range-highlight';
        box.style.position = 'absolute';
        box.style.border = '2px dashed #2563eb';
        box.style.backgroundColor = 'rgba(37, 99, 235, 0.12)';
        box.style.pointerEvents = 'none';
        box.style.zIndex = '15';
        box.style.boxSizing = 'border-box';
        cellArea.appendChild(box);
      }

      box.style.left = `${left}px`;
      box.style.top = `${top}px`;
      box.style.width = `${Math.max(width - 1, 10)}px`;
      box.style.height = `${Math.max(height - 1, 10)}px`;
      box.style.display = 'block';
    };

    const handleKeyDownCapture = (e: KeyboardEvent) => {
      const isArrowKey =
        e.key === 'ArrowUp' ||
        e.key === 'ArrowDown' ||
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowRight';

      // Find cell input and formula bar input elements
      const cellInput = container.querySelector<HTMLDivElement>('.luckysheet-cell-input');
      const fxInput = container.querySelector<HTMLDivElement>('#luckysheet-functionbox-cell');
      const activeElement = document.activeElement;

      const isCellInputActive =
        Boolean(activeElement && (cellInput?.contains(activeElement) || activeElement === cellInput));
      const isFxInputActive =
        Boolean(activeElement && (fxInput?.contains(activeElement) || activeElement === fxInput));

      if (!isCellInputActive && !isFxInputActive) {
        rangeNavigationStateRef.current = null;
        clearVisualRangeBox();
        return;
      }

      const targetInput = isFxInputActive ? fxInput : (cellInput || fxInput);
      if (!targetInput) return;

      const currentText = targetInput.innerText || targetInput.textContent || '';

      // Auto-balance closing parenthesis on Enter if formula is unclosed
      if (e.key === 'Enter') {
        rangeNavigationStateRef.current = null;
        clearVisualRangeBox();
        if (currentText.trim().startsWith('=')) {
          const openCount = (currentText.match(/\(/g) || []).length;
          const closeCount = (currentText.match(/\)/g) || []).length;
          if (openCount > closeCount) {
            const balanced = currentText + ')'.repeat(openCount - closeCount);
            if (cellInput) {
              cellInput.innerText = balanced;
              cellInput.textContent = balanced;
            }
            if (fxInput) {
              fxInput.innerText = balanced;
              fxInput.textContent = balanced;
            }
            targetInput.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }
        return;
      }

      if (e.key === 'Escape') {
        rangeNavigationStateRef.current = null;
        clearVisualRangeBox();
        return;
      }

      // If user types normal text/operators, reset active range selection tracking
      if (!isArrowKey) {
        if (e.key !== 'Shift') {
          rangeNavigationStateRef.current = null;
          clearVisualRangeBox();
        }
        return;
      }

      // Determine the origin coordinate of the cell currently being edited
      let editingCell = { r: 0, c: 0 };
      const nameBox = container.querySelector<HTMLDivElement>('.fortune-name-box');
      if (nameBox && nameBox.textContent) {
        const parsed = parseCellAddress(nameBox.textContent);
        if (parsed) {
          editingCell = { r: parsed.row, c: parsed.col };
        }
      }

      // Compute updated formula and range state
      const result = computeNextFormulaReference(
        currentText,
        e.key as 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight',
        e.shiftKey,
        rangeNavigationStateRef.current,
        editingCell
      );

      if (result) {
        e.preventDefault();
        e.stopPropagation();

        rangeNavigationStateRef.current = result.nextState;

        // Synchronize updated formula to inputs
        if (cellInput) {
          cellInput.innerText = result.updatedFormula;
          cellInput.textContent = result.updatedFormula;
        }
        if (fxInput) {
          fxInput.innerText = result.updatedFormula;
          fxInput.textContent = result.updatedFormula;
        }

        // Position caret at end of input
        const sel = window.getSelection();
        const range = document.createRange();
        if (targetInput.childNodes.length > 0) {
          const lastChild = targetInput.childNodes[targetInput.childNodes.length - 1];
          const offset = lastChild.textContent?.length || 0;
          range.setStart(lastChild, offset);
          range.setEnd(lastChild, offset);
          sel?.removeAllRanges();
          sel?.addRange(range);
        }

        // Trigger input event to update FortuneSheet internal cache
        targetInput.dispatchEvent(new Event('input', { bubbles: true }));

        // Visually highlight the referenced range on the grid WITHOUT mutating firstSelection
        const rMin = Math.min(result.nextState.anchor.r, result.nextState.lead.r);
        const rMax = Math.max(result.nextState.anchor.r, result.nextState.lead.r);
        const cMin = Math.min(result.nextState.anchor.c, result.nextState.lead.c);
        const cMax = Math.max(result.nextState.anchor.c, result.nextState.lead.c);

        updateVisualRangeBox(rMin, rMax, cMin, cMax);
      } else {
        // Not in reference position; allow normal caret movement
        rangeNavigationStateRef.current = null;
        clearVisualRangeBox();
      }
    };

    // Helper to reveal active cell column horizontally
    const revealActiveCell = (col: number) => {
      const scrollbarX = container.querySelector<HTMLDivElement>('.luckysheet-scrollbar-x');
      const viewportEl = container.querySelector<HTMLDivElement>('.fortune-sheet-container') || container;
      if (!scrollbarX || !viewportEl) return;

      const defaultColWidth = 74;
      const rowHeaderWidth = 46;
      const cellLeft = col * defaultColWidth;
      const cellRight = cellLeft + defaultColWidth;
      const currentScroll = scrollbarX.scrollLeft;
      const viewportWidth = scrollbarX.clientWidth > 0 ? scrollbarX.clientWidth : (viewportEl.clientWidth - rowHeaderWidth);

      if (viewportWidth <= 0) return;

      if (cellRight > currentScroll + viewportWidth - 20) {
        const nextScroll = cellRight - viewportWidth + 80;
        scrollbarX.scrollLeft = nextScroll;
        scrollbarX.dispatchEvent(new Event('scroll', { bubbles: true }));
        try {
          workbookRef.current?.scroll({ scrollLeft: nextScroll });
        } catch {
          // ignore
        }
      } else if (cellLeft < currentScroll + 10) {
        const nextScroll = Math.max(0, cellLeft - 40);
        scrollbarX.scrollLeft = nextScroll;
        scrollbarX.dispatchEvent(new Event('scroll', { bubbles: true }));
        try {
          workbookRef.current?.scroll({ scrollLeft: nextScroll });
        } catch {
          // ignore
        }
      }
    };

    const checkActiveCell = () => {
      const nb = container.querySelector<HTMLDivElement>('.fortune-name-box');
      const text = nb?.textContent?.trim() || nb?.innerText?.trim();
      if (text) {
        const parsed = parseCellAddress(text);
        if (parsed) {
          revealActiveCell(parsed.col);
          return;
        }
      }
      try {
        const sel = workbookRef.current?.getSelection();
        if (sel && sel.length > 0 && sel[0].column && sel[0].column.length > 0) {
          revealActiveCell(sel[0].column[0]);
        }
      } catch {
        // ignore
      }
    };

    // Trackpad & Shift+Wheel horizontal scrolling
    const handleWheel = (e: WheelEvent) => {
      let deltaX = e.deltaX;
      if (e.shiftKey && deltaX === 0 && e.deltaY !== 0) {
        deltaX = e.deltaY;
      }
      if (deltaX !== 0) {
        const scrollbarX = container.querySelector<HTMLDivElement>('.luckysheet-scrollbar-x');
        if (scrollbarX) {
          e.preventDefault();
          scrollbarX.scrollLeft += deltaX;
          scrollbarX.dispatchEvent(new Event('scroll', { bubbles: true }));
          try {
            workbookRef.current?.scroll({ scrollLeft: scrollbarX.scrollLeft });
          } catch {
            // ignore
          }
        }
      }
    };
    container.addEventListener('wheel', handleWheel, { passive: false });

    // Monitor active cell changes via FortuneSheet name-box mutation
    let observer: MutationObserver | null = null;
    let nameBoxTimer: NodeJS.Timeout | null = null;

    const attachObserver = () => {
      const nameBox = container.querySelector<HTMLDivElement>('.fortune-name-box');
      if (nameBox && !observer) {
        observer = new MutationObserver(() => {
          checkActiveCell();
        });
        observer.observe(nameBox, { childList: true, characterData: true, subtree: true });
      }
    };
    attachObserver();
    nameBoxTimer = setTimeout(attachObserver, 200);

    // Keyboard navigation auto-reveal (Arrow keys, Tab, Shift+Tab, Enter)
    const handleKeyNavCheck = (e: KeyboardEvent) => {
      if (['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Tab', 'Enter'].includes(e.key)) {
        setTimeout(checkActiveCell, 20);
      }
    };
    container.addEventListener('keyup', handleKeyNavCheck);

    const handleMouseUp = () => {
      setTimeout(checkActiveCell, 30);
    };
    container.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('touchend', handleMouseUp);

    // ResizeObserver to adapt to split-screen resizing
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        window.dispatchEvent(new Event('resize'));
        setTimeout(checkActiveCell, 30);
      });
      resizeObserver.observe(container);
    }

    container.addEventListener('keydown', handleKeyDownCapture, { capture: true });
    return () => {
      container.removeEventListener('keydown', handleKeyDownCapture, { capture: true });
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('keyup', handleKeyNavCheck);
      container.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('touchend', handleMouseUp);
      if (nameBoxTimer) clearTimeout(nameBoxTimer);
      if (observer) observer.disconnect();
      if (resizeObserver) resizeObserver.disconnect();
      clearVisualRangeBox();
    };
  }, [isLoading]);

  // Handle Sheet Data Change from FortuneSheet
  const handleSheetChange = useCallback((newData: any[]) => {
    latestDataRef.current = newData;

    if (Date.now() < suppressDirtyUntilRef.current) {
      return;
    }

    setSaveStatus('dirty');

    // Debounce auto-save (1000ms)
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      saveCurrentWorkbook('auto');
    }, 1000);
  }, [saveCurrentWorkbook]);

  // Explicit Save
  const handleManualSave = () => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    saveCurrentWorkbook('manual');
  };

  // Reset to default ACCA CBE financial template
  const handleResetTemplate = async () => {
    if (!window.confirm('Reset this workbook to the default ACCA CBE financial workings schedule? Any uncommitted changes on this sheet will be replaced.')) {
      return;
    }

    const defaultSheets = createDefaultFortuneSheets(selectedPaperId, selectedQuestion?.title);
    setSheetData(defaultSheets);

    if (workbookRecord) {
      const updatedWb = fortuneSheetsToSpreadsheetWorkbook(defaultSheets, workbookRecord);
      await db.spreadsheets.put(updatedWb);
      setWorkbookRecord(updatedWb);
      setSaveStatus('saved');
      setLastSavedTime(updatedWb.updatedAt);
    }
  };

  // Export active sheet to CSV
  const handleExportCsv = () => {
    try {
      const allSheets = workbookRef.current?.getAllSheets() || sheetData;
      const activeSheet = allSheets.find((s: any) => s.status === 1) || allSheets[0];
      if (!activeSheet) return;

      const rows: string[] = [];
      const data = activeSheet.data || [];

      if (data.length > 0) {
        data.forEach((row: any[]) => {
          if (!row) return;
          const line = row.map(cell => {
            if (!cell || (cell.v === null && !cell.f)) return '""';
            const val = cell.m !== undefined ? String(cell.m) : cell.v !== null && cell.v !== undefined ? String(cell.v) : '';
            return `"${val.replace(/"/g, '""')}"`;
          }).join(',');
          rows.push(line);
        });
      } else if (activeSheet.celldata) {
        // Build rows from celldata
        const maxR = activeSheet.celldata.reduce((max: number, item: any) => Math.max(max, item.r), 0);
        const maxC = activeSheet.celldata.reduce((max: number, item: any) => Math.max(max, item.c), 0);
        const grid: string[][] = Array.from({ length: maxR + 1 }, () => Array.from({ length: maxC + 1 }, () => '""'));

        activeSheet.celldata.forEach((item: any) => {
          if (item.v) {
            const val = item.v.m !== undefined ? String(item.v.m) : item.v.v !== null && item.v.v !== undefined ? String(item.v.v) : '';
            grid[item.r][item.c] = `"${val.replace(/"/g, '""')}"`;
          }
        });

        grid.forEach(r => rows.push(r.join(',')));
      }

      const csvContent = 'data:text/csv;charset=utf-8,' + rows.join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `${selectedPaperId}_${activeSheet.name.replace(/\s+/g, '_')}_workings.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('CSV export failed:', err);
    }
  };

  // Import CSV into active sheet
  const handleImportCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r\n|\n/);
      const celldata: Array<{ r: number; c: number; v: any }> = [];

      lines.forEach((line, r) => {
        if (!line.trim()) return;
        const cols = line.split(',');
        cols.forEach((col, c) => {
          const clean = col.replace(/^"(.*)"$/, '$1').trim();
          if (clean) {
            const num = Number(clean);
            const isNum = !isNaN(num) && clean !== '';
            celldata.push({
              r,
              c,
              v: {
                v: isNum ? num : clean,
                m: clean,
                ct: isNum ? { fa: 'General', t: 'n' } : { fa: 'General', t: 'g' }
              }
            });
          }
        });
      });

      const importedSheet: FortuneSheetType = {
        name: file.name.replace(/\.[^/.]+$/, '').substring(0, 20) || 'Imported Data',
        id: `sheet-imp-${Date.now()}`,
        status: 1,
        row: Math.max(lines.length + 10, 35),
        column: 16,
        celldata
      };

      const newSheets = [
        ...sheetData.map(s => ({ ...s, status: 0 })),
        importedSheet
      ];

      setSheetData(newSheets);
      handleSheetChange(newSheets);
    };

    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-2 max-w-7xl mx-auto pb-4 h-full flex flex-col">
      {/* Top Controls Header Bar - Minimized & Compact */}
      <div className="bg-[#18181f] rounded-xl border border-[#2a2a34] px-3.5 py-2 shadow-md shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Left: Compact Title, Icon & Status Badge */}
          <div className="flex items-center space-x-2 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
              <Table2 className="w-4 h-4" />
            </div>

            <div className="flex items-center space-x-1.5">
              <h1 className="text-xs sm:text-sm font-bold text-gray-100">Excel Workspace</h1>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-[#252530] text-emerald-400 border border-emerald-500/20 hidden sm:inline">
                FortuneSheet Engine
              </span>
            </div>
          </div>

          {/* Center: Paper and Question Selectors */}
          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
            {/* Paper Selection */}
            <select
              value={selectedPaperId}
              onChange={(e) => {
                setSelectedPaperId(e.target.value);
                setSelectedQuestionId('');
              }}
              className="px-2.5 py-1 bg-[#22222b] border border-[#32323e] rounded-lg text-xs font-semibold text-gray-200 focus:outline-none focus:border-red-500 transition-colors"
            >
              {version.papers.map(p => (
                <option key={p.id} value={p.id}>
                  {p.code} — {p.name}
                </option>
              ))}
            </select>

            {/* Question Selection */}
            {paperQuestions.length > 0 && (
              <select
                value={selectedQuestionId}
                onChange={(e) => {
                  setSelectedQuestionId(e.target.value);
                  if (onSelectQuestion) onSelectQuestion(e.target.value);
                }}
                className="px-2.5 py-1 bg-[#22222b] border border-[#32323e] rounded-lg text-xs font-semibold text-gray-200 focus:outline-none focus:border-red-500 transition-colors max-w-[200px] truncate"
              >
                <option value="">(Standalone Scratchpad)</option>
                {paperQuestions.map(q => (
                  <option key={q.id} value={q.id}>
                    Q: {q.title} ({q.availableMarks || 0} marks)
                  </option>
                ))}
              </select>
            )}

            {/* Answer Writer Link */}
            {onOpenWriter && (
              <button
                type="button"
                onClick={onOpenWriter}
                className="px-2 py-1 bg-[#22222b] hover:bg-[#2a2a36] text-gray-300 rounded-lg text-xs font-medium border border-[#32323e] flex items-center space-x-1.5 transition-colors hidden md:inline-flex"
                title="Switch to Answer Writer"
              >
                <FileText className="w-3.5 h-3.5 text-red-400" />
                <span>Answer Writer</span>
              </button>
            )}
          </div>

          {/* Right: Actions, Save Indicator, CSV */}
          <div className="flex items-center space-x-1.5 shrink-0">
            {/* Save Status Indicator */}
            <div
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all ${
                saveStatus === 'saving'
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                  : saveStatus === 'dirty'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  : saveStatus === 'failed'
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              }`}
              title={saveStatus === 'failed' && saveErrorMessage ? saveErrorMessage : undefined}
            >
              {saveStatus === 'saving' ? (
                <>
                  <Clock className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                  <span className="font-semibold">Saving...</span>
                </>
              ) : saveStatus === 'dirty' ? (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-semibold">Unsaved</span>
                </>
              ) : saveStatus === 'failed' ? (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span className="font-semibold">Save failed</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-semibold">
                    Saved{lastSavedTime ? ` (${new Date(lastSavedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})` : ''}
                  </span>
                </>
              )}
            </div>

            {/* Manual Save Button */}
            <button
              type="button"
              onClick={handleManualSave}
              disabled={saveStatus === 'saving'}
              className="px-3 py-1 bg-acca-red hover:bg-acca-red-hover disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs"
              title="Save workbook to local IndexedDB"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saveStatus === 'saving' ? 'Saving...' : 'Save'}</span>
            </button>

            {/* Reset Template */}
            <button
              type="button"
              onClick={handleResetTemplate}
              className="p-1 bg-[#22222b] hover:bg-[#2a2a36] text-gray-400 hover:text-gray-200 rounded-lg border border-[#32323e] transition-colors"
              title="Reset to default ACCA CBE financial template"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Export CSV */}
            <button
              type="button"
              onClick={handleExportCsv}
              className="p-1 bg-[#22222b] hover:bg-[#2a2a36] text-gray-400 hover:text-gray-200 rounded-lg border border-[#32323e] transition-colors"
              title="Export active sheet to CSV"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            {/* Import CSV */}
            <label
              className="p-1 bg-[#22222b] hover:bg-[#2a2a36] text-gray-400 hover:text-gray-200 rounded-lg border border-[#32323e] transition-colors cursor-pointer"
              title="Import CSV into new sheet"
            >
              <Upload className="w-3.5 h-3.5" />
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleImportCsv}
                className="hidden"
              />
            </label>

            {/* Help Button */}
            <button
              type="button"
              onClick={() => setShowHelpModal(true)}
              className="p-1 bg-[#22222b] hover:bg-[#2a2a36] text-gray-400 hover:text-gray-200 rounded-lg border border-[#32323e] transition-colors"
              title="Spreadsheet formulas & shortcuts help"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Selected Question Details Bar if active */}
        {selectedQuestion && (
          <div className="mt-1.5 pt-1.5 border-t border-[#252530] flex flex-wrap items-center justify-between text-[11px] text-gray-300 gap-2">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-white">Linked Question:</span>
              <span className="text-gray-300 truncate max-w-sm">{selectedQuestion.title}</span>
              <span className="text-[10px] bg-red-950/40 text-red-400 border border-red-800/40 px-1.5 py-0.2 rounded font-mono">
                {selectedQuestion.availableMarks || 0} Marks
              </span>
            </div>
            {lastSavedTime && (
              <span className="text-[10px] text-gray-500">
                Last auto-saved: {new Date(lastSavedTime).toLocaleTimeString()}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Spreadsheet Workspace Main Canvas Container - Maximized Height */}
      <div className="w-full flex-1 h-[calc(100vh-140px)] min-h-[620px] bg-[#141419] rounded-2xl border border-[#2a2a34] overflow-hidden shadow-2xl relative">
        {isLoading ? (
          <div className="w-full h-full flex items-center justify-center bg-[#141419] text-gray-400">
            <div className="flex flex-col items-center space-y-3">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-medium">Loading ACCA Spreadsheet Workspace...</span>
            </div>
          </div>
        ) : (
          <div ref={hostContainerRef} className="catchy-spreadsheet-host w-full h-full">
            <ErrorBoundary
              fallbackTitle="Spreadsheet Encountered an Issue"
              fallbackMessage="A recoverable error was safely intercepted in the spreadsheet view. Click reload below to refresh the grid without losing your saved financial records."
            >
              <Workbook
                ref={workbookRef}
                data={sheetData}
                onChange={handleSheetChange}
                showToolbar={true}
                showFormulaBar={true}
                showSheetTabs={true}
                allowEdit={true}
                lang="en"
              />
            </ErrorBoundary>
          </div>
        )}
      </div>

      {/* Quick Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#1c1c24] border border-[#2e2e3a] rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Table2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">ACCA Spreadsheet Guide</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="text-gray-400 hover:text-white text-lg font-bold"
              >
                ×
              </button>
            </div>

            <div className="text-xs text-gray-300 space-y-3 leading-relaxed">
              <p>
                The Catchy ACCA Excel Workspace is powered by the open-source <strong>FortuneSheet</strong> engine, providing accurate financial calculation and official CBE examination behavior:
              </p>

              <div className="bg-[#141419] p-3 rounded-xl border border-[#2a2a34] space-y-1.5 font-mono text-[11px]">
                <div className="text-emerald-400 font-bold">Supported Formulas:</div>
                <div><code className="text-gray-200">=SUM(A1:A5)</code> — Sum of cell range</div>
                <div><code className="text-gray-200">=A1+B1</code>, <code className="text-gray-200">=A1*B1</code> — Standard arithmetic</div>
                <div><code className="text-gray-200">=IF(B8&gt;0,"Pass","Fail")</code> — Logical branching</div>
                <div><code className="text-gray-200">=AVERAGE(B2:B10)</code>, <code className="text-gray-200">=NPV(...)</code>, <code className="text-gray-200">=IRR(...)</code></div>
              </div>

              <div className="space-y-1">
                <div className="font-semibold text-white">Shortcuts & Navigation:</div>
                <ul className="list-disc list-inside space-y-0.5 text-gray-400">
                  <li><kbd className="px-1 py-0.5 bg-[#252530] rounded text-gray-200">Arrow Keys</kbd> — Move active cell</li>
                  <li><kbd className="px-1 py-0.5 bg-[#252530] rounded text-gray-200">Tab</kbd> / <kbd className="px-1 py-0.5 bg-[#252530] rounded text-gray-200">Shift+Tab</kbd> — Move right / left</li>
                  <li><kbd className="px-1 py-0.5 bg-[#252530] rounded text-gray-200">Enter</kbd> / <kbd className="px-1 py-0.5 bg-[#252530] rounded text-gray-200">Shift+Enter</kbd> — Move down / up</li>
                  <li><kbd className="px-1 py-0.5 bg-[#252530] rounded text-gray-200">Ctrl+C</kbd> / <kbd className="px-1 py-0.5 bg-[#252530] rounded text-gray-200">Ctrl+V</kbd> — Copy & paste cell ranges</li>
                  <li><kbd className="px-1 py-0.5 bg-[#252530] rounded text-gray-200">Ctrl+Z</kbd> / <kbd className="px-1 py-0.5 bg-[#252530] rounded text-gray-200">Ctrl+Y</kbd> — Undo & Redo</li>
                  <li>Workbooks auto-save continuously to local IndexedDB storage.</li>
                </ul>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs transition-colors"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
