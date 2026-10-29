import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PdfViewer } from '../components/study-materials/PdfViewer';
import { AnswerWriter } from '../components/writer/AnswerWriter';
import { SpreadsheetWorkspace } from '../components/spreadsheet/SpreadsheetWorkspace';
import { WorkspaceSplitLayout } from '../components/workspace/WorkspaceSplitLayout';
import { AppLayout } from '../components/layout/AppLayout';
import { ExamEnvironment } from '../components/exam/ExamEnvironment';
import { db, saveAnnotation, getAnnotationsForMaterial, deleteAnnotation } from '../db';
import { QUALIFICATION_VERSIONS } from '../config/accaStructure';
import { StudyMaterial, DocumentAnnotation } from '../types';
import { evaluateFortuneFormula, createDefaultFortuneSheets } from '../utils/fortuneSheetAdapter';

const mockVersion = QUALIFICATION_VERSIONS[0];

// Canvas mock for JSDOM test environment
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

// IntersectionObserver mock for continuous page scroll detection in JSDOM
class MockIntersectionObserver {
  callback: IntersectionObserverCallback;
  elements: Element[] = [];

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }
  observe(element: Element) {
    this.elements.push(element);
  }
  unobserve(element: Element) {
    this.elements = this.elements.filter((el) => el !== element);
  }
  disconnect() {
    this.elements = [];
  }
}
window.IntersectionObserver = MockIntersectionObserver as any;

