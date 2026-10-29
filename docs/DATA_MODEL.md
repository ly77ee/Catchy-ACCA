# Catchy ACCA · Canonical Data Model

## 1. Relational Entities (IndexedDB `CatchyAccaDB`)

### `StudentPaperRecord`
Tracks individual qualification paper progression:
- `paperId`: string (Primary key: e.g. "FR", "SBR")
- `status`: `'not_started' | 'in_progress' | 'passed' | 'exempt'`
- `examSession`?: string (e.g. "March 2027")
- `targetExamDate`?: string (ISO date)
- `score`?: number (Verified mark achieved)
- `targetScore`?: number (Target percentage)
- `notes`?: string
- `updatedAt`: string (ISO timestamp)

### `QuestionRecord` (Canonical Question Repository)
The single source of truth for all study, exam, and revision tools:
- `id`: string (UUID)
- `questionNumber`: string (e.g. "Q1", "24.1")
- `title`: string
- `paperId`: string
- `sourceMaterialId`?: string (Foreign key to `StudyMaterial.id`)
- `sourcePage`?: number (Physical PDF start page)
- `sourcePageEnd`?: number (Physical PDF end page)
- `topicTags`: string[] (e.g. ["IFRS 16", "Leases"])
- `questionType`: `'section_a_mcq' | 'section_b_case' | 'section_c_constructed' | 'calculation' | 'multi_select' | 'other'`
- `notes`: string
- `status`: `'not_started' | 'attempted' | 'completed' | 'needs_review'`
- `isDoubt`: boolean (Mistake & Doubt journal flag)
- `confidenceRating`: number (1 to 5)
- `availableMarks`?: number
- `options`?: `QuestionOption[]`
- `correctOptionIds`?: string[]
- `subQuestions`?: `SubQuestion[]`
- `markingGuide`?: string (Benchmark answer or marking rubric)
- `solutionPage`?: number (PDF page where solution is located)
- `matchStatus`?: `'verified' | 'high_confidence' | 'needs_review' | 'unmatched'`
- `createdAt`: string
- `updatedAt`: string

### `StudyPlanItem` (Exam Planner Tasks)
- `id`: string (UUID)
- `title`: string
- `paperId`?: string
- `questionId`?: string (Link to canonical question)
- `estimatedMinutes`?: number
- `completed`: boolean
- `dueDate`: string (YYYY-MM-DD)
- `priority`: `'high' | 'medium' | 'low'`
- `createdAt`: string

### `ExamAttemptRecord`
- `id`: string (UUID)
- `paperId`: string
- `startedAt`: string
- `completedAt`?: string
- `totalTimeSeconds`: number
- `config`: `ExamConfig`
- `questionIds`: string[]
- `responses`: Record<string, StudentExamResponse>
- `totalMarksAvailable`: number
- `totalMarksScored`: number
- `scorePercentage`: number
- `status`: `'in_progress' | 'completed' | 'abandoned'`

### `WrittenAnswerDraft`
- `id`: string (UUID)
- `questionId`?: string
- `paperId`: string
- `title`: string
- `attemptNumber`: number
- `contentHtml`: string
- `plainText`: string
- `wordCount`: number
- `createdAt`: string
- `updatedAt`: string

### `SpreadsheetWorkbook`
- `id`: string (UUID)
- `questionId`?: string
- `paperId`: string
- `title`: string
- `activeSheetIndex`: number
- `sheets`: `SpreadsheetSheet[]` (keyed cell data with formula and computed values)
- `createdAt`: string
- `updatedAt`: string
