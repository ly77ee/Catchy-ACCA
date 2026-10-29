import React, { useState, useEffect, useRef } from 'react';
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
  Calculator,
  RotateCcw,
  Undo2,
  Redo2,
  FileSpreadsheet,
  Save,
  Copy,
  Check,
  ChevronRight
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
  const [editingFormula, setEditingFormula] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'dirty'>('saved');

  // History for undo/redo
  const [undoStack, setUndoStack] = useState<SpreadsheetSheet[]>([]);
  const [redoStack, setRedoStack] = useState<SpreadsheetSheet[]>([]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const formulaInputRef = useRef<HTMLInputElement | null>(null);

  // Load workbook from IndexedDB
  useEffect(() => {
    const loadWorkbook = async () => {
      let query = db.spreadsheets.where('paperId').equals(selectedPaperId);
      let list = await query.toArray();

      if (selectedQuestionId) {
        list = list.filter(w => w.questionId === selectedQuestionId);
      }

      if (list.length > 0) {
        setWorkbook(list[0]);
        setActiveSheetIndex(list[0].activeSheetIndex || 0);
      } else {
        // Create initial default workbook
        const initialSheet: SpreadsheetSheet = {
          id: 'sheet-1',
          name: 'Workings 1',
          cells: {
            A1: { raw: 'ACC A CBE Workings Schedule', format: 'header' },
            A3: { raw: 'Item' },
            B3: { raw: 'Amount ($)', format: 'header' },
            A4: { raw: 'Consideration Transferred' },
            B4: { raw: '120000', format: 'currency' },
            A5: { raw: 'Fair Value of NCI' },
            B5: { raw: '30000', format: 'currency' },
            A6: { raw: 'Total Value' },
            B6: { raw: '=SUM(B4:B5)', format: 'currency' },
            A7: { raw: 'Net Assets Acquired' },
            B7: { raw: '110000', format: 'currency' },
            A8: { raw: 'Goodwill at Acquisition' },
            B8: { raw: '=B6-B7', format: 'currency' },
          },
          rowCount: 30,
          colCount: 10
        };

        const initialWb: SpreadsheetWorkbook = {
          id: 'wb-' + Date.now(),
          questionId: selectedQuestionId || undefined,
          paperId: selectedPaperId,
          title: `${selectedPaperId} Financial Workings`,
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
    name: 'Workings',
    cells: {},
    rowCount: 25,
    colCount: 8
  };

  // Sync active cell raw text with formula bar
  useEffect(() => {
    const rawVal = activeSheet.cells[selectedCell]?.raw || '';
    setEditingFormula(rawVal);
  }, [selectedCell, activeSheet]);

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

  // Insert financial statement template
  const handleApplyTemplate = async (templateName: string) => {
    if (!workbook) return;
    if (!window.confirm(`Apply "${templateName}" template to current worksheet? (Will replace current sheet data)`)) {
      return;
    }

    pushUndoState();
    let templateCells: Record<string, CellData> = {};

    if (templateName === 'npv') {
      templateCells = {
        A1: { raw: 'Investment Appraisal — Net Present Value (NPV)', format: 'header' },
        A3: { raw: 'Discount Rate' },
        B3: { raw: '0.10', format: 'percent' },
        A5: { raw: 'Year', format: 'header' },
        B5: { raw: 'Cash Flow ($)', format: 'header' },
        C5: { raw: 'Discount Factor', format: 'header' },
        D5: { raw: 'Present Value ($)', format: 'header' },
        A6: { raw: '0' },
        B6: { raw: '-100000', format: 'currency' },
        C6: { raw: '1.000', format: 'number' },
        D6: { raw: '=B6*C6', format: 'currency' },
        A7: { raw: '1' },
        B7: { raw: '35000', format: 'currency' },
        C7: { raw: '=ROUND(1/(1+$B$3)^A7, 3)', format: 'number' },
        D7: { raw: '=B7*C7', format: 'currency' },
        A8: { raw: '2' },
        B8: { raw: '45000', format: 'currency' },
        C8: { raw: '=ROUND(1/(1+$B$3)^A8, 3)', format: 'number' },
        D8: { raw: '=B8*C8', format: 'currency' },
        A9: { raw: '3' },
        B9: { raw: '50000', format: 'currency' },
        C9: { raw: '=ROUND(1/(1+$B$3)^A9, 3)', format: 'number' },
        D9: { raw: '=B9*C9', format: 'currency' },
        A11: { raw: 'Net Present Value (NPV)' },
        D11: { raw: '=SUM(D6:D9)', format: 'currency' },
      };
    } else if (templateName === 'balance_sheet') {
      templateCells = {
        A1: { raw: 'Statement of Financial Position (Balance Sheet)', format: 'header' },
        A3: { raw: 'Non-Current Assets', format: 'header' },
        B3: { raw: 'Amount ($)', format: 'header' },
        A4: { raw: 'Property, Plant & Equipment' },
        B4: { raw: '240000', format: 'currency' },
        A5: { raw: 'Goodwill on Acquisition' },
        B5: { raw: '40000', format: 'currency' },
        A6: { raw: 'Total Non-Current Assets' },
        B6: { raw: '=SUM(B4:B5)', format: 'currency' },
        A8: { raw: 'Current Assets', format: 'header' },
        A9: { raw: 'Inventories' },
        B9: { raw: '32000', format: 'currency' },
        A10: { raw: 'Trade Receivables' },
        B10: { raw: '45000', format: 'currency' },
        A11: { raw: 'Cash & Cash Equivalents' },
        B11: { raw: '18000', format: 'currency' },
        A12: { raw: 'Total Current Assets' },
        B12: { raw: '=SUM(B9:B11)', format: 'currency' },
        A14: { raw: 'Total Assets' },
        B14: { raw: '=B6+B12', format: 'currency' },
      };
    }

    const newSheet = recomputeSheet({
      ...activeSheet,
      cells: templateCells,
      rowCount: 30,
      colCount: 10
    });

    const updatedSheets = [...workbook.sheets];
    updatedSheets[activeSheetIndex] = newSheet;
    const updatedWb = { ...workbook, sheets: updatedSheets };
    setWorkbook(updatedWb);
    await db.spreadsheets.put(updatedWb);
    await logActivity('Spreadsheet Template Applied', `Applied ${templateName} template`, 'workspace');
  };

  // Add new sheet
  const handleAddSheet = async () => {
    if (!workbook) return;
    const nextIdx = workbook.sheets.length + 1;
    const newSheet: SpreadsheetSheet = {
      id: 'sheet-' + Date.now(),
      name: `Sheet ${nextIdx}`,
      cells: {},
      rowCount: 30,
      colCount: 10
    };

    const updatedWb: SpreadsheetWorkbook = {
      ...workbook,
      sheets: [...workbook.sheets, newSheet],
      activeSheetIndex: workbook.sheets.length,
      updatedAt: new Date().toISOString()
    };

    setWorkbook(updatedWb);
    setActiveSheetIndex(workbook.sheets.length);
    await db.spreadsheets.put(updatedWb);
  };

  // Export CSV
  const handleExportCsv = () => {
    const csvData = exportSheetToCsv(activeSheet);
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `catchy-acca-${selectedPaperId}-${activeSheet.name.replace(/\s+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import CSV
  const handleImportCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !workbook) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const imported = importCsvToSheet(text, file.name.replace(/\.csv$/i, ''));
        const updatedWb: SpreadsheetWorkbook = {
          ...workbook,
          sheets: [...workbook.sheets, imported],
          activeSheetIndex: workbook.sheets.length,
          updatedAt: new Date().toISOString()
        };
        setWorkbook(updatedWb);
        setActiveSheetIndex(workbook.sheets.length);
        await db.spreadsheets.put(updatedWb);
        alert(`Successfully imported "${file.name}" as a new worksheet!`);
      } catch (err: any) {
        alert('Failed to parse CSV file: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  // Keyboard navigation across grid
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isEditing) {
      if (e.key === 'Enter') {
        setIsEditing(false);
        updateCellValue(selectedCell, editingFormula);
      } else if (e.key === 'Escape') {
        setIsEditing(false);
        setEditingFormula(activeSheet.cells[selectedCell]?.raw || '');
      }
      return;
    }

    const coord = activeSheet.cells[selectedCell] ? selectedCell : 'A1';
    const colMatch = coord.match(/^([A-Z]+)(\d+)$/);
    if (!colMatch) return;

    let colLetter = colMatch[1];
    let rowNum = parseInt(colMatch[2], 10);
    let colIdx = colLetter.charCodeAt(0) - 65;

    if (e.key === 'ArrowUp' && rowNum > 1) {
      e.preventDefault();
      setSelectedCell(`${colLetter}${rowNum - 1}`);
    } else if (e.key === 'ArrowDown' && rowNum < activeSheet.rowCount) {
      e.preventDefault();
      setSelectedCell(`${colLetter}${rowNum + 1}`);
    } else if (e.key === 'ArrowLeft' && colIdx > 0) {
      e.preventDefault();
      setSelectedCell(`${colIndexToLetter(colIdx - 1)}${rowNum}`);
    } else if (e.key === 'ArrowRight' && colIdx < activeSheet.colCount - 1) {
      e.preventDefault();
      setSelectedCell(`${colIndexToLetter(colIdx + 1)}${rowNum}`);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      setIsEditing(true);
      formulaInputRef.current?.focus();
    }
  };

  const paperQuestions = allQuestions.filter(q => q.paperId === selectedPaperId);
  const selectedQuestion = allQuestions.find(q => q.id === selectedQuestionId);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Bar */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-acca-red bg-red-50 px-2.5 py-0.5 rounded-full">
              Financial Calculation Engine
            </span>
            <span className="text-xs text-gray-400">ACCA CBE Spreadsheet Specs</span>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 mt-1">
            Excel Spreadsheet Workspace
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Full formula arithmetic, ranges, financial functions (SUM, NPV, IRR, PMT, IF), multi-sheet workbooks, and CSV exchange.
          </p>
        </div>

        {/* Paper & Question Selectors */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedPaperId}
            onChange={(e) => {
              setSelectedPaperId(e.target.value);
              setSelectedQuestionId('');
            }}
            className="text-xs font-bold border border-gray-300 rounded-xl px-3 py-2 bg-white text-gray-900 outline-none focus:border-acca-red"
          >
            {version.papers.map(p => (
              <option key={p.id} value={p.id}>{p.id} — {p.name}</option>
            ))}
          </select>

          <select
            value={selectedQuestionId}
            onChange={(e) => setSelectedQuestionId(e.target.value)}
            className="text-xs font-medium border border-gray-300 rounded-xl px-3 py-2 bg-white text-gray-700 outline-none focus:border-acca-red max-w-xs truncate"
          >
            <option value="">General Workings (No linked question)</option>
            {paperQuestions.map(q => (
              <option key={q.id} value={q.id}>
                {q.questionNumber}: {q.title}
              </option>
            ))}
          </select>

          {onOpenWriter && (
            <button
              onClick={onOpenWriter}
              className="text-xs font-bold bg-neutral-900 hover:bg-black text-white px-3 py-2 rounded-xl transition-colors"
            >
              Open Answer Writer
            </button>
          )}
        </div>
      </div>

      {/* Main Grid Container */}
      <div
        className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden flex flex-col"
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        {/* Toolbar & Formula Bar */}
        <div className="bg-gray-50 border-b border-gray-200 p-2.5 space-y-2 select-none">
          {/* Top Button Ribbon */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={handleUndo}
                disabled={undoStack.length === 0}
                className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30 text-gray-700"
                title="Undo"
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleRedo}
                disabled={redoStack.length === 0}
                className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30 text-gray-700"
                title="Redo"
              >
                <Redo2 className="w-4 h-4" />
              </button>

              <span className="w-px h-5 bg-gray-300 mx-1" />

              {/* Number formatting pills */}
              <button
                type="button"
                onClick={() => handleApplyFormat('currency')}
                className={`p-1.5 rounded font-bold transition-colors ${
                  activeSheet.cells[selectedCell]?.format === 'currency'
                    ? 'bg-neutral-900 text-white'
                    : 'hover:bg-gray-200 text-gray-700'
                }`}
                title="Format Currency ($)"
              >
                <DollarSign className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => handleApplyFormat('percent')}
                className={`p-1.5 rounded font-bold transition-colors ${
                  activeSheet.cells[selectedCell]?.format === 'percent'
                    ? 'bg-neutral-900 text-white'
                    : 'hover:bg-gray-200 text-gray-700'
                }`}
                title="Format Percentage (%)"
              >
                <Percent className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => handleApplyFormat('bold')}
                className={`p-1.5 rounded font-bold transition-colors ${
                  activeSheet.cells[selectedCell]?.format === 'bold'
                    ? 'bg-neutral-900 text-white'
                    : 'hover:bg-gray-200 text-gray-700'
                }`}
                title="Bold"
              >
                <Bold className="w-4 h-4" />
              </button>

              <span className="w-px h-5 bg-gray-300 mx-1" />

              {/* Template Presets */}
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleApplyTemplate(e.target.value);
                    e.target.value = '';
                  }
                }}
                className="text-xs font-semibold bg-white border border-gray-300 rounded-lg px-2 py-1 text-gray-700 outline-none"
              >
                <option value="">ACCA Layout Templates...</option>
                <option value="npv">Investment Appraisal (NPV & Cash Flows)</option>
                <option value="balance_sheet">Statement of Financial Position (Balance Sheet)</option>
              </select>
            </div>

            {/* CSV Import / Export */}
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-bold text-gray-400">
                {saveStatus === 'saving' ? 'Saving...' : 'Autosaved'}
              </span>

              <button
                type="button"
                onClick={handleExportCsv}
                className="p-1.5 text-gray-700 hover:bg-gray-200 rounded flex items-center space-x-1 font-semibold"
                title="Export Sheet to CSV"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export CSV</span>
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
                className="p-1.5 text-gray-700 hover:bg-gray-200 rounded flex items-center space-x-1 font-semibold"
                title="Import CSV into new sheet"
              >
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline">Import CSV</span>
              </button>
            </div>
          </div>

          {/* Formula Bar fx */}
          <div className="flex items-center space-x-2 bg-white border border-gray-300 rounded-xl px-3 py-1.5">
            <span className="font-bold text-gray-700 text-xs w-10 text-center select-none border-r border-gray-200 pr-2">
              {selectedCell}
            </span>
            <span className="text-gray-400 font-mono font-bold text-xs select-none">
              fx
            </span>
            <input
              ref={formulaInputRef}
              type="text"
              value={editingFormula}
              onChange={(e) => setEditingFormula(e.target.value)}
              onFocus={() => setIsEditing(true)}
              onBlur={() => {
                setIsEditing(false);
                updateCellValue(selectedCell, editingFormula);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  formulaInputRef.current?.blur();
                }
              }}
              placeholder="Enter value or formula e.g. =SUM(A1:A5), =NPV(0.1, B6:B9)..."
              className="flex-1 font-mono text-xs text-gray-900 outline-none"
            />
          </div>
        </div>

        {/* Scrollable Spreadsheet Grid */}
        <div className="overflow-auto max-h-[520px] relative border-b border-gray-200">
          <table className="border-collapse table-fixed text-xs font-sans select-none min-w-full">
            <thead>
              <tr className="bg-gray-100 text-gray-600 sticky top-0 z-20">
                <th className="w-12 h-7 border border-gray-300 bg-gray-200 text-center text-[10px] font-bold" />
                {Array.from({ length: activeSheet.colCount }).map((_, cIdx) => (
                  <th
                    key={cIdx}
                    className="min-w-[110px] h-7 border border-gray-300 px-2 font-bold text-center text-gray-700"
                  >
                    {colIndexToLetter(cIdx)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: activeSheet.rowCount }).map((_, rIdx) => {
                const rowNum = rIdx + 1;
                return (
                  <tr key={rowNum} className="hover:bg-gray-50/40">
                    {/* Row Header */}
                    <td className="w-12 h-7 border border-gray-300 bg-gray-100 text-center font-bold text-[10px] text-gray-500 sticky left-0 z-10">
                      {rowNum}
                    </td>

                    {/* Data Cells */}
                    {Array.from({ length: activeSheet.colCount }).map((_, cIdx) => {
                      const addr = `${colIndexToLetter(cIdx)}${rowNum}`;
                      const cell = activeSheet.cells[addr];
                      const isSelected = selectedCell === addr;
                      const formattedDisplay = formatCellValue(cell?.computed !== undefined ? cell.computed : cell?.raw, cell?.format);

                      return (
                        <td
                          key={addr}
                          onClick={() => setSelectedCell(addr)}
                          onDoubleClick={() => {
                            setSelectedCell(addr);
                            setIsEditing(true);
                            formulaInputRef.current?.focus();
                          }}
                          className={`h-7 border border-gray-300 px-2 text-right font-mono truncate text-xs transition-colors cursor-cell ${
                            isSelected
                              ? 'bg-blue-50/60 ring-2 ring-blue-600 ring-inset z-10'
                              : 'bg-white hover:bg-gray-50'
                          } ${
                            cell?.format === 'bold' || cell?.format === 'header'
                              ? 'font-bold text-gray-900 bg-gray-50/50'
                              : 'text-gray-800'
                          }`}
                        >
                          {formattedDisplay}
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
        <div className="bg-gray-100 border-t border-gray-200 px-3 py-2 flex items-center justify-between text-xs select-none">
          <div className="flex items-center space-x-1 overflow-x-auto">
            {workbook?.sheets.map((sheet, idx) => (
              <button
                key={sheet.id}
                type="button"
                onClick={() => {
                  setActiveSheetIndex(idx);
                  setSelectedCell('A1');
                }}
                className={`px-3 py-1 rounded-t-lg font-bold border-t border-x text-xs transition-all ${
                  idx === activeSheetIndex
                    ? 'bg-white border-gray-300 text-gray-900 shadow-xs'
                    : 'bg-gray-200 border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                {sheet.name}
              </button>
            ))}

            <button
              type="button"
              onClick={handleAddSheet}
              className="p-1 rounded text-gray-500 hover:text-gray-900 hover:bg-gray-200 transition-colors ml-1"
              title="Add Worksheet"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <span className="text-[11px] text-gray-500">
            Selected Cell: <strong>{selectedCell}</strong>
          </span>
        </div>
      </div>
    </div>
  );
};