describe('Catchy ACCA: PDF Viewer Continuous Scroll & Word Editor Suite', () => {
  beforeEach(async () => {
    await db.studyMaterials.clear();
    await db.annotations.clear();
    await db.writtenAnswers.clear();
    await db.spreadsheets.clear();
    localStorage.clear();
    vi.clearAllMocks();
  });

  /* -------------------------------------------------------------------------- */
  /* 1. PDF VIEWER: MULTI-PAGE CONTINUOUS SCROLL, ZOOM & SEARCH                 */
  /* -------------------------------------------------------------------------- */
  describe('1. PDF Viewer Multi-Page Continuous Scroll, Zoom & Search', () => {
    it('renders PDF viewer toolbar with document title, paper code, zoom controls, and search', () => {
      const material: StudyMaterial = {
        id: 'pdf-mat-1',
        title: 'Financial Reporting Exam Kit 2026',
        fileName: 'fr_exam_kit.pdf',
        fileSize: 4500000,
        totalPages: 24,
        paperId: 'FR',
        tags: ['FR'],
        addedAt: new Date().toISOString(),
        pdfData: new ArrayBuffer(100),
      };

      render(
        <PdfViewer
          material={material}
          initialPage={1}
          initialScale={1.0}
        />
      );

      // Verify header title and paper badge
      expect(screen.getByText('Financial Reporting Exam Kit 2026')).toBeDefined();
      expect(screen.getByText('FR')).toBeDefined();

      // Verify zoom controls
      expect(screen.getByTitle('Zoom In')).toBeDefined();
      expect(screen.getByTitle('Zoom Out')).toBeDefined();
      expect(screen.getByTitle('Fit to Width')).toBeDefined();
      expect(screen.getByTitle('Reset Zoom to 100%')).toBeDefined();
      expect(screen.getByText('100%')).toBeDefined();

      // Verify page navigation input and buttons
      expect(screen.getByTitle('Previous Page')).toBeDefined();
      expect(screen.getByTitle('Next Page')).toBeDefined();
      expect(screen.getByLabelText('Current Page Number')).toBeDefined();

      // Verify in-document search button
      expect(screen.getByTitle('Search in Document')).toBeDefined();
    });

    it('toggles search bar and accepts search terms', () => {
      const material: StudyMaterial = {
        id: 'pdf-mat-search',
        title: 'Audit and Assurance Text',
        fileName: 'aa_text.pdf',
        fileSize: 3000000,
        totalPages: 10,
        paperId: 'AA',
        tags: ['AA'],
        addedAt: new Date().toISOString(),
        pdfData: new ArrayBuffer(100),
      };

      render(
        <PdfViewer
          material={material}
          initialPage={1}
        />
      );

      const searchToggleBtn = screen.getByTitle('Search in Document');
      fireEvent.click(searchToggleBtn);

      const searchInput = screen.getByPlaceholderText('Find text in document...');
      expect(searchInput).toBeDefined();

      fireEvent.change(searchInput, { target: { value: 'Materiality threshold' } });
      expect((searchInput as HTMLInputElement).value).toBe('Materiality threshold');
    });

    it('adjusts zoom level when Zoom In and Zoom Out are clicked', () => {
      const onScaleChange = vi.fn();
      const material: StudyMaterial = {
        id: 'pdf-mat-zoom',
        title: 'Taxation Kit',
        fileName: 'tx_kit.pdf',
        fileSize: 2000000,
        totalPages: 5,
        paperId: 'TX',
        tags: ['TX'],
        addedAt: new Date().toISOString(),
        pdfData: new ArrayBuffer(50),
      };

      render(
        <PdfViewer
          material={material}
          initialPage={1}
          initialScale={1.0}
          onScaleChange={onScaleChange}
        />
      );

      const zoomInBtn = screen.getByTitle('Zoom In');
      fireEvent.click(zoomInBtn);
      expect(screen.getByText('120%')).toBeDefined();
      expect(onScaleChange).toHaveBeenCalledWith(1.2);

      const zoomOutBtn = screen.getByTitle('Zoom Out');
      fireEvent.click(zoomOutBtn);
      expect(screen.getByText('100%')).toBeDefined();
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 2. PERSISTENT PDF HIGHLIGHTING IN INDEXEDDB                                */
  /* -------------------------------------------------------------------------- */
  describe('2. Persistent PDF Highlighting & IndexedDB Annotation Storage', () => {
    it('saves and retrieves annotations across reload for the same material', async () => {
      const annot: DocumentAnnotation = {
        id: 'annot-fr-1',
        materialId: 'mat-fr-sample',
        pageNumber: 3,
        text: 'Lease liability shall be initially measured at present value of lease payments',
        color: 'yellow',
        rects: [{ left: 10, top: 25, width: 60, height: 4 }],
        createdAt: new Date().toISOString(),
      };

      await saveAnnotation(annot);

      const loaded = await getAnnotationsForMaterial('mat-fr-sample');
      expect(loaded.length).toBe(1);
      expect(loaded[0].id).toBe('annot-fr-1');
      expect(loaded[0].text).toContain('Lease liability');
      expect(loaded[0].color).toBe('yellow');
      expect(loaded[0].rects[0].width).toBe(60);

      // Verify isolation: unrelated material has no highlights
      const otherLoaded = await getAnnotationsForMaterial('mat-other-doc');
      expect(otherLoaded.length).toBe(0);
    });

    it('deletes an annotation when requested', async () => {
      const annot1: DocumentAnnotation = {
        id: 'annot-to-keep',
        materialId: 'mat-pm',
        pageNumber: 1,
        text: 'Variance analysis',
        color: 'green',
        rects: [{ left: 5, top: 10, width: 20, height: 3 }],
        createdAt: new Date().toISOString(),
      };
      const annot2: DocumentAnnotation = {
        id: 'annot-to-delete',
        materialId: 'mat-pm',
        pageNumber: 2,
        text: 'Shadow price calculation',
        color: 'pink',
        rects: [{ left: 8, top: 15, width: 25, height: 3 }],
        createdAt: new Date().toISOString(),
      };

      await saveAnnotation(annot1);
      await saveAnnotation(annot2);

      let loaded = await getAnnotationsForMaterial('mat-pm');
      expect(loaded.length).toBe(2);

      await deleteAnnotation('annot-to-delete');

      loaded = await getAnnotationsForMaterial('mat-pm');
      expect(loaded.length).toBe(1);
      expect(loaded[0].id).toBe('annot-to-keep');
    });

    it('renders saved highlights badge in PdfViewer when document contains annotations', async () => {
      const material: StudyMaterial = {
        id: 'pdf-mat-annotated',
        title: 'SBR Kit',
        fileName: 'sbr.pdf',
        fileSize: 1000000,
        totalPages: 10,
        paperId: 'SBR',
        tags: ['SBR'],
        addedAt: new Date().toISOString(),
        pdfData: new ArrayBuffer(50),
      };

      await saveAnnotation({
        id: 'annot-sbr-1',
        materialId: 'pdf-mat-annotated',
        pageNumber: 2,
        text: 'IFRS 15 five-step model',
        color: 'blue',
        rects: [{ left: 15, top: 20, width: 50, height: 3 }],
        createdAt: new Date().toISOString(),
      });

      render(
        <PdfViewer
          material={material}
          initialPage={1}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('1 mark')).toBeDefined();
      });
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 3. WORD EDITOR: TOOLBAR FOCUS PRESERVATION, FORMATTING & FULL HEIGHT       */
  /* -------------------------------------------------------------------------- */
  describe('3. Word Editor Formatting, Table Controls & Split-Screen Usability', () => {
    it('renders Word editor without oversized introductory card and provides full-height CBE workspace', () => {
      render(
        <AnswerWriter
          version={mockVersion}
          allQuestions={[]}
          initialPaperId="FR"
        />
      );

      // Verify sleek header with Word Editor badge
      expect(screen.getByText('Word Editor')).toBeDefined();

      // Verify absence of oversized card
      expect(screen.queryByText('Constructed Response Workspace')).toBeNull();

      // Verify formatting toolbar buttons exist
      expect(screen.getByTitle('Bold (Ctrl+B)')).toBeDefined();
      expect(screen.getByTitle('Italic (Ctrl+I)')).toBeDefined();
      expect(screen.getByTitle('Underline (Ctrl+U)')).toBeDefined();
      expect(screen.getByTitle('Heading 1')).toBeDefined();
      expect(screen.getByTitle('Heading 2')).toBeDefined();
      expect(screen.getByTitle('Heading 3')).toBeDefined();
      expect(screen.getByTitle('Bullet List')).toBeDefined();
      expect(screen.getByTitle('Numbered List')).toBeDefined();
      expect(screen.getByTitle('Insert Table (3x3)')).toBeDefined();
      expect(screen.getByTitle('Undo (Ctrl+Z)')).toBeDefined();
      expect(screen.getByTitle('Redo (Ctrl+Y)')).toBeDefined();

      // Verify Attempt management and Review actions
      expect(screen.getByTitle('Start New Attempt')).toBeDefined();
      expect(screen.getByText('Review')).toBeDefined();
    });

    it('preserves editor focus on formatting buttons using onMouseDown preventDefault', () => {
      render(
        <AnswerWriter
          version={mockVersion}
          allQuestions={[]}
          initialPaperId="SBL"
        />
      );

      const boldBtn = screen.getByTitle('Bold (Ctrl+B)');
      const italicBtn = screen.getByTitle('Italic (Ctrl+I)');
      const underlineBtn = screen.getByTitle('Underline (Ctrl+U)');
      const tableBtn = screen.getByTitle('Insert Table (3x3)');

      // Dispatch mousedown events and ensure preventDefault was called so focus is not stolen
      const boldMouseDown = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
      boldBtn.dispatchEvent(boldMouseDown);
      expect(boldMouseDown.defaultPrevented).toBe(true);

      const italicMouseDown = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
      italicBtn.dispatchEvent(italicMouseDown);
      expect(italicMouseDown.defaultPrevented).toBe(true);

      const underlineMouseDown = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
      underlineBtn.dispatchEvent(underlineMouseDown);
      expect(underlineMouseDown.defaultPrevented).toBe(true);

      const tableMouseDown = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
      tableBtn.dispatchEvent(tableMouseDown);
      expect(tableMouseDown.defaultPrevented).toBe(true);
    });

    it('creates multiple answer attempts and persists them in IndexedDB', async () => {
      render(
        <AnswerWriter
          version={mockVersion}
          allQuestions={[]}
          initialPaperId="FR"
        />
      );

      // Initially loads attempt #1
      await waitFor(() => {
        expect(screen.getByText('#1')).toBeDefined();
      });

      // Click to add attempt #2
      const addAttemptBtn = screen.getByTitle('Start New Attempt');
      fireEvent.click(addAttemptBtn);

      await waitFor(() => {
        expect(screen.getByText('#2')).toBeDefined();
      });

      // Verify attempts saved in IndexedDB
      await waitFor(async () => {
        const stored = await db.writtenAnswers.where('paperId').equals('FR').toArray();
        expect(stored.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('Word editor and PDF viewer render side-by-side in WorkspaceSplitLayout cleanly', () => {
      const materials: StudyMaterial[] = [
        {
          id: 'sbr-split-mat',
          title: 'Strategic Business Reporting Text',
          fileName: 'sbr_text.pdf',
          fileSize: 5000000,
          totalPages: 100,
          paperId: 'SBR',
          tags: ['SBR'],
          addedAt: new Date().toISOString(),
          pdfData: new ArrayBuffer(50),
        },
      ];

      render(
        <WorkspaceSplitLayout
          workspaceType="word"
          studyMaterials={materials}
          selectedMaterialId="sbr-split-mat"
          onSelectMaterial={vi.fn()}
          onNavigateToStudyMaterials={vi.fn()}
          onSwitchWorkspace={vi.fn()}
          version={mockVersion}
        >
          <AnswerWriter
            version={mockVersion}
            allQuestions={[]}
            initialPaperId="SBR"
          />
        </WorkspaceSplitLayout>
      );

      // Verify header indicators
      expect(screen.getByText('Word Answer Writer')).toBeDefined();
      expect(screen.getByText(/Material 1 · Strategic Business Reporting Text/i)).toBeDefined();

      // Right-side Word Editor is present and has formatting controls
      expect(screen.getByTitle('Bold (Ctrl+B)')).toBeDefined();
      expect(screen.getByTitle('Insert Table (3x3)')).toBeDefined();
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 4. REGRESSION CHECK: FORTUNESHEET EXCEL INTEGRITY PRESERVED                */
  /* -------------------------------------------------------------------------- */
  describe('4. Regression: FortuneSheet Spreadsheet Calculations Intact', () => {
    it('evaluates Excel financial formulas =SUM and =AVERAGE without regression', () => {
      const sheets = createDefaultFortuneSheets('FR');
      sheets[0].celldata = [
        { r: 0, c: 0, v: { v: 100, m: '100' } }, // A1
        { r: 1, c: 0, v: { v: 200, m: '200' } }, // A2
        { r: 2, c: 0, v: { v: 300, m: '300' } }, // A3
      ];

      const sumResult = evaluateFortuneFormula('=SUM(A1:A3)', sheets, 3, 0);
      expect(sumResult.success).toBe(true);
      expect(sumResult.value).toBe(600);

      const avgResult = evaluateFortuneFormula('=AVERAGE(A1:A3)', sheets, 4, 0);
      expect(avgResult.success).toBe(true);
      expect(avgResult.value).toBe(200);
    });

    it('renders minimized Excel Workspace header with consolidated title, badge, and no redundant paragraph', () => {
      render(
        <SpreadsheetWorkspace
          version={mockVersion}
          allQuestions={[]}
          initialPaperId="FR"
        />
      );

      // Compact title and badge exist
      expect(screen.getByText('Excel Workspace')).toBeDefined();
      expect(screen.getByText('FortuneSheet Engine')).toBeDefined();

      // Redundant multi-line descriptive text is removed
      expect(
        screen.queryByText(/Official ACCA CBE calculation environment with formula calculation/i)
      ).toBeNull();

      // Selectors and action buttons remain fully accessible
      expect(screen.getByDisplayValue(/FR/i)).toBeDefined();
      expect(screen.getByText('Save')).toBeDefined();
      expect(screen.getByTitle('Export active sheet to CSV')).toBeDefined();
      expect(screen.getByTitle('Reset to default ACCA CBE financial template')).toBeDefined();
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 5. SIDEBAR NAVIGATION CLEANUP & MOCK EXAMS RENAMING                        */
  /* -------------------------------------------------------------------------- */
  describe('5. Sidebar Navigation Cleanup & Mock Exams Renaming', () => {
    it('sidebar displays Mock Exams destination and has no standalone Questions item', () => {
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
          <div>Main Content</div>
        </AppLayout>
      );

      // Verify Mock Exams is present in the sidebar
      expect(screen.getByText('Mock Exams')).toBeDefined();

      // Verify Questions navigation item is removed from sidebar
      expect(screen.queryByRole('button', { name: /^Questions$/i })).toBeNull();

      // Click Mock Exams navigates to 'exam-environment'
      const mockExamsBtn = screen.getByText('Mock Exams');
      fireEvent.click(mockExamsBtn);
      expect(onNavigate).toHaveBeenCalledWith('exam-environment');
    });

    it('Mock Exams environment exposes Question Bank & Authoring entry point', () => {
      const onOpenQuestionInManager = vi.fn();
      render(
        <ExamEnvironment
          version={mockVersion}
          allQuestions={[]}
          materials={[]}
          examAttempts={[]}
          defaultPaperId="FR"
          onOpenQuestionInManager={onOpenQuestionInManager}
        />
      );

      // Verify Mock Exams header and buttons
      expect(screen.getByText('New Mock Exam')).toBeDefined();
      expect(screen.getByText('Configure Mock Exam')).toBeDefined();
      expect(screen.getByText(/ACCA Mock Exams/i)).toBeDefined();

      // Verify Question Bank & Authoring entry point exists and is clickable
      const questionBankBtn = screen.getByText('Question Bank & Authoring');
      expect(questionBankBtn).toBeDefined();

      fireEvent.click(questionBankBtn);
      expect(onOpenQuestionInManager).toHaveBeenCalled();
    });
  });
});
