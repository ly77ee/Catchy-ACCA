import Dexie, { type Table } from 'dexie';
import {
  StudentPaperRecord,
  StudyMaterial,
  QuestionRecord,
  StudyPlanItem,
  ActivityLog,
  StudentTarget,
  BackupPayload,
  ExamAttemptRecord,
  WrittenAnswerDraft,
  SpreadsheetWorkbook,
  ChecklistRecord,
  ChecklistItem,
  AccaNewsItem,
  DocumentAnnotation,
  NoteFolder,
  CatchyNote,
  ChapterMasteryRecord,
  ChapterMasteryStatus
} from '../types';

export class CatchyAccaDatabase extends Dexie {
  paperRecords!: Table<StudentPaperRecord, string>;
  studyMaterials!: Table<StudyMaterial, string>;
  questions!: Table<QuestionRecord, string>;
  studyPlans!: Table<StudyPlanItem, string>;
  activityLogs!: Table<ActivityLog, string>;
  targets!: Table<StudentTarget, string>;
  examAttempts!: Table<ExamAttemptRecord, string>;
  writtenAnswers!: Table<WrittenAnswerDraft, string>;
  spreadsheets!: Table<SpreadsheetWorkbook, string>;
  checklists!: Table<ChecklistRecord, string>;
  checklistItems!: Table<ChecklistItem, string>;
  newsCache!: Table<AccaNewsItem, string>;
  annotations!: Table<DocumentAnnotation, string>;
  notes!: Table<CatchyNote, string>;
  noteFolders!: Table<NoteFolder, string>;
  chapterMastery!: Table<ChapterMasteryRecord, string>;

  constructor() {
    super('CatchyAccaDB');

    this.version(1).stores({
      paperRecords: 'paperId, status, updatedAt',
      studyMaterials: 'id, title, fileName, paperId, addedAt',
      questions: 'id, questionNumber, paperId, status, isDoubt, confidenceRating, createdAt, updatedAt',
      studyPlans: 'id, dueDate, completed, createdAt',
      activityLogs: 'id, timestamp, category',
      targets: 'id'
    });

    this.version(2).stores({
      examAttempts: 'id, paperId, status, startedAt, completedAt'
    });

    // Version 3 adds writtenAnswers and spreadsheets for Phase 3
    this.version(3).stores({
      writtenAnswers: 'id, questionId, paperId, updatedAt',
      spreadsheets: 'id, questionId, paperId, updatedAt'
    });

    // Version 4 adds sourceMaterialId index on questions for fast queries and deduplication
    this.version(4).stores({
      questions: 'id, questionNumber, paperId, sourceMaterialId, status, isDoubt, confidenceRating, createdAt, updatedAt'
    });

    // Version 5 adds checklists, checklistItems, newsCache, and authored question indices
    this.version(5).stores({
      questions: 'id, questionNumber, paperId, sourceMaterialId, publishStatus, syllabusArea, status, isDoubt, confidenceRating, createdAt, updatedAt',
      checklists: 'id, paperId, qualificationVersionId, updatedAt',
      checklistItems: 'id, checklistId, paperId, order, completed, level',
      newsCache: 'id, publishedAt, category, isOfficial'
    });

    // Version 6 adds document persistent annotations and highlights
    this.version(6).stores({
      annotations: 'id, materialId, pageNumber, createdAt'
    });

    // Version 7 adds Catchy Notes and folders
    this.version(7).stores({
      notes: 'id, folderId, isPinned, isDeleted, updatedAt, createdAt',
      noteFolders: 'id, parentId, updatedAt, createdAt'
    });

    // Version 8 adds Syllabus Chapter Mastery Tracker
    this.version(8).stores({
      chapterMastery: 'id, paperId, chapterNumber, status, updatedAt'
    });
  }
}

export const db = new CatchyAccaDatabase();

// Clean initialization for fresh users - initializes baseline profile without fake exam passes
export async function initializeDatabase(): Promise<void> {
  const targetCount = await db.targets.count();
  if (targetCount === 0) {
    await db.targets.put({
      id: 'default',
      nextExamPaperId: 'FR',
      targetScore: 70,
      weeklyStudyHours: 15,
      notes: ''
    });
  }
}

