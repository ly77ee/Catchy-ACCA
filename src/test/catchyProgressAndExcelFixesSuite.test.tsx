import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { db, setChapterStatus, getChapterMastery, resetChapterStatus, createBackupPayload, restoreBackup } from '../db';
import {
  ACCA_SYLLABUS_PAPERS,
  TOTAL_SYLLABUS_PAPERS,
  TOTAL_SYLLABUS_CHAPTERS,
  DEFAULT_MASTERY_STATUS_CONFIGS,
  getStatusConfig,
  getPaperById
} from '../config/accaChapterSyllabus';
import { AppLayout } from '../components/layout/AppLayout';
import { QUALIFICATION_VERSIONS } from '../config/accaStructure';
import { parseMarkdownChecklist } from '../utils/markdownChecklistParser';
import { CatchyNotes } from '../components/notes/CatchyNotes';

describe('Catchy ACCA: Progress Redesign, Excel Scroll & Save, Checklist, and Sidebar Cleanup Suite', () => {
  beforeEach(async () => {
    await db.chapterMastery.clear();
    await db.checklists.clear();
    await db.checklistItems.clear();
  });

  describe('1. ACCA Syllabus Chapter Mastery Tracker Configuration & Logic', () => {
    it('1.1. Configures exactly 15 ACCA papers and 163 chapters matching specification', () => {
      expect(TOTAL_SYLLABUS_PAPERS).toBe(15);
      expect(TOTAL_SYLLABUS_CHAPTERS).toBe(163);

      const expectedPaperCounts: Record<string, number> = {
        BT: 10,
        MA: 10,
        FA: 10,
        LW: 8,
        PM: 10,
        TX: 12,
        FR: 15,
        AA: 12,
        FM: 10,
        SBL: 10,
        SBR: 15,
        AFM: 10,
        APM: 10,
        ATX: 11,
        AAA: 10
      };

      for (const [code, expectedCount] of Object.entries(expectedPaperCounts)) {
        const paper = getPaperById(code);
        expect(paper).toBeDefined();
        expect(paper?.chapters.length).toBe(expectedCount);
      }
    });

    it('1.2. Preserves exact chapter titles and ordering without silent substitutions', () => {
      const frPaper = getPaperById('FR')!;
      expect(frPaper.chapters[0].title).toBe('The financial reporting framework');
      expect(frPaper.chapters[6].title).toBe('Leases');
      expect(frPaper.chapters[12].title).toBe('Consolidated financial statements');

      const txPaper = getPaperById('TX')!;
      expect(txPaper.chapters[4].title).toBe('National insurance contributions or relevant local equivalent');
      expect(txPaper.chapters[8].title).toBe('Inheritance or wealth-related taxes, where applicable');
    });

    it('1.3. Defines all 8 mastery statuses with accessible configurations and indicators', () => {
      expect(DEFAULT_MASTERY_STATUS_CONFIGS).toHaveLength(8);

      const statusIds = DEFAULT_MASTERY_STATUS_CONFIGS.map(c => c.id);
      expect(statusIds).toEqual([
        'not_assessed',
        'not_studied',
        'needs_substantial_work',
        'doubtful',
        'needs_revision',
        'good',
        'well_understood',
        'excellent'
      ]);

      const notAssessed = getStatusConfig('not_assessed');
      expect(notAssessed.isPositiveMastery).toBe(false);
      expect(notAssessed.isPriorityRevision).toBe(false);

      const substantialWork = getStatusConfig('needs_substantial_work');
      expect(substantialWork.isPriorityRevision).toBe(true);
      expect(substantialWork.isPositiveMastery).toBe(false);

      const excellent = getStatusConfig('excellent');
      expect(excellent.isPositiveMastery).toBe(true);
      expect(excellent.isPriorityRevision).toBe(false);
    });

    it('1.4. Updates, retrieves, and resets chapter mastery in IndexedDB immediately', async () => {
      await setChapterStatus('FR', 7, 'Leases', 'needs_revision', 'Review lessor vs lessee differences');

      const frRecords = await getChapterMastery('FR');
      expect(frRecords).toHaveLength(1);
      expect(frRecords[0].paperId).toBe('FR');
      expect(frRecords[0].chapterNumber).toBe(7);
      expect(frRecords[0].status).toBe('needs_revision');
      expect(frRecords[0].notes).toBe('Review lessor vs lessee differences');

      // Update to well_understood
      await setChapterStatus('FR', 7, 'Leases', 'well_understood');
      const updated = await getChapterMastery('FR');
      expect(updated[0].status).toBe('well_understood');

      // Reset
      await resetChapterStatus(updated[0].id);
      const afterReset = await getChapterMastery('FR');
      expect(afterReset).toHaveLength(0);
    });

    it('1.5. Backs up and restores chapter mastery data reliably', async () => {
      await setChapterStatus('SBR', 11, 'Group accounting and consolidated financial statements', 'excellent');
      await setChapterStatus('AA', 4, 'Internal audit and internal controls', 'needs_substantial_work');

      const backup = await createBackupPayload('current_2024_2026');
      expect(backup.chapterMastery).toBeDefined();
      expect(backup.chapterMastery).toHaveLength(2);

      await db.chapterMastery.clear();
      expect(await getChapterMastery()).toHaveLength(0);

      await restoreBackup(backup, 'overwrite');
      const restored = await getChapterMastery();
      expect(restored).toHaveLength(2);
      expect(restored.find(r => r.paperId === 'SBR')?.status).toBe('excellent');
      expect(restored.find(r => r.paperId === 'AA')?.status).toBe('needs_substantial_work');
    });
  });

  describe('2. Question Checklist Custom Titles and Optional/Removable Paper Association', () => {
    it('2.1. Parses checklist with optional or missing paper association cleanly', () => {
      const rawText = `Dog\nCat\nRabbit`;
      const parsed = parseMarkdownChecklist(rawText, undefined);

      expect(parsed.items).toHaveLength(3);
      expect(parsed.paperCode).toBeUndefined();
      expect(parsed.detectedTitle).toBe('Question Checklist');
    });

    it('2.2. Supports creating a general checklist without paper association in IndexedDB', async () => {
      const id = 'cl-test-general';
      await db.checklists.put({
        id,
        title: 'Mixed Past Paper Review',
        paperId: undefined, // No paper association
        rawMarkdown: 'Q1\nQ2',
        totalTasks: 2,
        completedTasks: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      const retrieved = await db.checklists.get(id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.title).toBe('Mixed Past Paper Review');
      expect(retrieved?.paperId).toBeUndefined();
    });

    it('2.3. Allows renaming a checklist and removing its paper association', async () => {
      const id = 'cl-test-rename';
      await db.checklists.put({
        id,
        title: 'Old Title',
        paperId: 'FR',
        rawMarkdown: 'Q1',
        totalTasks: 1,
        completedTasks: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // Rename and remove paper association
      await db.checklists.update(id, {
        title: 'New Custom Title',
        paperId: undefined,
        updatedAt: new Date().toISOString()
      });

      const updated = await db.checklists.get(id);
      expect(updated?.title).toBe('New Custom Title');
      expect(updated?.paperId).toBeUndefined();
    });
  });

  describe('3. Catchy Notes: Badge Removal', () => {
    it('3.1. Renders Catchy Notes without any "Apple Notes Inspired" label or pill', () => {
      const { container } = render(<CatchyNotes />);
      expect(container.textContent).not.toContain('Apple Notes Inspired');
      expect(container.textContent).not.toContain('Apple');
      expect(screen.getByText('Catchy Notes')).toBeInTheDocument();
    });
  });

  describe('4. Sidebar Navigation: AI Assistant Removal', () => {
    it('4.1. Does not render AI Assistant in the main navigation sidebar', () => {
      render(
        <AppLayout
          activeTab="progress"
          onNavigate={() => {}}
          version={QUALIFICATION_VERSIONS[0]}
          paperRecords={{}}
          questions={[]}
          materials={[]}
          onOpenPdfAtPage={() => {}}
          onSelectPaper={() => {}}
        >
          <div>Page Content</div>
        </AppLayout>
      );

      // Verify AI Assistant button/item does not exist in sidebar
      expect(screen.queryByText('AI Assistant')).not.toBeInTheDocument();

      // Verify main navigation items still exist cleanly
      expect(screen.getByText('Progress')).toBeInTheDocument();
      expect(screen.getByText('Question Checklist')).toBeInTheDocument();
      expect(screen.getByText('Excel')).toBeInTheDocument();
      expect(screen.getByText('Word')).toBeInTheDocument();
    });
  });
});
