import Dexie, { type Table } from 'dexie';
import {
  StudentPaperRecord,
  StudyMaterial,
  QuestionRecord,
  StudyPlanItem,
  ActivityLog,
  StudentTarget,
  BackupPayload
} from '../types';

export class CatchyAccaDatabase extends Dexie {
  paperRecords!: Table<StudentPaperRecord, string>;
  studyMaterials!: Table<StudyMaterial, string>;
  questions!: Table<QuestionRecord, string>;
  studyPlans!: Table<StudyPlanItem, string>;
  activityLogs!: Table<ActivityLog, string>;
  targets!: Table<StudentTarget, string>;

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
  }
}

export const db = new CatchyAccaDatabase();

// Initial database seeding if empty
export async function initializeDatabase(): Promise<void> {
  const paperCount = await db.paperRecords.count();
  if (paperCount === 0) {
    const now = new Date().toISOString();
    // Default initial sample records for a beginner ACCA student
    const initialPapers: StudentPaperRecord[] = [
      {
        paperId: 'BT',
        status: 'passed',
        score: 78,
        examSession: 'December 2025',
        notes: 'Passed on first attempt. Solid foundation in business structure and IT governance.',
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

    await db.paperRecords.bulkPut(initialPapers);

    // Initial student target
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

    // Initial starter question
    await db.questions.put({
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
    });

    // Seed initial activity log
    await db.activityLogs.put({
      id: 'act-1',
      timestamp: now,
      title: 'Workspace Initialized',
      description: 'Catchy ACCA profile created with initial progress and study plan.',
      category: 'paper'
    });
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

// Backup & Restore
export async function createBackupPayload(versionId: string): Promise<BackupPayload> {
  const paperRecords = await db.paperRecords.toArray();
  const questions = await db.questions.toArray();
  const studyMaterials = await db.studyMaterials.toArray();
  const studyPlans = await db.studyPlans.toArray();
  const targets = await db.targets.toArray();
  const activityLogs = await db.activityLogs.toArray();

  // Strip large binary blobs from JSON backup for safety & portability
  const sanitizedMaterials = studyMaterials.map(({ pdfData, ...rest }) => rest);

  return {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    app: 'Catchy ACCA · by ly77ee',
    qualificationVersionId: versionId,
    paperRecords,
    questions,
    studyMaterials: sanitizedMaterials,
    studyPlans,
    targets,
    activityLogs
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
      exportedAt: payload.exportedAt || 'Unknown'
    }
  };
}

export async function restoreBackup(payload: BackupPayload, mode: 'merge' | 'overwrite'): Promise<void> {
  if (mode === 'overwrite') {
    await db.transaction('rw', [db.paperRecords, db.questions, db.studyPlans, db.targets, db.activityLogs], async () => {
      await db.paperRecords.clear();
      await db.questions.clear();
      await db.studyPlans.clear();
      await db.targets.clear();
      await db.activityLogs.clear();

      if (payload.paperRecords?.length) await db.paperRecords.bulkPut(payload.paperRecords);
      if (payload.questions?.length) await db.questions.bulkPut(payload.questions);
      if (payload.studyPlans?.length) await db.studyPlans.bulkPut(payload.studyPlans);
      if (payload.targets?.length) await db.targets.bulkPut(payload.targets);
      if (payload.activityLogs?.length) await db.activityLogs.bulkPut(payload.activityLogs);
    });
  } else {
    // Merge mode: upsert records
    if (payload.paperRecords?.length) await db.paperRecords.bulkPut(payload.paperRecords);
    if (payload.questions?.length) await db.questions.bulkPut(payload.questions);
    if (payload.studyPlans?.length) await db.studyPlans.bulkPut(payload.studyPlans);
    if (payload.targets?.length) await db.targets.bulkPut(payload.targets);
  }

  await logActivity(
    'Backup Restored',
    `Successfully restored backup from ${payload.exportedAt} (${mode} mode).`,
    'backup'
  );
}
