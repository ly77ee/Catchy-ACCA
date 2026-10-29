import 'fake-indexeddb/auto';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  db,
  saveNote,
  getNotes,
  deleteNote,
  restoreNote,
  saveNoteFolder,
  getNoteFolders,
  deleteNoteFolder,
  createBackupPayload,
  restoreBackup,
} from '../db';
import { CatchyNote, NoteFolder, StudyPlanItem, StudentTarget } from '../types';
import { QUALIFICATION_VERSIONS } from '../config/accaStructure';
import { ExamPlanner } from '../components/planner/ExamPlanner';
import { toLocalDateString, getStartOfWeek, formatWeekRange, calculateDaysRemaining } from '../utils/dateUtils';

describe('Catchy Notes & Exam Planner Suite', () => {
  const version = QUALIFICATION_VERSIONS[0];

  beforeEach(async () => {
    await db.notes.clear();
    await db.noteFolders.clear();
    await db.studyPlans.clear();
    await db.targets.clear();
  });

  describe('1. Catchy Notes: Folders, Hierarchy, & Safe Note Operations', () => {
    it('creates root folders and nested child subfolders', async () => {
      const rootFolder: NoteFolder = {
        id: 'f-root',
        name: 'Financial Reporting',
        order: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await saveNoteFolder(rootFolder);

      const subFolder: NoteFolder = {
        id: 'f-sub',
        name: 'IFRS 16 Leases',
        parentId: 'f-root',
        order: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await saveNoteFolder(subFolder);

      const folders = await getNoteFolders();
      expect(folders).toHaveLength(2);
      expect(folders.find((f) => f.id === 'f-root')?.parentId).toBeUndefined();
      expect(folders.find((f) => f.id === 'f-sub')?.parentId).toBe('f-root');
    });

    it('creates, pins, edits, and soft-deletes notes to Trash', async () => {
      const note: CatchyNote = {
        id: 'note-1',
        title: 'Goodwill on Consolidation',
        contentHtml: '<p>Fair value of consideration transferred</p>',
        plainText: 'Fair value of consideration transferred',
        folderId: 'f-root',
        isPinned: false,
        isDeleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await saveNote(note);

      let saved = await getNotes();
      expect(saved).toHaveLength(1);
      expect(saved[0].title).toBe('Goodwill on Consolidation');

      // Pin note
      await saveNote({ ...note, isPinned: true });
      saved = await getNotes();
      expect(saved[0].isPinned).toBe(true);

      // Soft delete to Trash
      await deleteNote('note-1', false);
      const activeNotes = await getNotes();
      expect(activeNotes).toHaveLength(0);

      const trashNotes = await getNotes({ includeDeleted: true });
      expect(trashNotes).toHaveLength(1);
      expect(trashNotes[0].id).toBe('note-1');

      // Restore from Trash
      await restoreNote('note-1');
      const restored = await getNotes();
      expect(restored).toHaveLength(1);
      expect(restored[0].isDeleted).toBe(false);
    });

    it('safely handles folder deletion by preserving notes to parent folder or unfiled', async () => {
      const parentFolder: NoteFolder = {
        id: 'f-parent',
        name: 'Strategic Business Leader',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const childFolder: NoteFolder = {
        id: 'f-child',
        name: 'Ethics Module',
        parentId: 'f-parent',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await saveNoteFolder(parentFolder);
      await saveNoteFolder(childFolder);

      const note: CatchyNote = {
        id: 'note-child',
        title: 'Fundamental Ethical Principles',
        contentHtml: '<p>Integrity, Objectivity, Professional Competence</p>',
        plainText: 'Integrity, Objectivity, Professional Competence',
        folderId: 'f-child',
        isPinned: false,
        isDeleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await saveNote(note);

      // Delete child folder with 'move_to_parent' action
      await deleteNoteFolder('f-child', 'move_to_parent');

      const updatedFolders = await getNoteFolders();
      expect(updatedFolders.find((f) => f.id === 'f-child')).toBeUndefined();

      // Note should now have folderId moved to parent folder 'f-parent'
      const updatedNotes = await getNotes();
      expect(updatedNotes).toHaveLength(1);
      expect(updatedNotes[0].folderId).toBe('f-parent');
    });

    it('backs up and restores Catchy Notes and Folders', async () => {
      const folder: NoteFolder = {
        id: 'f-audit',
        name: 'Advanced Audit & Assurance',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const note: CatchyNote = {
        id: 'note-audit',
        title: 'ISA 315 Risk Assessment',
        contentHtml: '<p>Identifying and assessing risks of material misstatement</p>',
        plainText: 'Identifying and assessing risks of material misstatement',
        folderId: 'f-audit',
        isPinned: true,
        isDeleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await saveNoteFolder(folder);
      await saveNote(note);

      const backup = await createBackupPayload('current_2024_2026');
      expect(backup.noteFolders).toBeDefined();
      expect(backup.notes).toBeDefined();
      expect(backup.noteFolders?.some((f) => f.id === 'f-audit')).toBe(true);
      expect(backup.notes?.some((n) => n.id === 'note-audit')).toBe(true);

      // Clear tables
      await db.notes.clear();
      await db.noteFolders.clear();
      expect(await getNotes()).toHaveLength(0);

      // Restore from backup
      await restoreBackup(backup, 'overwrite');
      expect(await getNoteFolders()).toHaveLength(1);
      expect(await getNotes()).toHaveLength(1);
    });
  });

  describe('2. Exam Planner: Weekly Timetable, Workload, & Date Logic', () => {
    it('calculates timezone-safe dates and Monday start-of-week correctly', () => {
      const date = new Date(2026, 9, 29); // Oct 29, 2026 (Thursday)
      const startOfWeek = getStartOfWeek(date);
      expect(startOfWeek.getDay()).toBe(1); // Monday
      expect(startOfWeek.getDate()).toBe(26); // Oct 26, 2026

      const rangeStr = formatWeekRange(startOfWeek);
      expect(rangeStr).toContain('Oct 26');
      expect(rangeStr).toContain('Nov 1, 2026');

      const days = calculateDaysRemaining('2026-12-05', date);
      expect(days).toBe(37);
    });

    it('renders Exam Planner weekly timetable with hourly slots and unscheduled row', () => {
      const todayDateStr = toLocalDateString(new Date());

      const mockPlans: StudyPlanItem[] = [
        {
          id: 'timed-1',
          paperId: 'FR',
          title: 'IFRS 15 Revenue 5-step model',
          estimatedMinutes: 60,
          completed: false,
          dueDate: todayDateStr,
          startTime: '09:00',
          endTime: '10:00',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'allday-1',
          paperId: 'SBR',
          title: 'IAS 19 Defined Benefit Pension Accounting',
          estimatedMinutes: 45,
          completed: true,
          dueDate: todayDateStr,
          createdAt: new Date().toISOString(),
        },
      ];

      const mockTarget: StudentTarget = {
        id: 'target-fr',
        nextExamPaperId: 'FR',
        nextExamDate: '2026-12-05',
        targetScore: 75,
        weeklyStudyHours: 15,
      };

      render(
        <ExamPlanner
          version={version}
          target={mockTarget}
          studyPlans={mockPlans}
          allQuestions={[]}
          studyMaterials={[]}
        />
      );

      // Heading and view switchers
      expect(screen.getByText('ACCA Exam Planner & Task Schedule')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Timetable/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^List View$/i })).toBeInTheDocument();

      // Timed session and all-day session
      expect(screen.getByText('IFRS 15 Revenue 5-step model')).toBeInTheDocument();
      expect(screen.getByText('IAS 19 Defined Benefit Pension Accounting')).toBeInTheDocument();

      // Exam Target Card with days left
      expect(screen.getAllByText('FR').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Dec 5, 2026/i)).toBeInTheDocument();

      // Toggle to List View
      const listViewBtn = screen.getByRole('button', { name: /^List View$/i });
      fireEvent.click(listViewBtn);

      expect(screen.getByText(/Showing 2 study sessions/i)).toBeInTheDocument();
    });
  });
});
