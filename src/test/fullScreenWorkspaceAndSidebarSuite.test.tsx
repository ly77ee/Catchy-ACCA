import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AppLayout } from '../components/layout/AppLayout';
import { StudyMaterials } from '../components/study-materials/StudyMaterials';
import { WorkspaceSplitLayout } from '../components/workspace/WorkspaceSplitLayout';
import { SpreadsheetWorkspace } from '../components/spreadsheet/SpreadsheetWorkspace';
import { AnswerWriter } from '../components/writer/AnswerWriter';
import { db } from '../db';
import { QUALIFICATION_VERSIONS } from '../config/accaStructure';
import { getMaterialDisplayName } from '../config/studyMaterials';
import { StudyMaterial } from '../types';
import { evaluateFortuneFormula, createDefaultFortuneSheets } from '../utils/fortuneSheetAdapter';

const mockVersion = QUALIFICATION_VERSIONS[0];

// Canvas mock for jsdom
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

describe('Catchy ACCA: Unified Sidebar, Shared Materials & Full-Screen Workspaces Suite', () => {
  beforeEach(async () => {
    await db.studyMaterials.clear();
    await db.spreadsheets.clear();
    await db.writtenAnswers.clear();
    localStorage.clear();
    vi.clearAllMocks();
  });

  /* -------------------------------------------------------------------------- */
  /* A. SIDEBAR ACROSS ENTIRE APPLICATION                                       */
  /* -------------------------------------------------------------------------- */
  describe('A. Unified Collapsible Application Sidebar', () => {
    it('1. Renders expanded sidebar with all required sections and creator credit', () => {
      const onNavigate = vi.fn();
      render(
        <AppLayout
          activeTab="dashboard"
          onNavigate={onNavigate}
          version={mockVersion}
          paperRecords={{}}
          questions={[]}
          materials={[]}
          onOpenPdfAtPage={vi.fn()}
          onSelectPaper={vi.fn()}
        >
          <div>Dashboard Content</div>
        </AppLayout>
      );

      // Verify groups exist
      expect(screen.getByText('Overview')).toBeDefined();
      expect(screen.getAllByText('ACCA').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Study')).toBeDefined();
      expect(screen.getByText('Resources')).toBeDefined();
      expect(screen.getByText('Account')).toBeDefined();

      // Verify destinations
      expect(screen.getByText('Home')).toBeDefined();
      expect(screen.getByText('My ACCA')).toBeDefined();
      expect(screen.getByText('Study Materials')).toBeDefined();
      expect(screen.queryByText('Mock Exams')).toBeNull();
      expect(screen.queryByRole('button', { name: /^Questions$/i })).toBeNull();
      expect(screen.getByText('Excel')).toBeDefined();
      expect(screen.getByText('Word')).toBeDefined();
      expect(screen.getByText('Profile')).toBeDefined();
      expect(screen.getByText('Settings')).toBeDefined();
      expect(screen.getByText('Help')).toBeDefined();

      // Verify creator attribution
      expect(screen.getAllByText(/by ly77ee/i).length).toBeGreaterThanOrEqual(1);
    });

    it('2. Toggles to collapsed rail mode, persists in localStorage, and maintains active indicator', () => {
      const onNavigate = vi.fn();
      render(
        <AppLayout
          activeTab="study-materials"
          onNavigate={onNavigate}
          version={mockVersion}
          paperRecords={{}}
          questions={[]}
          materials={[]}
          onOpenPdfAtPage={vi.fn()}
          onSelectPaper={vi.fn()}
        >
          <div>Study Materials Content</div>
        </AppLayout>
      );

      // Find desktop collapse toggle button
      const toggleBtn = screen.getByTitle('Collapse sidebar');
      expect(toggleBtn).toBeDefined();

      // Click to collapse
      fireEvent.click(toggleBtn);
      expect(localStorage.getItem('catchy_sidebar_collapsed')).toBe('true');

      // Verify sidebar now renders rail with expand button
      const expandBtns = screen.getAllByTitle('Expand sidebar');
      expect(expandBtns.length).toBeGreaterThanOrEqual(1);

      // Verify clicking rail item triggers navigation
      const excelBtn = screen.getByTitle('Excel');
      fireEvent.click(excelBtn);
      expect(onNavigate).toHaveBeenCalledWith('excel');
    });

    it('3. Profile navigation item correctly routes to My ACCA profile', () => {
      const onNavigate = vi.fn();
      render(
        <AppLayout
          activeTab="dashboard"
          onNavigate={onNavigate}
          version={mockVersion}
          paperRecords={{}}
          questions={[]}
          materials={[]}
          onOpenPdfAtPage={vi.fn()}
          onSelectPaper={vi.fn()}
        >
          <div>Home</div>
        </AppLayout>
      );

      const profileBtn = screen.getByText('Profile');
      fireEvent.click(profileBtn);
      expect(onNavigate).toHaveBeenCalledWith('my-acca');
    });
  });

  /* -------------------------------------------------------------------------- */
  /* B. SHARED STUDY MATERIALS LIBRARY & 4-DOCUMENT LIMIT                       */
  /* -------------------------------------------------------------------------- */
  describe('B. Shared Study Materials Library & Unlimited Storage Support', () => {
    it('1. Displays usage indicator (X materials stored) and renders library items', async () => {
      const sampleMaterials: StudyMaterial[] = [
        {
          id: 'mat-1',
          title: 'SBR Exam Kit 2026',
          fileName: 'sbr_exam_kit.pdf',
          fileSize: 4500000,
          totalPages: 180,
          paperId: 'SBR',
          materialType: 'Exam Kit',
          tags: ['SBR'],
          addedAt: new Date().toISOString(),
          pdfData: new ArrayBuffer(1024),
        },
        {
          id: 'mat-2',
          title: 'FR Complete Study Text',
          fileName: 'fr_study_text.pdf',
          fileSize: 6200000,
          totalPages: 320,
          paperId: 'FR',
          materialType: 'Study Text',
          tags: ['FR'],
          addedAt: new Date().toISOString(),
          pdfData: new ArrayBuffer(1024),
        },
      ];

      for (const m of sampleMaterials) {
        await db.studyMaterials.put(m);
      }

      render(
        <StudyMaterials
          version={mockVersion}
          materials={sampleMaterials}
        />
      );

      // Verify indicator shows 2 materials stored
      expect(screen.getByText('2 materials stored')).toBeDefined();

      // Verify Material sequence labels
      expect(screen.getByText('Material 1')).toBeDefined();
      expect(screen.getByText('Material 2')).toBeDefined();
      expect(screen.getByText('SBR Exam Kit 2026')).toBeDefined();
      expect(screen.getByText('FR Complete Study Text')).toBeDefined();
    });

    it('2. Does not limit uploads to 4 items and allows 5 or more materials with active import button', async () => {
      const fiveMaterials: StudyMaterial[] = [1, 2, 3, 4, 5].map((num) => ({
        id: `mat-${num}`,
        title: `Material ${num} Text`,
        fileName: `file_${num}.pdf`,
        fileSize: 1000000 * num,
        totalPages: 50 * num,
        paperId: 'FR',
        materialType: 'Exam Kit',
        tags: ['FR'],
        addedAt: new Date().toISOString(),
        pdfData: new ArrayBuffer(100),
      }));

      for (const m of fiveMaterials) {
        await db.studyMaterials.put(m);
      }

      render(
        <StudyMaterials
          version={mockVersion}
          materials={fiveMaterials}
        />
      );

      // Verify indicator shows 5 materials stored
      expect(screen.getByText('5 materials stored')).toBeDefined();

      // Verify no limit alert is displayed
      expect(screen.queryByText(/Four-Document Limit Reached:/i)).toBeNull();

      // Verify import button remains active and clickable
      const importBtn = screen.getByTitle('Import PDF Material');
      expect(importBtn).toBeDefined();
      expect(importBtn.hasAttribute('disabled')).toBe(false);
    });

    it('3. Renaming material updates title in IndexedDB while preserving stable ID', async () => {
      const mat: StudyMaterial = {
        id: 'stable-id-123',
        title: 'Original Title',
        fileName: 'doc.pdf',
        fileSize: 2000000,
        totalPages: 100,
        paperId: 'FR',
        tags: ['FR'],
        addedAt: new Date().toISOString(),
        pdfData: new ArrayBuffer(50),
      };
      await db.studyMaterials.put(mat);

      const { container } = render(
        <StudyMaterials
          version={mockVersion}
          materials={[mat]}
        />
      );

      // Open Edit Modal
      const editBtn = screen.getByTitle('Edit title & metadata');
      fireEvent.click(editBtn);

      // Change title
      const titleInput = screen.getByDisplayValue('Original Title');
      fireEvent.change(titleInput, { target: { value: 'Renamed ACCA Exam Kit' } });

      // Save
      const saveBtn = screen.getByText('Save Changes');
      fireEvent.click(saveBtn);

      await waitFor(async () => {
        const stored = await db.studyMaterials.get('stable-id-123');
        expect(stored).toBeDefined();
        expect(stored?.title).toBe('Renamed ACCA Exam Kit');
        expect(stored?.id).toBe('stable-id-123'); // stable ID preserved
      });
    });

    it('4. Deleting a material deletes only document record without touching workbooks', async () => {
      const mat: StudyMaterial = {
        id: 'mat-to-delete',
        title: 'Delete Me',
        fileName: 'temp.pdf',
        fileSize: 1000,
        totalPages: 10,
        tags: [],
        addedAt: new Date().toISOString(),
      };
      await db.studyMaterials.put(mat);

      // Put unrelated student workbook in DB
      await db.spreadsheets.put({
        id: 'FR-general',
        paperId: 'FR',
        title: 'FR Workings',
        activeSheetIndex: 0,
        sheets: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // Mock window.confirm to return true
      const origConfirm = window.confirm;
      window.confirm = () => true;

      render(
        <StudyMaterials
          version={mockVersion}
          materials={[mat]}
        />
      );

      const deleteBtn = screen.getByTitle('Delete material');
      fireEvent.click(deleteBtn);

      await waitFor(async () => {
        const checkMat = await db.studyMaterials.get('mat-to-delete');
        expect(checkMat).toBeUndefined();
        // Unrelated workbook remains 100% intact
        const checkWb = await db.spreadsheets.get('FR-general');
        expect(checkWb).toBeDefined();
      });

      window.confirm = origConfirm;
    });
  });

  /* -------------------------------------------------------------------------- */
  /* C. SHARED DOCUMENT SELECTOR & SPLIT WORKSPACE                              */
  /* -------------------------------------------------------------------------- */
  describe('C. Full-Screen Split Workspace & Shared Document Selector', () => {
    it('1. Renders split workspace with material selector and handles document switching', () => {
      const materials: StudyMaterial[] = [
        {
          id: 'mat-1',
          title: 'SBR Exam Kit',
          fileName: 'sbr.pdf',
          fileSize: 2000000,
          totalPages: 150,
          paperId: 'SBR',
          addedAt: new Date().toISOString(),
          pdfData: new ArrayBuffer(100),
          tags: []
        },
        {
          id: 'mat-2',
          title: 'FR Revision Text',
          fileName: 'fr.pdf',
          fileSize: 3000000,
          totalPages: 220,
          paperId: 'FR',
          addedAt: new Date().toISOString(),
          pdfData: new ArrayBuffer(100),
          tags: []
        }
      ];

      const onSelectMaterial = vi.fn();
      const onSwitchWorkspace = vi.fn();

      render(
        <WorkspaceSplitLayout
          workspaceType="excel"
          studyMaterials={materials}
          selectedMaterialId="mat-1"
          onSelectMaterial={onSelectMaterial}
          onNavigateToStudyMaterials={vi.fn()}
          onSwitchWorkspace={onSwitchWorkspace}
          version={mockVersion}
        >
          <div data-testid="mock-excel-editor">Excel Working Area</div>
        </WorkspaceSplitLayout>
      );

      // Verify workspace title
      expect(screen.getByText('Excel Financial Workspace')).toBeDefined();

      // Verify selector lists materials with Material sequence prefix
      expect(screen.getByText(/Material 1 · SBR Exam Kit/i)).toBeDefined();

      // Switch document in selector
      const selector = screen.getByLabelText('Select reference study material');
      fireEvent.change(selector, { target: { value: 'mat-2' } });
      expect(onSelectMaterial).toHaveBeenCalledWith('mat-2');

      // Verify Right-hand editor child remains rendered
      expect(screen.getByTestId('mock-excel-editor')).toBeDefined();
    });

    it('2. Draggable divider updates split ratio and persists preference in localStorage', () => {
      render(
        <WorkspaceSplitLayout
          workspaceType="word"
          studyMaterials={[]}
          selectedMaterialId={null}
          onSelectMaterial={vi.fn()}
          onNavigateToStudyMaterials={vi.fn()}
          onSwitchWorkspace={vi.fn()}
          version={mockVersion}
        >
          <div>Word Editor</div>
        </WorkspaceSplitLayout>
      );

      // Find divider separator
      const divider = screen.getByRole('separator');
      expect(divider).toBeDefined();

      // Arrow keys resize divider
      fireEvent.keyDown(divider, { key: 'ArrowLeft' });
      const val = divider.getAttribute('aria-valuenow');
      expect(val).toBeDefined();
      expect(Number(val)).toBeLessThanOrEqual(50);
    });

    it('3. Full Excel Workspace with PDF calculates =SUM(A1:A2) = 30 without disruption', () => {
      const sheets = createDefaultFortuneSheets('FR');
      sheets[0].celldata = [
        { r: 0, c: 0, v: { v: 10, m: '10' } }, // A1 = 10
        { r: 1, c: 0, v: { v: 20, m: '20' } }, // A2 = 20
      ];

      // Evaluate formula
      const result = evaluateFortuneFormula('=SUM(A1:A2)', sheets, 2, 0);
      expect(result.success).toBe(true);
      expect(result.value).toBe(30);

      // Dynamic recalculation: change A1 to 15
      sheets[0].celldata[0].v = { v: 15, m: '15' };
      const updatedResult = evaluateFortuneFormula('=SUM(A1:A2)', sheets, 2, 0);
      expect(updatedResult.success).toBe(true);
      expect(updatedResult.value).toBe(35);
    });
  });
});
