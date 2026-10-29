# Catchy ACCA · by ly77ee — Product Specification

## 1. Product Objective
Catchy ACCA is an open-source, local-first desktop study companion and CBE (Computer Based Examination) practice simulator for ACCA (Association of Chartered Certified Accountants) students worldwide.

The application unifies:
- ACCA qualification tracking and progress visualization.
- Local PDF study material repository with Mozilla PDF.js canvas rendering.
- Intelligent multi-page question extraction with contents/index parsing and question-to-answer matching.
- Shared canonical question repository linking all study, exam, and revision tools.
- Real CBE exam environment supporting objective questions (single & multi-select with automated partial credit marking), constructed responses, and workings.
- Excel-compatible spreadsheet workspace with a deterministic formula engine (`SUM`, `AVERAGE`, `MIN`, `MAX`, `COUNT`, `COUNTA`, `IF`, `NPV`, `IRR`, `PMT`, `PV`, `FV`, and cross-sheet references).
- TipTap-powered Word-like rich-text answer editor with draft auto-saving, multiple attempt tracking, and structured exports.
- Source-grounded answer review and deterministic calculation discrepancy detection.
- Topic grouping and accounting standard hierarchy (Paper → Topic → Standard → Subtopic → Question).
- Exam planner with actionable study tasks and real-time dashboard scheduling.
- Revision analytics with mistake & doubt journals, topic mastery tracking, and spaced repetition.
- Optional, privacy-preserving AI assistance (Built-in offline tutor default, local Ollama, and user-provided cloud API keys with explicit consent).

## 2. Core Personas
1. **Applied Knowledge Student (BT, MA, FA):** Needs fast objective question drilling, instant feedback, and clear progress through foundation papers.
2. **Applied Skills Student (PM, TX, FR, AA, FM):** Needs mixed objective and constructed response practice, integrated spreadsheet calculations (NPV, WACC, ratios), and marking guide comparisons.
3. **Strategic Professional Student (SBL, SBR, AFM, APM, ATX, AAA):** Needs 20-mark and 50-mark case study workspaces, split-screen word/spreadsheet environments, deep accounting standard referencing, and revision pacing.

## 3. Permanent Design System
- **Desktop-First Minimalism:** Clean, high-contrast dark palette with charcoal slate surfaces (`#141419`, `#1e1e24`, `#2a2a32`) and ACCA signature red accents (`#c00000`).
- **Brand Identity:** Typographic wordmark **Catchy ACCA** with creator attribution **by ly77ee**.
- **Qualification Circular Indicator:** Single large circular progress ring on Home indicating verified passed exams (e.g. `7 / 13`). Individual paper progress is isolated to My ACCA.
- **Local-First Privacy:** 100% of user documents, questions, answers, spreadsheets, and exam logs reside on-device in browser IndexedDB. Zero cloud telemetry or mandatory subscriptions.
