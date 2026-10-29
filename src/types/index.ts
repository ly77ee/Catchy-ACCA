export type StageId = 'applied_knowledge' | 'applied_skills' | 'strategic_professional_essentials' | 'strategic_professional_options' | 'epsm';

export type PaperStatus = 'not_started' | 'in_progress' | 'passed' | 'exempt';

export type QuestionStatus = 'not_started' | 'attempted' | 'completed' | 'needs_review';

export type QuestionPublishStatus = 'draft' | 'published' | 'archived';

export type QuestionDifficulty = 'easy' | 'medium' | 'hard';

export interface QuestionExhibit {
  id: string;
  title: string;
  content: string;
}

export type QuestionType =
  | 'section_a_mcq'
  | 'section_b_case'
  | 'section_c_constructed'
  | 'calculation'
  | 'multi_select'
  | 'other';

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
  topic?: string;
  estimatedMinutes?: number;
  completed: boolean;
  dueDate: string; // YYYY-MM-DD
  startTime?: string; // HH:mm e.g. "09:00"
  endTime?: string; // HH:mm e.g. "10:30"
  notes?: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  title: string;
  description: string;
  category: 'paper' | 'question' | 'document' | 'plan' | 'backup' | 'exam' | 'workspace' | 'ai';
}

export interface StudyMaterial {
  id: string;
  title: string;
  fileName: string;
  fileSize: number;
  totalPages: number;
  paperId?: string;
  qualificationVersionId?: string;
  materialType?: string;
  tags: string[];
  addedAt: string;
  pdfData?: Blob | ArrayBuffer; // Stored in IndexedDB
}

export interface QuestionOption {
  id: string; // e.g. 'A', 'B', 'C', 'D'
  label: string; // e.g. 'A'
  text: string;
}

export interface SubQuestion {
  id: string;
  label: string; // e.g. '(a)'
  prompt: string;
  marks?: number;
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
  qualificationVersionId?: string;
  syllabusArea?: string;
  topic?: string;
  sourceMaterialId?: string; // Link to StudyMaterial.id
  sourcePage?: number;
  sourcePageEnd?: number;
  topicTags: string[];
  questionType: QuestionType;
  difficulty?: QuestionDifficulty;
  suggestedMinutes?: number;
  scenario?: string; // Long scenario or background
  content?: string; // Detailed question text
  exhibits?: QuestionExhibit[];
  modelAnswer?: string; // Separated author model answer
  rubric?: string; // Marking rubric
  publishStatus?: QuestionPublishStatus;
  notes: string;
  status: QuestionStatus;
  isDoubt: boolean;
  confidenceRating: number; // 1 to 5
  attempts: QuestionAttempt[];
  options?: QuestionOption[]; // Objective options
  correctOptionIds?: string[]; // Correct answer key for auto-marking
  availableMarks?: number; // e.g. 2, 10, 20
  subQuestions?: SubQuestion[];
  markingGuide?: string; // Solution guide / rationale
  solutionPage?: number;
  matchStatus?: 'verified' | 'high_confidence' | 'needs_review' | 'unmatched';
  extractedFromPdf?: boolean;
  needsReview?: boolean;
  createdAt: string;
  updatedAt: string;
}

// Phase 2: Exam Simulator Types
export type ExamMode = 'timed' | 'untimed';
export type FeedbackMode = 'immediate' | 'delayed';
export type QuestionOrdering = 'sequential' | 'randomized' | 'by_topic';

export interface ExamConfig {
  paperId: string;
  sourceMaterialId?: string;
  selectedQuestionIds?: string[];
  topicFilters?: string[];
  questionTypeFilter?: 'all' | 'objective' | 'written' | 'calculation';
  questionCount: number;
  ordering: QuestionOrdering;
  mode: ExamMode;
  durationMinutes?: number;
  feedbackMode: FeedbackMode;
}

export interface StudentExamResponse {
  questionId: string;
  selectedOptionIds?: string[]; // For objective single/multi select
  writtenAnswer?: string; // For essay or calculation
  isFlaggedForReview: boolean;
  marksAwarded?: number;
  isAutoMarked?: boolean;
  answeredAt?: string;
}

export interface ExamAttemptRecord {
  id: string;
  paperId: string;
  startedAt: string;
  completedAt?: string;
  totalTimeSeconds: number;
  config: ExamConfig;
  questionIds: string[];
  responses: Record<string, StudentExamResponse>;
  totalMarksAvailable: number;
  totalMarksScored: number;
  scorePercentage: number;
  status: 'in_progress' | 'completed' | 'abandoned';
}

// Extraction Types
export interface ExtractedQuestionDraft {
  tempId: string;
  questionNumber: string;
  title: string;
  prompt: string;
  paperId: string;
  sourcePageStart: number;
  sourcePageEnd: number;
  sourceMaterialId: string;
  questionType: QuestionType;
  options: QuestionOption[];
  correctOptionIds: string[];
  availableMarks: number;
  topicSuggestions: string[];
  subQuestions?: SubQuestion[];
  markingGuide?: string;
  solutionPage?: number;
  matchStatus?: 'verified' | 'high_confidence' | 'needs_review' | 'unmatched';
  confidenceScore: number; // 0-1
  warningMessages: string[];
  isApproved: boolean;
}

