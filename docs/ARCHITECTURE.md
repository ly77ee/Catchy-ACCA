# Catchy ACCA · Architecture

## 1. System Overview
Catchy ACCA is an offline-first single-page web/desktop application built with React 18, TypeScript, Tailwind CSS, and IndexedDB (via Dexie.js).

```
                      +---------------------------------------+
                      |         Catchy ACCA (React 18)        |
                      +---------------------------------------+
                                          |
        +------------------+--------------+-------------+------------------+
        |                  |                            |                  |
+---------------+  +-------------------+        +---------------+  +---------------+
| UI & Layout   |  | Shared Question   |        | Productivity  |  | Optional AI   |
| (Navigation,  |  | Repository &      |        | Workspaces    |  | Layer         |
| Dashboard,    |  | Extraction Engine |        | (Word/TipTap, |  | (Offline KB,  |
| My ACCA)      |  | (PDF.js, Index)   |        | Excel Engine) |  | Ollama, Cloud)|
+---------------+  +-------------------+        +---------------+  +---------------+
        |                  |                            |                  |
        +------------------+--------------+-------------+------------------+
                                          |
                      +---------------------------------------+
                      |       Dexie.js IndexedDB Store        |
                      | (PaperRecords, Questions, Materials,   |
                      |  ExamAttempts, Answers, Spreadsheets) |
                      +---------------------------------------+
```

## 2. Architectural Boundaries
1. **Presentation Layer (`src/components/`):**
   - Pure React views organized by domain: `dashboard`, `qualification`, `study-materials`, `exam`, `questions`, `spreadsheet`, `writer`, `revision`, `planner`, `topics`, `ai`, `settings`, `help`.
2. **State & Reactive Persistence Layer (`src/db/`):**
   - Single canonical Dexie database (`CatchyAccaDB`) with indexed stores and schema migration support.
   - Reactive querying via `useLiveQuery` hooks ensuring instantaneous UI synchronization.
3. **Core Processing Engines (`src/utils/`):**
   - `pdfExtractor.ts`: Multi-stage document parsing, index/contents mapping, question-boundary detection, and answer matching.
   - `formulaEngine.ts`: Deterministic financial and spreadsheet expression parser and recalculation graph.
   - `examScoring.ts`: Objective scoring, partial credit evaluation, and question navigation state.
   - `answerReviewEngine.ts`: Marking guide comparison, misconception detection, and calculation verification.
   - `aiClient.ts`: Privacy-bounded dispatching between offline tutor, Ollama, and external providers with user consent checks.
4. **Domain Configuration (`src/config/`):**
   - `accaStructure.ts`: Versioned qualification structures (`current_2024_2026`, `redesigned_future`).
   - `syllabusTopics.ts`: Official ACCA syllabus taxonomies and accounting standard hierarchies.

## 3. Data Flow & Source of Truth
Every feature (Questions page, Exam Simulator, Topic Grouping, Exam Planner, Revision Analytics) queries the single canonical question table (`db.questions`). Creating or editing a question in any view immediately reflects across all features without duplicate stores or manual synchronization.