// Optional demo/sample data loader for testing the simulator and analytics
export async function seedSampleDemoData(): Promise<void> {
  try {
    const now = new Date().toISOString();
  // Sample paper progress
  const samplePapers: StudentPaperRecord[] = [
    {
      paperId: 'BT',
      status: 'passed',
      score: 78,
      examSession: 'December 2025',
      notes: 'Solid foundation in business structure and IT governance.',
      updatedAt: now
    },
    {
      paperId: 'MA',
      status: 'passed',
      score: 82,
      examSession: 'December 2025',
      notes: 'Good score on costing and variance analysis.',
      updatedAt: now
    },
    {
      paperId: 'FA',
      status: 'passed',
      score: 85,
      examSession: 'January 2026',
      notes: 'Comfortable with IFRS statements and adjustments.',
      updatedAt: now
    },
    {
      paperId: 'FR',
      status: 'in_progress',
      targetScore: 70,
      examSession: 'March 2027',
      targetExamDate: '2027-03-05',
      notes: 'Currently focusing on Group Financial Statements and Leases (IFRS 16).',
      updatedAt: now
    },
    {
      paperId: 'PM',
      status: 'not_started',
      examSession: 'June 2027',
      targetScore: 65,
      notes: 'Planned for June session alongside AA.',
      updatedAt: now
    }
  ];

  await db.paperRecords.bulkPut(samplePapers);

  // Sample student target
  await db.targets.put({
    id: 'default',
    nextExamPaperId: 'FR',
    nextExamDate: '2027-03-05',
    targetScore: 70,
    weeklyStudyHours: 15,
    notes: 'Prepare section C consolidation questions and ethics scenarios.'
  });

  // Sample study plan items for today
  const today = new Date().toISOString().split('T')[0];
  await db.studyPlans.bulkPut([
    {
      id: 'plan-1',
      title: 'Review IFRS 16 Leases: Lessee accounting & right-of-use asset',
      paperId: 'FR',
      estimatedMinutes: 45,
      completed: false,
      dueDate: today,
      createdAt: now
    },
    {
      id: 'plan-2',
      title: 'Practise 2 Section B Objective Test Cases on Revenue (IFRS 15)',
      paperId: 'FR',
      estimatedMinutes: 60,
      completed: false,
      dueDate: today,
      createdAt: now
    },
    {
      id: 'plan-3',
      title: 'Log doubts and create question flashcards for Goodwill impairment',
      paperId: 'FR',
      estimatedMinutes: 30,
      completed: true,
      dueDate: today,
      createdAt: now
    }
  ]);

  // Seed questions with objective options for simulator testing
  await db.questions.bulkPut([
    {
      id: 'q-seed-1',
      questionNumber: 'FR-Q1',
      title: 'Consolidated Statement of Financial Position — Goodwill and NCI',
      paperId: 'FR',
      topicTags: ['Consolidation', 'Goodwill', 'NCI', 'IFRS 3'],
      questionType: 'section_c_constructed',
      notes: 'Remember to check fair value adjustments to net assets at acquisition date before calculating goodwill.',
      status: 'attempted',
      isDoubt: true,
      confidenceRating: 3,
      availableMarks: 20,
      markingGuide: 'Goodwill: Consideration transferred + Fair value of NCI - Net identifiable assets acquired at fair value. Ensure unrealized profit in inventory (PUP) is eliminated.',
      attempts: [
        {
          id: 'att-1',
          attemptDate: now,
          marksAwarded: 14,
          totalMarks: 20,
          timeSpentSeconds: 2100,
          remarks: 'Lost marks on intra-group trading unrealized profit (PUP).'
        }
      ],
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'q-seed-2',
      questionNumber: 'FR-Q2',
      title: 'IFRS 16 Leases: Recognition of Lease Liability and ROU Asset',
      paperId: 'FR',
      topicTags: ['Leases', 'IFRS 16'],
      questionType: 'section_a_mcq',
      notes: 'Initial measurement of lease liability is the present value of lease payments discounted at implicit rate.',
      status: 'completed',
      isDoubt: false,
      confidenceRating: 4,
      availableMarks: 2,
      options: [
        { id: 'A', label: 'A', text: 'Fair value of the underlying asset at the commencement date' },
        { id: 'B', label: 'B', text: 'Present value of the lease payments not paid at that date, discounted using the interest rate implicit in the lease' },
        { id: 'C', label: 'C', text: 'Total undiscounted contractual lease payments payable over the term' },
        { id: 'D', label: 'D', text: 'Historical cost of the asset minus residual scrap value' }
      ],
      correctOptionIds: ['B'],
      markingGuide: 'Under IFRS 16 paragraph 26, at the commencement date, a lessee measures the lease liability at the present value of the lease payments that are not paid at that date.',
      attempts: [],
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'q-seed-3',
      questionNumber: 'FR-Q3',
      title: 'IAS 36 Impairment of Assets: Recoverable Amount Definition',
      paperId: 'FR',
      topicTags: ['Impairment', 'IAS 36'],
      questionType: 'section_a_mcq',
      notes: 'Higher of fair value less costs of disposal and value in use.',
      status: 'not_started',
      isDoubt: false,
      confidenceRating: 5,
      availableMarks: 2,
      options: [
        { id: 'A', label: 'A', text: 'Lower of net realizable value and replacement cost' },
        { id: 'B', label: 'B', text: 'Higher of fair value less costs of disposal and value in use' },
        { id: 'C', label: 'C', text: 'Average of carrying amount and liquidation value' },
        { id: 'D', label: 'D', text: 'Discounted future cash flows minus initial capital cost' }
      ],
      correctOptionIds: ['B'],
      markingGuide: 'Under IAS 36 paragraph 18, recoverable amount is the higher of an asset’s or cash-generating unit’s fair value less costs of disposal and its value in use.',
      attempts: [],
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'q-seed-4',
      questionNumber: 'FR-Q4',
      title: 'IFRS 15 Revenue: 5-Step Model Verification',
      paperId: 'FR',
      topicTags: ['Revenue', 'IFRS 15'],
      questionType: 'section_a_mcq',
      notes: 'Step 2 is identify performance obligations; Step 4 is allocate transaction price.',
      status: 'not_started',
      isDoubt: true,
      confidenceRating: 3,
      availableMarks: 2,
      options: [
        { id: 'A', label: 'A', text: '1: Identify contract; 2: Identify performance obligations; 3: Determine transaction price; 4: Allocate price; 5: Recognize revenue' },
        { id: 'B', label: 'B', text: '1: Deliver goods; 2: Invoice client; 3: Receive payment; 4: Recognize profit; 5: File tax return' },
        { id: 'C', label: 'C', text: '1: Draft sales contract; 2: Accrue estimated margin; 3: Deliver goods; 4: Recognize revenue' },
        { id: 'D', label: 'D', text: '1: Determine price; 2: Issue credit memo; 3: Recognize cash flow' }
      ],
      correctOptionIds: ['A'],
      markingGuide: 'IFRS 15 Core 5-step model: (1) Identify contract, (2) Identify performance obligations, (3) Determine transaction price, (4) Allocate transaction price, (5) Recognize revenue when obligation satisfied.',
      attempts: [],
      createdAt: now,
      updatedAt: now
    }
  ]);

    // Seed initial starter written answer
    await db.writtenAnswers.put({
      id: 'ans-seed-1',
      questionId: 'q-seed-1',
      paperId: 'FR',
      title: 'Consolidation Draft Working — Model Answer',
      attemptNumber: 1,
      contentHtml: '<h3>Consolidated Statement of Financial Position</h3><p><strong>Goodwill Working:</strong></p><p>Consideration transferred: $120,000<br/>Fair value of Non-controlling interest (NCI): $30,000<br/>Less: Net assets acquired ($110,000)<br/><strong>Goodwill at acquisition: $40,000</strong></p>',
      plainText: 'Consolidated Statement of Financial Position\nGoodwill Working:\nConsideration transferred: $120,000\nFair value of NCI: $30,000\nLess Net Assets: $110,000\nGoodwill: $40,000',
      wordCount: 32,
      createdAt: now,
      updatedAt: now
    });

    // Seed initial activity log
    await db.activityLogs.put({
      id: 'act-1',
      timestamp: now,
      title: 'Sample Data Initialized',
      description: 'Catchy ACCA profile populated with practice sample questions, study plan, and starter workspace.',
      category: 'paper'
    });
  } catch (err) {
    console.warn('Sample data seed warning:', err);
  }
}