// Phase 3: Answer Writer Types
export interface WrittenAnswerDraft {
  id: string;
  questionId?: string;
  paperId: string;
  title: string;
  attemptNumber: number;
  contentJson?: any;
  contentHtml: string;
  plainText: string;
  wordCount: number;
  createdAt: string;
  updatedAt: string;
}

// Phase 3: Spreadsheet Workspace Types
export type CellFormat = 'general' | 'currency' | 'percent' | 'number' | 'bold' | 'header';

export interface CellData {
  raw: string; // Raw input e.g. "=SUM(A1:A5)" or "100" or "Revenue"
  computed?: any; // Evaluated value e.g. 500 or "#DIV/0!"
  format?: CellFormat;
}

export interface SpreadsheetSheet {
  id: string;
  name: string;
  cells: Record<string, CellData>; // keyed by cell address "A1", "B2", etc.
  rowCount: number;
  colCount: number;
}

export interface SpreadsheetWorkbook {
  id: string;
  questionId?: string;
  paperId: string;
  examAttemptId?: string;
  title: string;
  activeSheetIndex: number;
  sheets: SpreadsheetSheet[];
  fortuneData?: any[];
  createdAt: string;
  updatedAt: string;
}

// Phase 4: AI & Quality Types
export type AIProviderType = 'offline_local' | 'ollama' | 'openai' | 'gemini' | 'anthropic';

export interface AIProviderConfig {
  provider: AIProviderType;
  endpointUrl?: string; // e.g. http://localhost:11434 for Ollama
  apiKey?: string;
  modelName: string;
  hasUserConsent: boolean;
}

export interface SourceCitation {
  documentTitle: string;
  pageNumber?: number;
  snippet: string;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  sourceCitations?: SourceCitation[];
  isSourceDerived?: boolean;
}

export interface CalculationCheckDiscrepancy {
  item: string;
  expected: string | number;
  actual: string | number;
  explanation: string;
}

export interface AnswerReviewResult {
  id: string;
  questionId: string;
  evaluatedAt: string;
  overallSummary: string;
  technicalPointsFound: string[];
  technicalPointsMissing: string[];
  potentialAccountingErrors: string[];
  unsupportedAssertions: string[];
  differencesFromSolution: string[];
  validAlternativePresentations: string[];
  calculationDiscrepancies: CalculationCheckDiscrepancy[];
  disclaimer: string;
}

export interface RevisionTopicStat {
  topicName: string;
  paperId: string;
  totalAttempts: number;
  averageScorePercent: number;
  doubtsCount: number;
  status: 'mastered' | 'solid' | 'needs_revision';
}

// Markdown Study Checklist Types
export interface ChecklistItem {
  id: string;
  checklistId: string;
  paperId: string;
  syllabusArea?: string;
  topic?: string;
  title: string;
  completed: boolean;
  order: number;
  level: number; // 0 = heading 1 / paper, 1 = heading 2 / syllabus area, 2 = heading 3 / topic, 3 = item
  isHeader?: boolean;
  rawMarkdown?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HighlightRect {
  left: number; // % relative to page viewport width (0 - 100)
  top: number; // % relative to page viewport height (0 - 100)
  width: number; // % relative to page viewport width (0 - 100)
  height: number; // % relative to page viewport height (0 - 100)
}

export type HighlightColor = 'yellow' | 'green' | 'pink' | 'blue';

export interface DocumentAnnotation {
  id: string;
  materialId: string;
  pageNumber: number;
  text: string;
  color: HighlightColor;
  rects: HighlightRect[];
  createdAt: string;
}

export interface ChecklistRecord {
  id: string;
  title: string;
  paperId: string;
  qualificationVersionId?: string;
  rawMarkdown: string;
  totalTasks: number;
  completedTasks: number;
  createdAt: string;
  updatedAt: string;
}

// ACCA News Types
export interface AccaNewsItem {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  summary: string;
  category: 'qualification' | 'exam' | 'syllabus' | 'general';
  isOfficial: boolean;
  fetchedAt?: string;
}

// Catchy Notes Types
export interface NoteFolder {
  id: string;
  name: string;
  parentId?: string | null;
  order?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CatchyNote {
  id: string;
  title: string;
  contentHtml: string;
  plainText: string;
  folderId?: string | null; // null/undefined for All Notes / unfiled
  isPinned?: boolean;
  isDeleted?: boolean; // in Recently Deleted
  deletedAt?: string;
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
  studyMaterials: Omit<StudyMaterial, 'pdfData'>[];
  studyPlans: StudyPlanItem[];
  targets: StudentTarget[];
  activityLogs: ActivityLog[];
  examAttempts?: ExamAttemptRecord[];
  writtenAnswers?: WrittenAnswerDraft[];
  spreadsheets?: SpreadsheetWorkbook[];
  checklists?: ChecklistRecord[];
  checklistItems?: ChecklistItem[];
  newsCache?: AccaNewsItem[];
  annotations?: DocumentAnnotation[];
  notes?: CatchyNote[];
  noteFolders?: NoteFolder[];
  aiConfig?: AIProviderConfig;
  answerReviews?: AnswerReviewResult[];
}
