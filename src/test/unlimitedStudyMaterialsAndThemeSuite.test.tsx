import 'fake-indexeddb/auto';
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StudyMaterials } from '../components/study-materials/StudyMaterials';
import { Badge } from '../components/common/Badge';
import { CircularProgress } from '../components/common/CircularProgress';
import { EmptyState } from '../components/common/EmptyState';
import { ConnectedWorkspace } from '../components/workspace/ConnectedWorkspace';
import { StudyMaterial, QualificationVersion } from '../types';
import { db } from '../db';
import { getMaterialDisplayName } from '../config/studyMaterials';
import { QUALIFICATION_VERSIONS } from '../config/accaStructure';
import { BookOpen } from 'lucide-react';

// Mock pdfjs-dist
vi.mock('pdfjs-dist', () => {
  return {
    GlobalWorkerOptions: {
      workerSrc: '',
    },
    version: '3.11.174',
    getDocument: () => ({
      promise: Promise.resolve({
        numPages: 12,
        getPage: () =>
          Promise.resolve({
            getViewport: () => ({ width: 600, height: 800 }),
            render: () => ({ promise: Promise.resolve() }),
            getTextContent: () => Promise.resolve({ items: [] }),
          }),
      }),
    }),
  };
});

const mockVersion: QualificationVersion = QUALIFICATION_VERSIONS[0];

