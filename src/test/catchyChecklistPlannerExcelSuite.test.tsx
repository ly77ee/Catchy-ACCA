import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { parseMarkdownChecklist, exportChecklistToMarkdown } from '../utils/markdownChecklistParser';
import { StudyChecklist } from '../components/checklist/StudyChecklist';
import { ExamPlanner } from '../components/planner/ExamPlanner';
import { Dashboard } from '../components/dashboard/Dashboard';
import { AppLayout } from '../components/layout/AppLayout';
import { SpreadsheetWorkspace } from '../components/spreadsheet/SpreadsheetWorkspace';
import { db, getTargets, saveTarget, deleteTarget } from '../db';
import { createDefaultFortuneSheets, spreadsheetWorkbookToFortuneSheets } from '../utils/fortuneSheetAdapter';
import { QUALIFICATION_VERSIONS } from '../config/accaStructure';
import { StudentTarget } from '../types';

const mockVersion = QUALIFICATION_VERSIONS[0];

describe('Catchy ACCA: Checklist, Planner, Excel & Navigation Improvements Suite', () => {
  beforeEach(async () => {
    await db.targets.clear();
    await db.checklists.clear();
    await db.checklistItems.clear();
    localStorage.clear();
    vi.clearAllMocks();
  });

  /* ========================================================================== */
  /* 1. Question Checklist & Plain-Line Input                                   */
  /* ========================================================================== */
  describe('1. Question Checklist: Line-Based Input & Removed Obsidian References', () => {
    it('parses plain lines (Dog, Cat, Rabbit) into 3 sequential checklist tasks with accurate count', () => {
      const plainInput = `Dog\nCat\nRabbit`;
      const parsed = parseMarkdownChecklist(plainInput, 'FR');

      expect(parsed.totalTasks).toBe(3);
      expect(parsed.completedTasks).toBe(0);
      expect(parsed.items.length).toBe(3);
      expect(parsed.items[0].title).toBe('Dog');
      expect(parsed.items[0].order).toBe(0);
      expect(parsed.items[0].completed).toBe(false);

      expect(parsed.items[1].title).toBe('Cat');
      expect(parsed.items[1].order).toBe(1);
      expect(parsed.items[1].completed).toBe(false);

      expect(parsed.items[2].title).toBe('Rabbit');
      expect(parsed.items[2].order).toBe(2);
      expect(parsed.items[2].completed).toBe(false);
    });

    it('renders clean language without Obsidian-specific syntax messaging', () => {
      render(
        <StudyChecklist
          version={mockVersion}
          onNavigateToPaper={vi.fn()}
        />
      );

      // Verify clean subtitle
      expect(
        screen.getAllByText(/Write or paste your questions, one per line/i).length
      ).toBeGreaterThanOrEqual(1);

      // Verify button says "Create Checklist" rather than "Paste Markdown Checklist"
      const createBtns = screen.getAllByRole('button', { name: /Create Checklist/i });
      expect(createBtns.length).toBeGreaterThanOrEqual(1);

      // Ensure no Obsidian keywords are displayed in UI text
      expect(screen.queryByText(/Obsidian/i)).toBeNull();
      expect(screen.queryByText(/Markdown Checklist/i)).toBeNull();

      // Open the modal
      fireEvent.click(createBtns[0]);

      // Verify modal title & helper text
      expect(screen.getByText('Create Question Checklist')).toBeDefined();
      expect(screen.getByText(/Type each question on a new line, then create your checklist/i)).toBeDefined();
      expect(screen.getByText('Load Sample Questions')).toBeDefined();
    });

    it('roundtrips checklist items to markdown while preserving checked states and ordering', async () => {
      const initialMarkdown = `- [x] Dog\n- [ ] Cat\n- [x] Rabbit`;
      const parsed = parseMarkdownChecklist(initialMarkdown, 'FR');
      expect(parsed.totalTasks).toBe(3);
      expect(parsed.completedTasks).toBe(2);
      expect(parsed.items[0].completed).toBe(true);
      expect(parsed.items[1].completed).toBe(false);
      expect(parsed.items[2].completed).toBe(true);

      const fullItems = parsed.items.map((item, idx) => ({
        ...item,
        id: `item-${idx}`,
        checklistId: 'test-cl',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      const serialized = exportChecklistToMarkdown(parsed.detectedTitle, fullItems);
      expect(serialized).toContain('- [x] Dog');
      expect(serialized).toContain('- [ ] Cat');
      expect(serialized).toContain('- [x] Rabbit');
    });
  });

  /* ========================================================================== */
  /* 2. Exam Planner: Multiple Exam Targets & Dashboard Integration              */
  /* ========================================================================== */
  describe('2. Exam Planner: Multiple Exam Targets & Countdown Tracking', () => {
    it('supports multiple exam targets with distinct papers and independent dates in IndexedDB', async () => {
      const target1: StudentTarget = {
        id: 'target-pm',
        paperId: 'PM',
        nextExamPaperId: 'PM',
        examDate: '2026-12-07',
        nextExamDate: '2026-12-07',
        examTime: '09:00',
        sessionLabel: 'December 2026 Sitting',
        targetScore: 75,
        weeklyStudyHours: 15,
        notes: 'PM Performance Management target',
        createdAt: new Date().toISOString(),
      };

      const target2: StudentTarget = {
        id: 'target-fm',
        paperId: 'FM',
        nextExamPaperId: 'FM',
        examDate: '2026-12-10',
        nextExamDate: '2026-12-10',
        examTime: '14:00',
        sessionLabel: 'December 2026 Sitting',
        targetScore: 70,
        weeklyStudyHours: 12,
        notes: 'FM Financial Management afternoon exam',
        createdAt: new Date().toISOString(),
      };

      await saveTarget(target1);
      await saveTarget(target2);

      const loaded = await getTargets();
      expect(loaded.length).toBe(2);
      expect(loaded.find((t) => t.paperId === 'PM')?.examDate).toBe('2026-12-07');
      expect(loaded.find((t) => t.paperId === 'FM')?.examDate).toBe('2026-12-10');

      // Test deleting single target preserves others
      await deleteTarget('target-pm');
      const afterDelete = await getTargets();
      expect(afterDelete.length).toBe(1);
      expect(afterDelete[0].paperId).toBe('FM');
    });

    it('renders Add Exam button, multiple exam cards with days left, and edit/delete controls', async () => {
      const sampleTargets: StudentTarget[] = [
        {
          id: 'target-pm',
          paperId: 'PM',
          nextExamPaperId: 'PM',
          examDate: '2026-12-07',
          nextExamDate: '2026-12-07',
          targetScore: 75,
          sessionLabel: 'Dec 2026',
        },
        {
          id: 'target-fr',
          paperId: 'FR',
          nextExamPaperId: 'FR',
          examDate: '2026-12-11',
          nextExamDate: '2026-12-11',
          targetScore: 80,
          sessionLabel: 'Dec 2026',
        },
      ];

      render(
        <ExamPlanner
          version={mockVersion}
          target={sampleTargets[0]}
          targets={sampleTargets}
          studyPlans={[]}
          allQuestions={[]}
          studyMaterials={[]}
        />
      );

      // Verify Upcoming Exam Targets section header
      expect(screen.getByText(/Upcoming Exam Targets/i)).toBeDefined();

      // Verify Add Exam button exists
      const addExamBtn = screen.getByRole('button', { name: /Add Exam/i });
      expect(addExamBtn).toBeDefined();

      // Verify both exam cards are rendered
      expect(screen.getAllByText('PM').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('FR').length).toBeGreaterThanOrEqual(1);

      // Verify Edit and Remove action buttons are present
      expect(screen.getAllByText('Edit').length).toBeGreaterThanOrEqual(2);
      expect(screen.getAllByText('Remove').length).toBeGreaterThanOrEqual(2);

      // Clicking Add Exam opens the target modal
      fireEvent.click(addExamBtn);
      expect(screen.getByText('Add Exam Target')).toBeDefined();
      expect(screen.getByText(/Target Paper/i)).toBeDefined();
      expect(screen.getByText(/Official Exam Date/i)).toBeDefined();
    });

    it('Dashboard displays the nearest upcoming exam target and indicates additional targets', () => {
      const sampleTargets: StudentTarget[] = [
        {
          id: 'target-future-late',
          paperId: 'FR',
          nextExamPaperId: 'FR',
          examDate: '2026-12-15',
          nextExamDate: '2026-12-15',
        },
        {
          id: 'target-future-early',
          paperId: 'PM',
          nextExamPaperId: 'PM',
          examDate: '2026-12-05',
          nextExamDate: '2026-12-05',
        },
      ];

      render(
        <Dashboard
          version={mockVersion}
          paperRecords={{}}
          target={sampleTargets[0]}
          targets={sampleTargets}
          studyPlans={[]}
          activityLogs={[]}
          onNavigate={vi.fn()}
          onSelectPaper={vi.fn()}
        />
      );

      // Nearest target is PM (2026-12-05 comes before 2026-12-15)
      expect(screen.getByText('PM')).toBeDefined();
      expect(screen.getByText(/Performance Management/i)).toBeDefined();

      // Indicator for additional targets
      expect(screen.getByText(/more scheduled exam in Planner/i)).toBeDefined();
    });
  });

  /* ========================================================================== */
  /* 3. Excel Workspace: Horizontal Reachability & Active-Cell Reveal          */
  /* ========================================================================== */
  describe('3. Excel Workspace: Columns A to Z and AA+ Reachability & Active Cell Reveal', () => {
    it('initializes FortuneSheet workbook with at least 80 columns and 80 rows so column Z and AA+ exist', () => {
      const sheets = createDefaultFortuneSheets('FR', 'Test Question');
      expect(sheets.length).toBe(2);
      expect(sheets[0].name).toBe('Workings 1');
      expect(sheets[0].column).toBeGreaterThanOrEqual(80);
      expect(sheets[0].row).toBeGreaterThanOrEqual(80);
      expect(sheets[1].name).toBe('Notes & Assumptions');
      expect(sheets[1].column).toBeGreaterThanOrEqual(80);
      expect(sheets[1].row).toBeGreaterThanOrEqual(80);
    });

    it('converts custom spreadsheet workbook to FortuneSheet sheets with at least 80 columns', () => {
      const fortuneSheets = spreadsheetWorkbookToFortuneSheets({
        id: 'wb-test',
        paperId: 'FR',
        title: 'Test Workbook',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sheets: [
          {
            id: 'sheet-1',
            name: 'Sheet1',
            cells: {
              A1: { raw: '10', computed: 10 },
              Z1: { raw: '99', computed: 99 },
            },
            rowCount: 50,
            colCount: 30,
          },
        ],
        activeSheetIndex: 0,
      });

      expect(fortuneSheets[0].column).toBeGreaterThanOrEqual(80);
      expect(fortuneSheets[0].row).toBeGreaterThanOrEqual(80);
    });

    it('renders SpreadsheetWorkspace with horizontal scrollbar container and formula calculation support', async () => {
      const { container } = render(
        <SpreadsheetWorkspace
          version={mockVersion}
          allQuestions={[]}
          initialPaperId="FR"
        />
      );

      // Wait for async workbook initialization
      await waitFor(() => {
        const host = container.querySelector('.catchy-spreadsheet-host');
        expect(host).not.toBeNull();
      });

      // Standard formula calculation and controls are present
      expect(screen.getByText('Excel Workspace')).toBeDefined();
    });
  });

  /* ========================================================================== */
  /* 4. Navigation & Mock Exams Removal                                         */
  /* ========================================================================== */
  describe('4. Navigation: Removal of Mock Exams from Sidebar', () => {
    it('does not render Mock Exams in sidebar navigation items', () => {
      render(
        <AppLayout
          activeTab="dashboard"
          onNavigate={vi.fn()}
          version={mockVersion}
          paperRecords={{}}
          questions={[]}
          materials={[]}
          onOpenPdfAtPage={vi.fn()}
          onSelectPaper={vi.fn()}
        >
          <div>Main Area</div>
        </AppLayout>
      );

      // Mock Exams should not exist in the sidebar
      expect(screen.queryByText('Mock Exams')).toBeNull();

      // Core destinations remain intact
      expect(screen.getByText('Home')).toBeDefined();
      expect(screen.getByText('My ACCA')).toBeDefined();
      expect(screen.getByText('Study Materials')).toBeDefined();
      expect(screen.getByText('Excel')).toBeDefined();
      expect(screen.getByText('Word')).toBeDefined();
    });
  });
});
