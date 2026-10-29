import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Workbook, WorkbookInstance } from '@fortune-sheet/react';
import '@fortune-sheet/react/dist/index.css';
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
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'dirty'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);

  const workbookRef = useRef<WorkbookInstance | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Available questions for selected paper
  const paperQuestions = allQuestions.filter(q => q.paperId === selectedPaperId);
  const selectedQuestion = allQuestions.find(q => q.id === selectedQuestionId);

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
          setWorkbookRecord(loadedWb);
          const converted = spreadsheetWorkbookToFortuneSheets(loadedWb);
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
          setWorkbookRecord(completeWb);
          setSheetData(initialSheets);
          setLastSavedTime(completeWb.updatedAt);
        }
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

  // Handle Sheet Data Change from FortuneSheet
  const handleSheetChange = useCallback((newData: any[]) => {
    setSheetData(newData);
    setSaveStatus('dirty');

    // Debounce auto-save (800ms)
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(async () => {
      if (!workbookRecord) return;
      try {
        setSaveStatus('saving');
        const updatedWb = fortuneSheetsToSpreadsheetWorkbook(newData, workbookRecord);
        await db.spreadsheets.put(updatedWb);
        setWorkbookRecord(updatedWb);
        setSaveStatus('saved');
        setLastSavedTime(updatedWb.updatedAt);
      } catch (err) {
        console.error('Auto-save spreadsheet failed:', err);
        setSaveStatus('dirty');
      }
    }, 800);
  }, [workbookRecord]);

  // Explicit Save
  const handleManualSave = async () => {
    if (!workbookRecord) return;
    try {
      setSaveStatus('saving');
      const latestData = (workbookRef.current?.getAllSheets() || sheetData) as any;
      const updatedWb = fortuneSheetsToSpreadsheetWorkbook(latestData, workbookRecord);
      await db.spreadsheets.put(updatedWb);
      setWorkbookRecord(updatedWb);
      setSaveStatus('saved');
      setLastSavedTime(updatedWb.updatedAt);
      await logActivity('Spreadsheet Saved', `Saved Excel spreadsheet for ${selectedPaperId}`, 'workspace');
    } catch (err) {
      console.error('Save failed:', err);
      setSaveStatus('dirty');
    }
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
    <div className="space-y-3 max-w-7xl mx-auto pb-10">
      {/* Top Controls Header Bar */}
      <div className="bg-[#18181f] rounded-2xl border border-[#2a2a34] p-3 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left: Title & Paper Selector */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Table2 className="w-5 h-5" />
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-sm font-bold text-gray-100">Excel Workspace</h1>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#252530] text-emerald-400 border border-emerald-500/20">
                  FortuneSheet Engine
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Official ACCA CBE calculation environment with formula calculation and multi-sheet workings
              </p>
            </div>
          </div>

          {/* Center: Paper and Question Selectors */}
          <div className="flex items-center space-x-2">
            {/* Paper Selection */}
            <select
              value={selectedPaperId}
              onChange={(e) => {
                setSelectedPaperId(e.target.value);
                setSelectedQuestionId('');
              }}
              className="px-3 py-1.5 bg-[#22222b] border border-[#32323e] rounded-xl text-xs font-semibold text-gray-200 focus:outline-none focus:border-red-500 transition-colors"
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
                className="px-3 py-1.5 bg-[#22222b] border border-[#32323e] rounded-xl text-xs font-semibold text-gray-200 focus:outline-none focus:border-red-500 transition-colors max-w-[220px] truncate"
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
                className="px-2.5 py-1.5 bg-[#22222b] hover:bg-[#2a2a36] text-gray-300 rounded-xl text-xs font-medium border border-[#32323e] flex items-center space-x-1.5 transition-colors"
                title="Switch to Answer Writer"
              >
                <FileText className="w-3.5 h-3.5 text-red-400" />
                <span className="hidden sm:inline">Answer Writer</span>
              </button>
            )}
          </div>

          {/* Right: Actions, Save Indicator, CSV */}
          <div className="flex items-center space-x-2">
            {/* Save Status Indicator */}
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-[#141419] border border-[#2a2a34] text-[11px] font-medium text-gray-400">
              {saveStatus === 'saving' ? (
                <>
                  <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                  <span className="text-amber-400">Saving...</span>
                </>
              ) : saveStatus === 'dirty' ? (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-amber-300">Unsaved</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Saved</span>
                </>
              )}
            </div>

            {/* Manual Save Button */}
            <button
              type="button"
              onClick={handleManualSave}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-sm"
              title="Save workbook to local IndexedDB"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save</span>
            </button>

            {/* Reset Template */}
            <button
              type="button"
              onClick={handleResetTemplate}
              className="p-1.5 bg-[#22222b] hover:bg-[#2a2a36] text-gray-400 hover:text-gray-200 rounded-xl border border-[#32323e] transition-colors"
              title="Reset to default ACCA CBE financial template"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Export CSV */}
            <button
              type="button"
              onClick={handleExportCsv}
              className="p-1.5 bg-[#22222b] hover:bg-[#2a2a36] text-gray-400 hover:text-gray-200 rounded-xl border border-[#32323e] transition-colors"
              title="Export active sheet to CSV"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            {/* Import CSV */}
            <label
              className="p-1.5 bg-[#22222b] hover:bg-[#2a2a36] text-gray-400 hover:text-gray-200 rounded-xl border border-[#32323e] transition-colors cursor-pointer"
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
              className="p-1.5 bg-[#22222b] hover:bg-[#2a2a36] text-gray-400 hover:text-gray-200 rounded-xl border border-[#32323e] transition-colors"
              title="Spreadsheet formulas & shortcuts help"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Selected Question Details Bar if active */}
        {selectedQuestion && (
          <div className="mt-2.5 pt-2.5 border-t border-[#252530] flex flex-wrap items-center justify-between text-xs text-gray-300">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-white">Linked Question:</span>
              <span className="text-gray-300">{selectedQuestion.title}</span>
              <span className="text-[10px] bg-red-950/40 text-red-400 border border-red-800/40 px-2 py-0.5 rounded">
                {selectedQuestion.availableMarks || 0} Marks
              </span>
            </div>
            {lastSavedTime && (
              <span className="text-[11px] text-gray-400">
                Last auto-saved: {new Date(lastSavedTime).toLocaleTimeString()}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Spreadsheet Workspace Main Canvas Container */}
      <div className="w-full h-[calc(100vh-230px)] min-h-[580px] bg-[#141419] rounded-2xl border border-[#2a2a34] overflow-hidden shadow-2xl relative">
        {isLoading ? (
          <div className="w-full h-full flex items-center justify-center bg-[#141419] text-gray-400">
            <div className="flex flex-col items-center space-y-3">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-medium">Loading ACCA Spreadsheet Workspace...</span>
            </div>
          </div>
        ) : (
          <div className="catchy-spreadsheet-host w-full h-full">
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