describe('Unlimited Study Materials & Dark Theme Verification Suite', () => {
  beforeEach(async () => {
    await db.studyMaterials.clear();
    await db.activityLogs.clear();
    localStorage.clear();
  });

  describe('1. Unlimited Study Materials Storage', () => {
    it('supports 1, 4, 5, and 25+ study materials without arbitrary upload caps', async () => {
      // Generate 26 materials
      const twentySixMaterials: StudyMaterial[] = Array.from({ length: 26 }, (_, i) => ({
        id: `mat-${i + 1}`,
        title: `Exam Kit Volume ${i + 1}`,
        fileName: `volume_${i + 1}.pdf`,
        fileSize: 1024 * 1024 * (i + 1),
        totalPages: 20 + i,
        paperId: i % 2 === 0 ? 'FR' : 'SBR',
        materialType: 'Exam Kit',
        tags: [i % 2 === 0 ? 'FR' : 'SBR'],
        addedAt: new Date().toISOString(),
        pdfData: new ArrayBuffer(50),
      }));

      for (const m of twentySixMaterials) {
        await db.studyMaterials.put(m);
      }

      render(
        <StudyMaterials
          version={mockVersion}
          materials={twentySixMaterials}
        />
      );

      // Verify badge displays exact count of stored materials
      expect(screen.getByText('26 materials stored')).toBeDefined();

      // Verify description states unlimited storage
      expect(
        screen.getByText(/Add as many supported study materials as your device can store/i)
      ).toBeDefined();

      // Verify no "Limit Reached" banner exists
      expect(screen.queryByText(/Limit Reached/i)).toBeNull();

      // Verify import button is fully enabled and active
      const importBtn = screen.getByTitle('Import PDF Material');
      expect(importBtn.hasAttribute('disabled')).toBe(false);

      // Verify display names for materials beyond sequence 4
      expect(screen.getByText('Material 1')).toBeDefined();
      expect(screen.getByText('Material 5')).toBeDefined();
      expect(screen.getByText('Material 26')).toBeDefined();
      expect(getMaterialDisplayName(twentySixMaterials[25], 25)).toBe('Material 26 · Exam Kit Volume 26');
    });

    it('processes batch uploads of multiple PDF files simultaneously', async () => {
      render(
        <StudyMaterials
          version={mockVersion}
          materials={[]}
        />
      );

      // Open upload modal
      const openModalBtn = screen.getByRole('button', { name: /Import PDF Material/i });
      fireEvent.click(openModalBtn);

      expect(screen.getByText('Import PDF Study Document')).toBeDefined();

      // Create two fake PDF files
      const file1 = new File(['%PDF-1.4 dummy content 1'], 'Kaplan_SBR_2026.pdf', {
        type: 'application/pdf',
      });
      const file2 = new File(['%PDF-1.4 dummy content 2'], 'BPP_FR_Passcards.pdf', {
        type: 'application/pdf',
      });

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).toBeDefined();
      expect(fileInput.hasAttribute('multiple')).toBe(true);

      // Simulate multi-file selection
      fireEvent.change(fileInput, { target: { files: [file1, file2] } });

      await waitFor(() => {
        expect(screen.getByText(/2 files selected/i)).toBeDefined();
      });

      // Polyfill File.prototype.arrayBuffer if needed in jsdom
      if (!File.prototype.arrayBuffer) {
        File.prototype.arrayBuffer = function () {
          return Promise.resolve(new ArrayBuffer(100));
        };
      }

      // Submit batch
      const form = document.querySelector('form')!;
      expect(form).toBeDefined();
      fireEvent.submit(form);

      await waitFor(async () => {
        const stored = await db.studyMaterials.toArray();
        expect(stored.length).toBe(2);
      });
    });

    it('handles mixed batch gracefully by skipping invalid files and reporting errors', async () => {
      render(
        <StudyMaterials
          version={mockVersion}
          materials={[]}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /Import PDF Material/i }));

      const validPdf = new File(['%PDF-1.4 valid'], 'ValidNotes.pdf', { type: 'application/pdf' });
      const invalidTxt = new File(['hello'], 'Notes.docx', { type: 'application/vnd.openxmlformats' });

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(fileInput, { target: { files: [validPdf, invalidTxt] } });

      await waitFor(() => {
        expect(screen.getByText(/"Notes.docx" is not a PDF./i)).toBeDefined();
        // Valid file is still accepted and selected
        expect(screen.getByText('ValidNotes.pdf')).toBeDefined();
      });
    });

    it('deleting an individual material preserves all other stored materials', async () => {
      const mat1: StudyMaterial = {
        id: 'mat-del-1',
        title: 'Document One',
        fileName: 'doc1.pdf',
        fileSize: 1000,
        totalPages: 10,
        paperId: 'FR',
        tags: ['FR'],
        addedAt: new Date().toISOString(),
        pdfData: new ArrayBuffer(10),
      };
      const mat2: StudyMaterial = {
        id: 'mat-del-2',
        title: 'Document Two',
        fileName: 'doc2.pdf',
        fileSize: 2000,
        totalPages: 20,
        paperId: 'SBR',
        tags: ['SBR'],
        addedAt: new Date().toISOString(),
        pdfData: new ArrayBuffer(10),
      };

      await db.studyMaterials.bulkPut([mat1, mat2]);

      // Confirm dialog returns true
      vi.spyOn(window, 'confirm').mockImplementation(() => true);

      render(
        <StudyMaterials
          version={mockVersion}
          materials={[mat1, mat2]}
        />
      );

      const deleteBtns = screen.getAllByTitle('Delete material');
      fireEvent.click(deleteBtns[0]);

      await waitFor(async () => {
        const remaining = await db.studyMaterials.toArray();
        expect(remaining.length).toBe(1);
        expect(remaining[0].id).toBe('mat-del-2');
      });
    });
  });

  describe('2. Dark Theme & Cohesive Obsidian Styling', () => {
    it('renders Badges with Obsidian dark backgrounds and appropriate contrast', () => {
      const { container, rerender } = render(<Badge status="not_started" text="Not Started" />);
      const badgeElem = container.firstChild as HTMLElement;
      expect(badgeElem.className).toContain('bg-[#141419]');
      expect(badgeElem.className).toContain('border-[#2a2a34]');

      rerender(<Badge status="passed" text="Passed" />);
      const successBadge = container.firstChild as HTMLElement;
      expect(successBadge.className).toContain('bg-emerald-950/40');
      expect(successBadge.className).toContain('text-emerald-300');

      rerender(<Badge status="in_progress" text="In Progress" />);
      const warningBadge = container.firstChild as HTMLElement;
      expect(warningBadge.className).toContain('bg-amber-950/40');
      expect(warningBadge.className).toContain('text-amber-300');

      rerender(<Badge status="exempt" text="Exempt" />);
      const infoBadge = container.firstChild as HTMLElement;
      expect(infoBadge.className).toContain('bg-blue-950/40');
      expect(infoBadge.className).toContain('text-blue-300');
    });

    it('renders CircularProgress with dark track color #2a2a34 and white text', () => {
      const { container } = render(<CircularProgress percentage={75} size={60} strokeWidth={6} />);
      const circles = container.querySelectorAll('circle');
      expect(circles.length).toBe(2);
      // Background track circle
      expect(circles[0].getAttribute('stroke')).toBe('#2a2a34');

      const textElem = container.querySelector('span');
      expect(textElem?.className).toContain('text-white');
    });

    it('renders EmptyState with dark container #1e1e24 and border #2a2a34', () => {
      const { container } = render(
        <EmptyState
          icon={BookOpen}
          title="No Sessions Recorded"
          description="Your revision history will appear here."
        />
      );
      const rootDiv = container.firstChild as HTMLElement;
      expect(rootDiv.className).toContain('bg-[#1e1e24]');
      expect(rootDiv.className).toContain('border-[#2a2a34]');
      expect(screen.getByText('No Sessions Recorded').className).toContain('text-white');
    });

    it('renders ConnectedWorkspace mode switcher with dark background and border', () => {
      const { container } = render(
        <ConnectedWorkspace
          version={mockVersion}
          allQuestions={[]}
          initialPaperId="FR"
          defaultMode="split"
        />
      );
      const switcher = container.querySelector('.bg-\\[\\#1e1e24\\]');
      expect(switcher).not.toBeNull();
      expect(switcher?.className).toContain('border-[#2a2a34]');
    });
  });
});
