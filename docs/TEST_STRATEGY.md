# Catchy ACCA · Test Strategy & Verification Plan

## 1. Quality Philosophy
Testing is continuous and non-negotiable. Every feature must be verified through automated tests that assert actual calculated values, persistent records, and failure recovery.

## 2. Test Pyramid & Execution
1. **Unit & Engine Tests:**
   - Formula Engine (`src/test/formulaEngine.test.ts`): Arithmetic, cell references, ranges, `SUM`, `AVERAGE`, `MIN`, `MAX`, `COUNT`, `COUNTA`, `IF`, `NPV`, `IRR`, `PMT`, `PV`, `FV`, error codes.
   - Exam Scoring (`src/test/examScoring.test.ts`): Single and multi-select partial credit, time tracking, scoring accuracy.
   - Qualification Structure (`src/test/accaStructure.test.ts`): Progress math, transition between 2024–2026 and redesigned future structures.
   - Answer Review Engine (`src/test/answerReviewEngine.test.ts`): Misconceptions (goodwill, leases), technical keywords, calculation discrepancy checking.
2. **Integration Tests:**
   - Database Persistence (`src/test/integration.test.tsx`): IndexedDB transactions via `fake-indexeddb`, survival across simulated app reloads.
   - Exam Simulator (`src/test/phase2Integration.test.tsx`): Complete exam session, attempt logging, and dashboard metric synchronization.
   - Workspaces (`src/test/phase3Integration.test.tsx`): Word drafts, multiple attempt versioning, spreadsheet workbook persistence.
   - Revision & AI (`src/test/phase4Integration.test.tsx`, `src/test/aiAssistant.test.ts`, `src/test/revisionAnalytics.test.ts`): Mistake journal filtering, weak topic analysis, offline AI grounding, privacy consent enforcement.
   - Backup & Restore (`src/test/backupValidation.test.ts`): Pre-flight JSON validation, merge vs overwrite modes.
3. **End-to-End Workflows:**
   - Document upload → Index extraction → Question verification → Practice in Exam Environment → Answer drafting & Workings grid → Review against model solution → Mistake journal recording → Planner task update.

## 3. Running Test Suites
```bash
# Run all automated test suites with Vitest
npm test

# Run TypeScript type check and production bundle build
npm run build
```
