export type StageId = 'applied_knowledge' | 'applied_skills' | 'strategic_professional_essentials' | 'strategic_professional_options' | 'epsm';

export type PaperStatus = 'not_started' | 'in_progress' | 'passed' | 'exempt';

export type QuestionStatus = 'not_started' | 'attempted' | 'completed' | 'needs_review';

export type QuestionType = 'section_a_mcq' | 'section_b_case' | 'section_c_constructed' | 'other';

export interface PaperConfig {
  id: string; // e.g. 'BT', 'FR', 'SBL'
  code: string; // e.g. 'BT / F1'
  name: string; // e.g. 'Business and Technology'
  stageId: StageId;
  description: string;
  isOptional?: boolean; // For Strategic Professional options
}

export interface StageConfig {
  id: StageId;
  name: string;
  description: string;
  requiredCount: number; // how many papers required to complete this stage
  order: number;
}

export interface QualificationVersion {
  versionId: string; // 'current_2024_2026' | 'redesigned_future'
  name: string;
  effectiveFrom: string;
  description: string;
  totalRequiredExams: number; // 13 exam papers (+ EPSM)
  stages: StageConfig[];
  papers: PaperConfig[];
}

export interface StudentPaperRecord {
  paperId: string;
  status: PaperStatus;
  examSession?: string; // e.g. "March 2027", "September 2026"
  targetExamDate?: string;
  score?: number; // e.g. 72
  targetScore?: number; // e.g. 65
  notes?: string;
  updatedAt: string;
}

export interface StudentTarget {
  id: string;
  nextExamPaperId?: string;
  nextExamDate?: string;
  targetScore?: number;
  weeklyStudyHours?: number;
  notes?: string;
}

export interface StudyPlanItem {
  id: string;
  title: string;
  paperId?: string;
  estimatedMinutes?: number;
  completed: boolean;
  dueDate: string; // YYYY-MM-DD
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  title: string;
  description: string;
  category: 'paper' | 'question' | 'document' | 'plan' | 'backup';
}

export interface StudyMaterial {
  id: string;
  title: string;
  fileName: string;
  fileSize: number;
  totalPages: number;
  paperId?: string;
  tags: string[];
  addedAt: string;
  pdfData?: Blob | ArrayBuffer; // Stored in IndexedDB
}

export interface QuestionAttempt {
  id: string;
  attemptDate: string;
  marksAwarded?: number;
  totalMarks?: number;
  timeSpentSeconds?: number;
  remarks?: string;
}

export interface QuestionRecord {
  id: string;
  questionNumber: string;
  title: string;
  paperId: string;
  sourceMaterialId?: string; // Link to StudyMaterial.id
  sourcePage?: number;
  topicTags: string[];
  questionType: QuestionType;
  notes: string;
  status: QuestionStatus;
  isDoubt: boolean;
  confidenceRating: number; // 1 to 5
  attempts: QuestionAttempt[];
  createdAt: string;
  updatedAt: string;
}

export interface BackupPayload {
  version: string;
  exportedAt: string;
  app: string;
  qualificationVersionId: string;
  paperRecords: StudentPaperRecord[];
  questions: QuestionRecord[];
  studyMaterials: Omit<StudyMaterial, 'pdfData'>[]; // metadata exported in JSON
  studyPlans: StudyPlanItem[];
  targets: StudentTarget[];
  activityLogs: ActivityLog[];
}
