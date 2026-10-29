import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  SpreadsheetWorkbook,
  SpreadsheetSheet,
  CellData,
  CellFormat,
  QuestionRecord,
  QualificationVersion
} from '../../types';
import {
  colIndexToLetter,
  colLetterToIndex,
  parseCellAddress,
  formatCellValue,
  recomputeSheet,
  recomputeWorkbook,
  exportSheetToCsv,
  importCsvToSheet
} from '../../utils/formulaEngine';
import { db, logActivity } from '../../db';
import {
  Table2,
  Plus,
  Trash2,
  Download,
  Upload,
  DollarSign,
  Percent,
  Bold,
  RotateCcw,
  Undo2,
  Redo2,
  Save,
  Copy,
  Check,
  CheckSquare
} from 'lucide-react';

interface SpreadsheetWorkspaceProps {
  version: QualificationVersion;
  allQuestions: QuestionRecord[];
  initialQuestionId?: string;
  initialPaperId?: string;
  onSelectQuestion?: (questionId: string) => void;
  onOpenWriter?: () => void;
}

export const SpreadsheetWorkspace: React.FC<SpreadsheetWorkspaceProps> = ({
  version,
  allQuestions,
  initialQuestionId,
  initialPaperId = 'FR',
  onSelectQuestion,
  onOpenWriter,
}) => {
  const [selectedPaperId, setSelectedPaperId] = useState<string>(initialPaperId);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>(initialQuestionId || '');

  // Workbook State
  const [workbook, setWorkbook] = useState<SpreadsheetWorkbook | null>(null);
  const [activeSheetIndex, setActiveSheetIndex] = useState<number>(0);
  const [selectedCell, setSelectedCell] = useState<string>('A1');
  const [selectionRange, setSelectionRange] = useState<{ start: string; end: string } | null>(null);
  const [isMouseDown, setIsMouseDown] = useState<boolean>(false);

  // In-cell / Formula bar editing
  const [editingFormula, setEditingFormula] = useState<string>('');
  const [isInlineEditing, setIsInlineEditing] = useState<boolean>(false);
  const [inlineValue, setInlineValue] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'dirty'>('saved');

  // Column Resizing state
  const [colWidths, setColWidths] = useState<Record<number, number>>({});
  const resizingColRef = useRef<{ colIdx: number; startX: number; startWidth: number } | null>(null);

  // History for undo/redo
  const [undoStack, setUndoStack] = useState<SpreadsheetSheet[]>([]);
  const [redoStack, setRedoStack] = useState<SpreadsheetSheet[]>([]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const formulaInputRef = useRef<HTMLInputElement | null>(null);
  const gridContainerRef = useRef<HTMLDivElement | null>(null);
  const inlineInputRef = useRef<HTMLInputElement | null>(null);

  // Load workbook from IndexedDB
  useEffect(() => {
    const loadWorkbook = async () => {
      let list = await db.spreadsheets.where('paperId').equals(selectedPaperId).toArray();

      if (selectedQuestionId) {
        list = list.filter(w => w.questionId === selectedQuestionId);
      }

      if (list.length > 0) {
        setWorkbook(list[0]);
        setActiveSheetIndex(list[0].activeSheetIndex || 0);
      } else {
        // Create initial default workbook with practical ACCA CBE template
        const initialSheet: SpreadsheetSheet = {
          id: 'sheet-1',
          name: 'Workings 1',
          cells: {
            A1: { raw: 'ACCA CBE Financial Workings Schedule', format: 'header' },
            A3: { raw: 'Line Item', format: 'bold' },
            B3: { raw: 'Amount ($)', format: 'bold' },
            A4: { raw: 'Consideration Transferred' },
            B4: { raw: '120000', format: 'currency' },
            A5: { raw: 'Fair Value of Non-Controlling Interest (NCI)' },
            B5: { raw: '30000', format: 'currency' },
            A6: { raw: 'Total Aggregate Value' },
            B6: { raw: '=SUM(B4:B5)', format: 'currency' },
            A7: { raw: 'Net Identifiable Assets Acquired' },
            B7: { raw: '110000', format: 'currency' },
            A8: { raw: 'Goodwill on Acquisition' },
            B8: { raw: '=B6-B7', format: 'currency' },
            A10: { raw: 'Status Check' },
            B10: { raw: '=IF(B8>0,"Positive Goodwill","Bargain Purchase")' }
          },
          rowCount: 35,
          colCount: 12
        };

        const initialWb: SpreadsheetWorkbook = {
          id: 'wb-' + Date.now(),
          questionId: selectedQuestionId || undefined,
          paperId: selectedPaperId,
          title: `${selectedPaperId} Workings Workbook`,
          activeSheetIndex: 0,
          sheets: [recomputeSheet(initialSheet)],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await db.spreadsheets.put(initialWb);
        setWorkbook(initialWb);
        setActiveSheetIndex(0);
      }
      setSaveStatus('saved');
    };

    loadWorkbook();
  }, [selectedPaperId, selectedQuestionId]);

  const activeSheet = workbook?.sheets[activeSheetIndex] || {
    id: 'sheet-empty',
    name: 'Workings 1',
    cells: {},
    rowCount: 35,
    colCount: 12
  };

  // Sync active cell raw text with formula bar & inline value
  useEffect(() => {
    const rawVal = activeSheet.cells[selectedCell]?.raw || '';
    setEditingFormula(rawVal);
    setInlineValue(rawVal);
  }, [selectedCell, activeSheet]);

  // Focus inline editor when activated
  useEffect(() => {
    if (isInlineEditing) {
      inlineInputRef.current?.focus();
    }
  }, [isInlineEditing]);

  // Push state to undo stack
  const pushUndoState = () => {
    setUndoStack(prev => [...prev.slice(-20), activeSheet]);
    setRedoStack([]);
  };

  const handleUndo = () => {
    if (undoStack.length === 0 || !workbook) return;
    const prev = undoStack[undoStack.length - 1];
    setRedoStack(r => [...r, activeSheet]);
    setUndoStack(u => u.slice(0, -1));

    const updatedSheets = [...workbook.sheets];
    updatedSheets[activeSheetIndex] = prev;
    const updatedWb = { ...workbook, sheets: updatedSheets };
    setWorkbook(updatedWb);
    db.spreadsheets.put(updatedWb);
  };

  const handleRedo = () => {
    if (redoStack.length === 0 || !workbook) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack(u => [...u, activeSheet]);
    setRedoStack(r => r.slice(0, -1));

    const updatedSheets = [...workbook.sheets];
    updatedSheets[activeSheetIndex] = next;
    const updatedWb = { ...workbook, sheets: updatedSheets };
    setWorkbook(updatedWb);
    db.spreadsheets.put(updatedWb);
  };

  // Update cell value
  const updateCellValue = async (cellAddr: string, newRaw: string) => {
    if (!workbook) return;
    pushUndoState();
    setSaveStatus('saving');

    const updatedCells: Record<string, CellData> = {
      ...activeSheet.cells,
      [cellAddr]: {
        ...(activeSheet.cells[cellAddr] || {}),
        raw: newRaw
      }
    };

    const updatedSheets = [...workbook.sheets];
    updatedSheets[activeSheetIndex] = {
      ...activeSheet,
      cells: updatedCells
    };

    const updatedWb: SpreadsheetWorkbook = recomputeWorkbook({
      ...workbook,
      sheets: updatedSheets,
      updatedAt: new Date().toISOString()
    });

    setWorkbook(updatedWb);
    await db.spreadsheets.put(updatedWb);
    setSaveStatus('saved');
  };

  // Keyboard Navigation & Editing Handler
  const handleKeyDown = useCallback(
    async (e: React.KeyboardEvent) => {
      if (isInlineEditing) return; // Allow normal typing in inline input

      const parsed = parseCellAddress(selectedCell);
      if (!parsed) return;

      const { col, row } = parsed;

      // Copy: Ctrl+C / Cmd+C
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        const rawVal = activeSheet.cells[selectedCell]?.raw || '';
        navigator.clipboard.writeText(rawVal);
        return;
      }

      // Paste: Ctrl+V / Cmd+V
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        try {
          const text = await navigator.clipboard.readText();
          if (text) {
            const rows = text.split(/\r?\n/).filter(r => r.length > 0);
            if (rows.length === 1 && !rows[0].includes('\t')) {
              await updateCellValue(selectedCell, rows[0]);
            } else {
              // Multi-cell tabular paste
              pushUndoState();
              const newCells = { ...activeSheet.cells };
              for (let rOffset = 0; rOffset < rows.length; rOffset++) {
                const cols = rows[rOffset].split('\t');
                for (let cOffset = 0; cOffset < cols.length; cOffset++) {
                  const targetColLetter = colIndexToLetter(col + cOffset);
                  const targetAddr = `${targetColLetter}${row + rOffset + 1}`;
                  newCells[targetAddr] = {
                    ...(newCells[targetAddr] || {}),
                    raw: cols[cOffset]
                  };
                }
              }
              const updatedSheets = [...workbook!.sheets];
              updatedSheets[activeSheetIndex] = { ...activeSheet, cells: newCells };
              const updatedWb = recomputeWorkbook({ ...workbook!, sheets: updatedSheets });
              setWorkbook(updatedWb);
              await db.spreadsheets.put(updatedWb);
            }
          }
        } catch (err) {
          console.warn('Clipboard read error:', err);
        }
        return;
      }

      // Undo: Ctrl+Z / Cmd+Z
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
        return;
      }

      // Arrow navigation
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (row > 0) setSelectedCell(`${colIndexToLetter(col)}${row}`);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (row < activeSheet.rowCount - 1) setSelectedCell(`${colIndexToLetter(col)}${row + 2}`);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (col > 0) setSelectedCell(`${colIndexToLetter(col - 1)}${row + 1}`);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (col < activeSheet.colCount - 1) setSelectedCell(`${colIndexToLetter(col + 1)}${row + 1}`);
      } else if (e.key === 'Tab') {
        e.preventDefault();
        if (e.shiftKey) {
          if (col > 0) setSelectedCell(`${colIndexToLetter(col - 1)}${row + 1}`);
        } else {
          if (col < activeSheet.colCount - 1) setSelectedCell(`${colIndexToLetter(col + 1)}${row + 1}`);
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        setIsInlineEditing(true);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        updateCellValue(selectedCell, '');
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Direct typing into selected cell: activate inline editing and set initial character
        setIsInlineEditing(true);
        setInlineValue(e.key);
      }
    },
    [selectedCell, activeSheet, isInlineEditing, workbook, activeSheetIndex]
  );

  // Apply format to selected cell
  const handleApplyFormat = async (format: CellFormat) => {
    if (!workbook) return;
    pushUndoState();

    const existing = activeSheet.cells[selectedCell] || { raw: '' };
    const updatedCells = {
      ...activeSheet.cells,
      [selectedCell]: {
        ...existing,
        format: existing.format === format ? 'general' : format
      }
    };

    const recomputed = recomputeSheet({
      ...activeSheet,
      cells: updatedCells
    });

    const updatedSheets = [...workbook.sheets];
    updatedSheets[activeSheetIndex] = recomputed;
    const updatedWb = { ...workbook, sheets: updatedSheets };

    setWorkbook(updatedWb);
    await db.spreadsheets.put(updatedWb);
  };

  // Add worksheet
  const handleAddSheet = async () => {
    if (!workbook) return;
    pushUndoState();

    const newIndex = workbook.sheets.length + 1;
    const newSheet: SpreadsheetSheet = {
      id: 'sheet-' + Date.now(),
      name: `Sheet ${newIndex}`,
      cells: {},
      rowCount: 35,
      colCount: 12
    };

    const updatedSheets = [...workbook.sheets, newSheet];
    const updatedWb: SpreadsheetWorkbook = {
      ...workbook,
      sheets: updatedSheets,
      activeSheetIndex: updatedSheets.length - 1
    };

    setWorkbook(updatedWb);
    setActiveSheetIndex(updatedSheets.length - 1);
    setSelectedCell('A1');
    await db.spreadsheets.put(updatedWb);
  };

  // Rename worksheet
  const handleRenameSheet = async (index: number) => {
    if (!workbook) return;
    const currentName = workbook.sheets[index].name;
    const newName = window.prompt('Enter new worksheet name:', currentName);
    if (!newName || newName.trim() === '' || newName === currentName) return;

    pushUndoState();
    const updatedSheets = [...workbook.sheets];
    updatedSheets[index] = { ...updatedSheets[index], name: newName.trim() };
    const updatedWb = { ...workbook, sheets: updatedSheets };

    setWorkbook(updatedWb);
    await db.spreadsheets.put(updatedWb);
  };

  // Delete worksheet
  const handleDeleteSheet = async (index: number) => {
    if (!workbook || workbook.sheets.length <= 1) {
      alert('A workbook must have at least one worksheet.');
      return;
    }
    if (!window.confirm(`Delete worksheet "${workbook.sheets[index].name}"?`)) return;

    pushUndoState();
    const updatedSheets = workbook.sheets.filter((_, i) => i !== index);
    const updatedWb: SpreadsheetWorkbook = {
      ...workbook,
      sheets: updatedSheets,
      activeSheetIndex: Math.min(activeSheetIndex, updatedSheets.length - 1)
    };

    setWorkbook(updatedWb);
    setActiveSheetIndex(Math.min(activeSheetIndex, updatedSheets.length - 1));
    await db.spreadsheets.put(updatedWb);
  };

  // Column Resizing mouse handlers
  const handleResizeMouseDown = (colIdx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const currentWidth = colWidths[colIdx] || 110;
    resizingColRef.current = { colIdx, startX: e.clientX, startWidth: currentWidth };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!resizingColRef.current) return;
      const delta = moveEvent.clientX - resizingColRef.current.startX;
      const newWidth = Math.max(50, resizingColRef.current.startWidth + delta);
      setColWidths(prev => ({ ...prev, [resizingColRef.current!.colIdx]: newWidth }));
    };

    const handleMouseUp = () => {
      resizingColRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Export CSV
  const handleExportCsv = () => {
    const csv = exportSheetToCsv(activeSheet);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeSheet.name.replace(/\s+/g, '_')}_workings.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Import CSV
  const handleImportCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !workbook) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        pushUndoState();
        const importedSheet = importCsvToSheet(content, file.name.replace('.csv', ''));
        const updatedSheets = [...workbook.sheets, importedSheet];
        const updatedWb = {
          ...workbook,
          sheets: updatedSheets,
          activeSheetIndex: updatedSheets.length - 1
        };
        setWorkbook(updatedWb);
        setActiveSheetIndex(updatedSheets.length - 1);
        await db.spreadsheets.put(updatedWb);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-4">
      {/* Top Header / Ribbon */}
      <div className="bg-[#1e1e24] p-4 rounded-2xl border border-[#2a2a34] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Table2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              ACCA Spreadsheet Workspace
              <span className="text-[11px] font-semibold bg-[#141419] text-emerald-400 px-2 py-0.5 rounded-md border border-[#2a2a34]">
                Financial Calculation Grid
              </span>
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              CBE exam spreadsheet simulator with live financial formulas (NPV, IRR, PMT), multi-cell editing, and auto-save
            </p>
          </div>
        </div>

        {/* Paper & Question selector */}
        <div className="flex items-center space-x-2">
          <select
            value={selectedPaperId}
            onChange={e => {
              setSelectedPaperId(e.target.value);
              setSelectedQuestionId('');
            }}
            className="bg-[#141419] border border-[#2a2a34] rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-acca-red font-bold"
          >
            {version.papers.map(p => (
              <option key={p.id} value={p.id}>
                {p.id} — {p.name}
              </option>
            ))}
          </select>

          {allQuestions.length > 0 && (
            <select
              value={selectedQuestionId}
              onChange={e => setSelectedQuestionId(e.target.value)}
              className="bg-[#141419] border border-[#2a2a34] rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-acca-red max-w-[200px] truncate"
            >
              <option value="">Standalone Workbook</option>
              {allQuestions
                .filter(q => q.paperId === selectedPaperId)
                .map(q => (
                  <option key={q.id} value={q.id}>
                    {q.questionNumber}: {q.title}
                  </option>
                ))}
            </select>
          )}
        </div>
      </div>

      {/* Spreadsheet Main Container */}
      <div
        ref={gridContainerRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="bg-[#1e1e24] rounded-2xl border border-[#2a2a34] overflow-hidden flex flex-col shadow-xl outline-none focus:border-[#404050]"
      >
        {/* Toolbar & Formula Bar */}
        <div className="p-3 bg-[#18181e] border-b border-[#2a2a34] space-y-2 select-none">
          {/* Action pills */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-1.5">
              {/* Undo / Redo */}
              <button
                type="button"
                onClick={handleUndo}
                disabled={undoStack.length === 0}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#25252e] disabled:opacity-25"
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleRedo}
                disabled={redoStack.length === 0}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#25252e] disabled:opacity-25"
                title="Redo (Ctrl+Shift+Z)"
              >
                <Redo2 className="w-4 h-4" />
              </button>

              <span className="w-px h-4 bg-[#2a2a34] mx-1" />

              {/* Formatting buttons */}
              <button
                type="button"
                onClick={() => handleApplyFormat('bold')}
                className={`p-1.5 rounded-lg font-bold transition-colors ${
                  activeSheet.cells[selectedCell]?.format === 'bold'
                    ? 'bg-acca-red text-white'
                    : 'text-gray-400 hover:text-white hover:bg-[#25252e]'
                }`}
                title="Bold"
              >
                <Bold className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => handleApplyFormat('currency')}
                className={`p-1.5 rounded-lg font-bold transition-colors ${
                  activeSheet.cells[selectedCell]?.format === 'currency'
                    ? 'bg-acca-red text-white'
                    : 'text-gray-400 hover:text-white hover:bg-[#25252e]'
                }`}
                title="Format Currency ($)"
              >
                <DollarSign className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => handleApplyFormat('percent')}
                className={`p-1.5 rounded-lg font-bold transition-colors ${
                  activeSheet.cells[selectedCell]?.format === 'percent'
                    ? 'bg-acca-red text-white'
                    : 'text-gray-400 hover:text-white hover:bg-[#25252e]'
                }`}
                title="Format Percentage (%)"
              >
                <Percent className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => handleApplyFormat('header')}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors ${
                  activeSheet.cells[selectedCell]?.format === 'header'
                    ? 'bg-acca-red text-white'
                    : 'text-gray-400 hover:text-white hover:bg-[#25252e]'
                }`}
                title="Header Style"
              >
                Header
              </button>
            </div>

            {/* Save & CSV Actions */}
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-semibold text-gray-500">
                {saveStatus === 'saving' ? 'Saving...' : 'Autosaved'}
              </span>

              <button
                type="button"
                onClick={handleExportCsv}
                className="px-2.5 py-1 text-xs text-gray-300 hover:text-white bg-[#141419] hover:bg-[#25252e] border border-[#2a2a34] rounded-lg flex items-center space-x-1"
                title="Export Sheet to CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>

              <input
                type="file"
                ref={fileInputRef}
                accept=".csv,text/csv"
                onChange={handleImportCsv}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1 text-xs text-gray-300 hover:text-white bg-[#141419] hover:bg-[#25252e] border border-[#2a2a34] rounded-lg flex items-center space-x-1"
                title="Import CSV into new sheet"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import CSV</span>
              </button>
            </div>
          </div>

          {/* Formula Bar fx */}
          <div className="flex items-center space-x-2 bg-[#141419] border border-[#2a2a34] rounded-xl px-3 py-1.5">
            <span className="font-mono font-bold text-white text-xs w-12 text-center select-none border-r border-[#2a2a34] pr-2">
              {selectedCell}
            </span>
            <span className="text-gray-500 font-mono font-bold text-xs select-none">
              fx
            </span>
            <input
              ref={formulaInputRef}
              type="text"
              value={editingFormula}
              onChange={e => setEditingFormula(e.target.value)}
              onBlur={() => updateCellValue(selectedCell, editingFormula)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  updateCellValue(selectedCell, editingFormula);
                  formulaInputRef.current?.blur();
                  gridContainerRef.current?.focus();
                }
              }}
              placeholder="Enter value or formula e.g. =SUM(A1:A5), =A1+B1, =IF(A1>100,'Pass','Fail'), =SUM(B2:B10)*10%, =NPV(0.1, B6:B9)..."
              className="flex-1 font-mono text-xs text-white bg-transparent outline-none placeholder-gray-600"
            />
          </div>
        </div>

        {/* Scrollable Spreadsheet Table Grid */}
        <div className="overflow-auto max-h-[540px] relative border-b border-[#2a2a34] bg-[#141419]">
          <table className="border-collapse table-fixed text-xs font-mono select-none min-w-full">
            <thead>
              <tr className="bg-[#18181e] text-gray-400 sticky top-0 z-20">
                <th className="w-12 h-7 border border-[#2a2a34] bg-[#1a1a20] text-center text-[10px] font-bold text-gray-500" />
                {Array.from({ length: activeSheet.colCount }).map((_, cIdx) => {
                  const width = colWidths[cIdx] || 110;
                  return (
                    <th
                      key={cIdx}
                      style={{ width: `${width}px`, minWidth: `${width}px` }}
                      className="h-7 border border-[#2a2a34] px-2 font-bold text-center text-gray-300 relative group"
                    >
                      {colIndexToLetter(cIdx)}
                      {/* Resize Handle */}
                      <div
                        onMouseDown={e => handleResizeMouseDown(cIdx, e)}
                        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-acca-red group-hover:bg-[#353542]"
                      />
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: activeSheet.rowCount }).map((_, rIdx) => {
                const rowNum = rIdx + 1;
                return (
                  <tr key={rowNum} className="hover:bg-[#1a1a22]">
                    {/* Row Header */}
                    <td className="w-12 h-7 border border-[#2a2a34] bg-[#18181e] text-center font-bold text-[10px] text-gray-500 sticky left-0 z-10">
                      {rowNum}
                    </td>

                    {/* Data Cells */}
                    {Array.from({ length: activeSheet.colCount }).map((_, cIdx) => {
                      const addr = `${colIndexToLetter(cIdx)}${rowNum}`;
                      const cell = activeSheet.cells[addr];
                      const isSelected = selectedCell === addr;
                      const formattedDisplay = formatCellValue(
                        cell?.computed !== undefined ? cell.computed : cell?.raw,
                        cell?.format
                      );

                      return (
                        <td
                          key={addr}
                          onClick={() => {
                            setSelectedCell(addr);
                            setIsInlineEditing(false);
                          }}
                          onDoubleClick={() => {
                            setSelectedCell(addr);
                            setIsInlineEditing(true);
                            setInlineValue(cell?.raw || '');
                          }}
                          className={`h-7 border border-[#2a2a34] px-2 text-right truncate text-xs transition-colors cursor-cell relative ${
                            isSelected
                              ? 'bg-acca-red/10 ring-2 ring-acca-red ring-inset z-10 text-white'
                              : 'text-gray-300 hover:bg-[#1f1f28]'
                          } ${
                            cell?.format === 'bold' || cell?.format === 'header'
                              ? 'font-bold text-white bg-[#1a1a22]'
                              : ''
                          }`}
                        >
                          {isSelected && isInlineEditing ? (
                            <input
                              ref={inlineInputRef}
                              type="text"
                              value={inlineValue}
                              onChange={e => setInlineValue(e.target.value)}
                              onBlur={() => {
                                setIsInlineEditing(false);
                                updateCellValue(addr, inlineValue);
                              }}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  setIsInlineEditing(false);
                                  updateCellValue(addr, inlineValue);
                                  // Move to row below
                                  if (rIdx < activeSheet.rowCount - 1) {
                                    setSelectedCell(`${colIndexToLetter(cIdx)}${rowNum + 1}`);
                                  }
                                } else if (e.key === 'Escape') {
                                  setIsInlineEditing(false);
                                  setInlineValue(cell?.raw || '');
                                }
                              }}
                              className="absolute inset-0 w-full h-full bg-[#18181e] text-white px-2 text-right font-mono text-xs outline-none border border-acca-red"
                            />
                          ) : (
                            formattedDisplay
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Bottom Worksheet Tabs Bar */}
        <div className="bg-[#18181e] border-t border-[#2a2a34] px-4 py-2 flex items-center justify-between text-xs select-none">
          <div className="flex items-center space-x-1.5 overflow-x-auto">
            {workbook?.sheets.map((sheet, idx) => (
              <div key={sheet.id} className="flex items-center group">
                <button
                  type="button"
                  onClick={() => {
                    setActiveSheetIndex(idx);
                    setSelectedCell('A1');
                  }}
                  onDoubleClick={() => handleRenameSheet(idx)}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center space-x-1.5 ${
                    idx === activeSheetIndex
                      ? 'bg-acca-red text-white shadow-xs'
                      : 'bg-[#141419] border border-[#2a2a34] text-gray-400 hover:text-white hover:bg-[#25252e]'
                  }`}
                >
                  <span>{sheet.name}</span>
                </button>

                {workbook.sheets.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleDeleteSheet(idx)}
                    className="p-1 text-gray-500 hover:text-rose-400 rounded opacity-0 group-hover:opacity-100 transition-opacity ml-0.5"
                    title={`Delete sheet ${sheet.name}`}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={handleAddSheet}
              className="p-1.5 rounded-xl bg-[#141419] border border-[#2a2a34] text-gray-400 hover:text-white hover:bg-[#25252e] transition-colors"
              title="Add Worksheet"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="text-[11px] text-gray-400">
            Active: <strong className="text-white font-mono">{selectedCell}</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