// Helper to log user activity
export async function logActivity(title: string, description: string, category: ActivityLog['category']): Promise<void> {
  try {
    await db.activityLogs.add({
      id: 'act-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      timestamp: new Date().toISOString(),
      title,
      description,
      category
    });
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}

// Save Exam Attempt and update question attempt history
export async function saveExamAttempt(attempt: ExamAttemptRecord): Promise<void> {
  await db.examAttempts.put(attempt);

  // Update question attempt history for each question in the exam
  const now = new Date().toISOString();
  for (const qId of attempt.questionIds) {
    const question = await db.questions.get(qId);
    const resp = attempt.responses[qId];
    if (question && resp) {
      const newAttempt = {
        id: 'att-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        attemptDate: now,
        marksAwarded: resp.marksAwarded,
        totalMarks: question.availableMarks || 2,
        timeSpentSeconds: Math.round(attempt.totalTimeSeconds / Math.max(1, attempt.questionIds.length)),
        remarks: resp.isFlaggedForReview ? 'Flagged during exam attempt' : 'Exam Simulator attempt'
      };
      const updatedAttempts = [newAttempt, ...(question.attempts || [])];
      const newStatus = question.status === 'not_started' ? 'attempted' : question.status;
      await db.questions.update(qId, {
        attempts: updatedAttempts,
        status: newStatus,
        updatedAt: now
      });
    }
  }

  // Log activity
  await logActivity(
    'Exam Completed',
    `Completed ${attempt.paperId} Exam: ${attempt.totalMarksScored}/${attempt.totalMarksAvailable} marks (${attempt.scorePercentage}%).`,
    'exam'
  );
}

// Backup & Restore
export async function createBackupPayload(versionId: string): Promise<BackupPayload> {
  const paperRecords = await db.paperRecords.toArray();
  const questions = await db.questions.toArray();
  const studyMaterials = await db.studyMaterials.toArray();
  const studyPlans = await db.studyPlans.toArray();
  const targets = await db.targets.toArray();
  const activityLogs = await db.activityLogs.toArray();
  const examAttempts = await db.examAttempts.toArray();
  const writtenAnswers = await db.writtenAnswers.toArray();
  const spreadsheets = await db.spreadsheets.toArray();
  const checklists = await db.checklists.toArray();
  const checklistItems = await db.checklistItems.toArray();
  const newsCache = await db.newsCache.toArray();
  const annotations = await db.annotations.toArray();
  const notes = await db.notes.toArray();
  const noteFolders = await db.noteFolders.toArray();
  const chapterMastery = await db.chapterMastery.toArray();

  // Strip large binary blobs from JSON backup for safety & portability
  const sanitizedMaterials = studyMaterials.map(({ pdfData, ...rest }) => rest);

  return {
    version: '2.0.0',
    exportedAt: new Date().toISOString(),
    app: 'Catchy ACCA · by ly77ee',
    qualificationVersionId: versionId,
    paperRecords,
    questions,
    studyMaterials: sanitizedMaterials,
    studyPlans,
    targets,
    activityLogs,
    examAttempts,
    writtenAnswers,
    spreadsheets,
    checklists,
    checklistItems,
    newsCache,
    annotations,
    notes,
    noteFolders,
    chapterMastery
  };
}

export interface RestoreValidationResult {
  isValid: boolean;
  error?: string;
  summary?: {
    papersCount: number;
    questionsCount: number;
    materialsCount: number;
    plansCount: number;
    attemptsCount: number;
    answersCount: number;
    spreadsheetsCount: number;
    checklistsCount: number;
    checklistItemsCount: number;
    exportedAt: string;
  };
}

export function validateBackupPayload(data: unknown): RestoreValidationResult {
  if (!data || typeof data !== 'object') {
    return { isValid: false, error: 'Backup file must contain a valid JSON object.' };
  }

  const payload = data as Partial<BackupPayload>;
  if (!payload.app || !payload.app.includes('Catchy ACCA')) {
    return { isValid: false, error: 'Unrecognized backup file. Expected Catchy ACCA backup signature.' };
  }

  if (!Array.isArray(payload.paperRecords)) {
    return { isValid: false, error: 'Backup is missing or contains invalid paper records.' };
  }

  if (!Array.isArray(payload.questions)) {
    return { isValid: false, error: 'Backup is missing or contains invalid questions data.' };
  }

  return {
    isValid: true,
    summary: {
      papersCount: payload.paperRecords.length,
      questionsCount: payload.questions.length,
      materialsCount: Array.isArray(payload.studyMaterials) ? payload.studyMaterials.length : 0,
      plansCount: Array.isArray(payload.studyPlans) ? payload.studyPlans.length : 0,
      attemptsCount: Array.isArray(payload.examAttempts) ? payload.examAttempts.length : 0,
      answersCount: Array.isArray(payload.writtenAnswers) ? payload.writtenAnswers.length : 0,
      spreadsheetsCount: Array.isArray(payload.spreadsheets) ? payload.spreadsheets.length : 0,
      checklistsCount: Array.isArray(payload.checklists) ? payload.checklists.length : 0,
      checklistItemsCount: Array.isArray(payload.checklistItems) ? payload.checklistItems.length : 0,
      exportedAt: payload.exportedAt || 'Unknown'
    }
  };
}

export async function restoreBackup(payload: BackupPayload, mode: 'merge' | 'overwrite'): Promise<void> {
  if (mode === 'overwrite') {
    await db.transaction('rw', [
      db.paperRecords,
      db.questions,
      db.studyPlans,
      db.targets,
      db.activityLogs,
      db.examAttempts,
      db.writtenAnswers,
      db.spreadsheets,
      db.checklists,
      db.checklistItems,
      db.newsCache,
      db.annotations,
      db.notes,
      db.noteFolders,
      db.chapterMastery
    ], async () => {
      await db.paperRecords.clear();
      await db.questions.clear();
      await db.studyPlans.clear();
      await db.targets.clear();
      await db.activityLogs.clear();
      await db.examAttempts.clear();
      await db.writtenAnswers.clear();
      await db.spreadsheets.clear();
      await db.checklists.clear();
      await db.checklistItems.clear();
      await db.newsCache.clear();
      await db.annotations.clear();
      await db.notes.clear();
      await db.noteFolders.clear();
      await db.chapterMastery.clear();

      if (payload.paperRecords?.length) await db.paperRecords.bulkPut(payload.paperRecords);
      if (payload.questions?.length) await db.questions.bulkPut(payload.questions);
      if (payload.studyPlans?.length) await db.studyPlans.bulkPut(payload.studyPlans);
      if (payload.targets?.length) await db.targets.bulkPut(payload.targets);
      if (payload.activityLogs?.length) await db.activityLogs.bulkPut(payload.activityLogs);
      if (payload.examAttempts?.length) await db.examAttempts.bulkPut(payload.examAttempts);
      if (payload.writtenAnswers?.length) await db.writtenAnswers.bulkPut(payload.writtenAnswers);
      if (payload.spreadsheets?.length) await db.spreadsheets.bulkPut(payload.spreadsheets);
      if (payload.checklists?.length) await db.checklists.bulkPut(payload.checklists);
      if (payload.checklistItems?.length) await db.checklistItems.bulkPut(payload.checklistItems);
      if (payload.newsCache?.length) await db.newsCache.bulkPut(payload.newsCache);
      if (payload.annotations?.length) await db.annotations.bulkPut(payload.annotations);
      if (payload.notes?.length) await db.notes.bulkPut(payload.notes);
      if (payload.noteFolders?.length) await db.noteFolders.bulkPut(payload.noteFolders);
      if (payload.chapterMastery?.length) await db.chapterMastery.bulkPut(payload.chapterMastery);
    });
  } else {
    // Merge mode: upsert records
    if (payload.paperRecords?.length) await db.paperRecords.bulkPut(payload.paperRecords);
    if (payload.questions?.length) await db.questions.bulkPut(payload.questions);
    if (payload.studyPlans?.length) await db.studyPlans.bulkPut(payload.studyPlans);
    if (payload.targets?.length) await db.targets.bulkPut(payload.targets);
    if (payload.examAttempts?.length) await db.examAttempts.bulkPut(payload.examAttempts);
    if (payload.writtenAnswers?.length) await db.writtenAnswers.bulkPut(payload.writtenAnswers);
    if (payload.spreadsheets?.length) await db.spreadsheets.bulkPut(payload.spreadsheets);
    if (payload.checklists?.length) await db.checklists.bulkPut(payload.checklists);
    if (payload.checklistItems?.length) await db.checklistItems.bulkPut(payload.checklistItems);
    if (payload.newsCache?.length) await db.newsCache.bulkPut(payload.newsCache);
    if (payload.annotations?.length) await db.annotations.bulkPut(payload.annotations);
    if (payload.notes?.length) await db.notes.bulkPut(payload.notes);
    if (payload.noteFolders?.length) await db.noteFolders.bulkPut(payload.noteFolders);
    if (payload.chapterMastery?.length) await db.chapterMastery.bulkPut(payload.chapterMastery);
  }

  await logActivity(
    'Backup Restored',
    `Successfully restored backup from ${payload.exportedAt} (${mode} mode).`,
    'backup'
  );
}

// ============================================================================
// Document Annotations & Highlighting Helpers
// ============================================================================

export async function getAnnotationsForMaterial(materialId: string): Promise<DocumentAnnotation[]> {
  try {
    return await db.annotations.where('materialId').equals(materialId).toArray();
  } catch (err) {
    console.error('Failed to get annotations for material:', err);
    return [];
  }
}

export async function saveAnnotation(annotation: DocumentAnnotation): Promise<void> {
  try {
    await db.annotations.put(annotation);
  } catch (err) {
    console.error('Failed to save annotation:', err);
  }
}

export async function deleteAnnotation(id: string): Promise<void> {
  try {
    await db.annotations.delete(id);
  } catch (err) {
    console.error('Failed to delete annotation:', err);
  }
}

// ============================================================================
// Catchy Notes & Folders Helpers
// ============================================================================

export async function getNotes(options?: {
  folderId?: string | null;
  includeDeleted?: boolean;
  searchQuery?: string;
}): Promise<CatchyNote[]> {
  try {
    let all = await db.notes.toArray();

    if (!options?.includeDeleted) {
      all = all.filter(n => !n.isDeleted);
    } else if (options?.includeDeleted === true) {
      all = all.filter(n => n.isDeleted);
    }

    if (options?.folderId !== undefined && options?.folderId !== null) {
      all = all.filter(n => n.folderId === options.folderId);
    }

    if (options?.searchQuery && options.searchQuery.trim()) {
      const q = options.searchQuery.toLowerCase().trim();
      all = all.filter(n =>
        n.title.toLowerCase().includes(q) ||
        n.plainText.toLowerCase().includes(q)
      );
    }

    // Default sorting: pinned first, then newest updatedAt
    all.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    return all;
  } catch (err) {
    console.error('Failed to fetch notes:', err);
    return [];
  }
}

export async function saveNote(note: CatchyNote): Promise<void> {
  try {
    await db.notes.put(note);
  } catch (err) {
    console.error('Failed to save note:', err);
    throw err;
  }
}

export async function deleteNote(id: string, permanent: boolean = false): Promise<void> {
  try {
    if (permanent) {
      await db.notes.delete(id);
    } else {
      const note = await db.notes.get(id);
      if (note) {
        await db.notes.put({
          ...note,
          isDeleted: true,
          deletedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }
  } catch (err) {
    console.error('Failed to delete note:', err);
    throw err;
  }
}

export async function restoreNote(id: string): Promise<void> {
  try {
    const note = await db.notes.get(id);
    if (note) {
      await db.notes.put({
        ...note,
        isDeleted: false,
        deletedAt: undefined,
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.error('Failed to restore note:', err);
    throw err;
  }
}

export async function getNoteFolders(): Promise<NoteFolder[]> {
  try {
    const folders = await db.noteFolders.toArray();
    folders.sort((a, b) => (a.order || 0) - (b.order || 0) || a.name.localeCompare(b.name));
    return folders;
  } catch (err) {
    console.error('Failed to fetch note folders:', err);
    return [];
  }
}

export async function saveNoteFolder(folder: NoteFolder): Promise<void> {
  try {
    await db.noteFolders.put(folder);
  } catch (err) {
    console.error('Failed to save note folder:', err);
    throw err;
  }
}

export async function deleteNoteFolder(
  folderId: string,
  strategy: 'move_to_parent' | 'delete_notes' = 'move_to_parent'
): Promise<void> {
  try {
    const targetFolder = await db.noteFolders.get(folderId);
    const parentId = targetFolder?.parentId || null;

    // Find all subfolders and notes in this folder
    const allNotes = await db.notes.where('folderId').equals(folderId).toArray();
    const allSubfolders = await db.noteFolders.where('parentId').equals(folderId).toArray();

    if (strategy === 'move_to_parent') {
      // Move notes to parent folder or root
      for (const note of allNotes) {
        await db.notes.put({
          ...note,
          folderId: parentId,
          updatedAt: new Date().toISOString(),
        });
      }
      // Re-parent subfolders
      for (const sub of allSubfolders) {
        await db.noteFolders.put({
          ...sub,
          parentId: parentId,
          updatedAt: new Date().toISOString(),
        });
      }
    } else {
      // Soft-delete notes inside this folder
      for (const note of allNotes) {
        await db.notes.put({
          ...note,
          isDeleted: true,
          deletedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }

    // Delete the folder itself
    await db.noteFolders.delete(folderId);
  } catch (err) {
    console.error('Failed to delete note folder:', err);
    throw err;
  }
}

// ============================================================================
// Multiple Exam Targets Helpers
// ============================================================================

export async function getTargets(): Promise<StudentTarget[]> {
  try {
    return await db.targets.toArray();
  } catch (err) {
    console.error('Failed to fetch exam targets:', err);
    return [];
  }
}

export async function saveTarget(target: StudentTarget): Promise<void> {
  try {
    const paper = target.paperId || target.nextExamPaperId || 'FR';
    const date = target.examDate || target.nextExamDate;
    const now = new Date().toISOString();

    const normalized: StudentTarget = {
      ...target,
      paperId: paper,
      nextExamPaperId: paper,
      examDate: date,
      nextExamDate: date,
      createdAt: target.createdAt || now,
      updatedAt: now,
    };
    await db.targets.put(normalized);
  } catch (err) {
    console.error('Failed to save exam target:', err);
    throw err;
  }
}

export async function deleteTarget(id: string): Promise<void> {
  try {
    await db.targets.delete(id);
  } catch (err) {
    console.error('Failed to delete exam target:', err);
    throw err;
  }
}

// ============================================================================
// Syllabus Chapter Mastery Helpers
// ============================================================================

export async function getChapterMastery(paperId?: string): Promise<ChapterMasteryRecord[]> {
  if (paperId) {
    return db.chapterMastery.where('paperId').equals(paperId.toUpperCase()).toArray();
  }
  return db.chapterMastery.toArray();
}

export async function setChapterStatus(
  paperId: string,
  chapterNumber: number,
  chapterTitle: string,
  status: ChapterMasteryStatus,
  notes?: string
): Promise<void> {
  const upperPaper = paperId.toUpperCase();
  const id = `${upperPaper}-ch-${chapterNumber}`;
  const now = new Date().toISOString();
  await db.chapterMastery.put({
    id,
    paperId: upperPaper,
    chapterNumber,
    chapterTitle,
    status,
    notes,
    updatedAt: now
  });
}

export async function resetChapterStatus(id: string): Promise<void> {
  await db.chapterMastery.delete(id);
}
