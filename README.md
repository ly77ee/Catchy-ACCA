# Catchy ACCA · by ly77ee

> A clean, modern, beginner-friendly desktop study companion and exam progress manager for ACCA students worldwide. Built with React, TypeScript, Tailwind CSS, TipTap rich text, and local-first IndexedDB persistence.

---

## 📖 Product Objective

**Catchy ACCA** gives ACCA students a dedicated, private, and distraction-free workspace on their computer. Students can track their qualification progress, import their study materials, extract questions intelligently, practice in a faithful CBE exam simulator, write constructed responses, build spreadsheet financial workings, and prepare systematically for upcoming exam sessions.

All documents, questions, exam responses, written answers, and spreadsheets remain **100% on your device** in local browser storage (IndexedDB). No cloud account, third-party login, or paid AI subscription is required.

---

## 🎨 Visual Identity & Principles

- **ACCA-Inspired Palette:** High-contrast professional black (`#141419`), charcoal slate (`#1e1e24`), crisp white, and ACCA signature red (`#c00000`).
- **Circular Progress Indicators:** Circular rings showing overall qualification completion, individual paper progress, and exam simulation scores.
- **Typographic Wordmark:** Distinctive **Catchy ACCA** typographic wordmark with creator credit **by ly77ee**.
- **Real Engineering:** The Word-like and Excel-like workspaces are full functional tools with genuine formula calculations and rich-text editing, not decorative mockups.

---

## ✨ Features Overview

### Phase 1: Foundation
- **Main Dashboard:** Live circular progress indicator calculating overall qualification completion (out of 13 exams), stage-wise progress, subject-wise paper grid, daily study checklist, next-exam countdown, and global search.
- **ACCA Qualification Configuration:** Centralized and versioned qualification definitions (`current_2024_2026` and `redesigned_future`) guaranteeing permanent preservation of passes, exemptions, and notes across framework views.
- **Local PDF Study Materials Library:** Fast in-browser canvas rendering with page navigation, zoom, and metadata.
- **Question Manager:** Comprehensive logging with topic tags, doubt flags, confidence ratings, and direct jumping to PDF pages.
- **Persistence & Backup:** Relational IndexedDB storage via Dexie.js with JSON export/import and pre-flight validation.

### Phase 2: Question Intelligence & Exam Simulator
- **Intelligent Question Extraction:** Extracts question numbers, titles, prompts, subquestions, marks, options, and answer keys from imported study PDFs with image-only scan detection.
- **Verification & Review Screen:** Review, edit, approve, or adjust question data, options, marks, and answer keys before importing.
- **Syllabus Topic Intelligence:** Recommends syllabus topic tags based on official standard taxonomies (IFRS 15, IFRS 16, IAS 36, Consolidation, ABC, Variances, etc.).
- **CBE Exam Simulator:** Timed and untimed simulations with single/multi-select auto-marking, question navigator, flag-for-review, and detailed debrief screens.
- **Attempt History:** Stores historical simulations and synchronizes results with dashboard metrics.

### Phase 3: Answer Writer & Spreadsheet Workspace
- **Integrated Answer Writer (`AnswerWriter`):**
  - Powered by **TipTap** rich-text editor running 100% offline.
  - Headings (H1, H2, H3), paragraphs, bold, italic, underline, bullet lists, numbered lists, and interactive tables.
  - Undo and redo history with keyboard shortcuts (`Ctrl+Z`, `Ctrl+Y`, `Ctrl+B`, `Ctrl+I`, `Ctrl+U`).
  - Automatic draft saving to IndexedDB with debounced change detection.
  - Multiple attempt management: save and revisit multiple versions (`Attempt #1`, `Attempt #2`) for the same question.
  - Word count, character count, and last-saved timestamp.
  - Copy to clipboard and export in **Plain Text (.txt)**, **Markdown (.md)**, and **HTML (.html)**.
- **Integrated Spreadsheet Workspace (`SpreadsheetWorkspace`):**
  - Grid interface matching ACCA CBE spreadsheet specifications.
  - Cell selection, keyboard navigation (`Arrow keys`, `Enter`, `Escape`), and formula input (`=fx`).
  - **Deterministic Formula Engine:**
    - Arithmetic: `+`, `-`, `*`, `/`, `^`, parentheses, unary minus.
    - Cell references (`A1`, `B2`) and range expansion (`A1:A5`, `B2:D4`).
    - Financial & Statistical Functions: `SUM`, `AVERAGE`, `MIN`, `MAX`, `COUNT`.
    - `NPV(rate, cash_flows)`: Exact discounted cash flow calculation $\sum \frac{CF_t}{(1+r)^t}$.
    - `IRR(range, [guess])`: Newton-Raphson approximation for Internal Rate of Return.
    - `PMT(rate, nper, pv)`: Annuity/loan repayment calculation.
    - `ROUND(number, [digits])`, `ABS(number)`, `IF(condition, if_true, [if_false])`.
    - Error handling: `#DIV/0!`, `#NAME?`, `#VALUE!`, `#REF!`, `#CIRCULAR!`.
  - Cell formatting: Currency (`$ / £`), Percent (`%`), Decimals, and Bold.
  - Financial statement layout templates:
    - *Statement of Financial Position (Balance Sheet)*
    - *Investment Appraisal (NPV & Cash Flows Working)*
  - Multi-sheet workbooks (add sheet, switch sheet).
  - Undo and redo stack for sheet edits.
  - CSV exchange: **Export CSV** and **Import CSV**.
- **Connected Workspace (`ConnectedWorkspace`):**
  - Access both the Answer Writer and Spreadsheet Workspace simultaneously from any question without losing context.
  - **Split View:** Side-by-side view with Word Answer Writer on the left and Excel Workings Grid on the right.
  - Both workspaces link directly to the selected ACCA paper and question.

---

## 📋 Supported Question & Workspace Formats

| Format | Support Status | Evaluation Method | Implementation Details |
| :--- | :---: | :--- | :--- |
| **Section A Objective MCQ (Single-Select)** | **Full** | Automated Marking | Exact match against verified answer key (A, B, C, D). |
| **Section A/B Multi-Select Objective** | **Full** | Automated (Partial Credit) | Proportional partial credit if partially correct with zero wrong choices. |
| **Section C Constructed Response (Essay)** | **Full** | Self-Evaluation (Marking Scheme) | Word processor with headings, tables, word counter, and marking points comparison. |
| **Financial Calculations & Workings** | **Full** | Deterministic Formula Grid | Formula calculations (NPV, IRR, SUM, etc.) with verified mathematical results. |
| **Spreadsheet File Exchange** | **Full** | RFC 4180 CSV Import/Export | Export sheets to `.csv` or import external CSV spreadsheets into new sheets. |
| **Constructed Response Export** | **Full** | TXT, MD, HTML | Export written responses in plain text, markdown, or clean styled HTML. |

---

## 🚀 Beginner Quick-Start Guide

### Prerequisites
Make sure you have **Node.js** (version 18 or newer) installed on your computer.

### Step 1: Open Terminal in Project Directory
```bash
cd "/Users/pavan/My Files/PROJECT"
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Launch the Development Server
```bash
npm run dev
```
Open your browser and navigate to:
```
http://localhost:5173
```

---

## 🧪 Running Automated Tests

To run the Vitest test suite (47 automated unit and integration tests):
```bash
npm test
```

To run a production build and type check:
```bash
npm run build
```

---

## 📜 Dependency & License Inventory

Catchy ACCA is built exclusively with permissive, maintained open-source libraries:
- **React 18** (MIT License) — UI library
- **TypeScript** (Apache 2.0) — Type safety and developer experience
- **Vite** (MIT License) — Build tool and dev server
- **TipTap Core & Extensions** (MIT License) — Rich-text editing engine
- **Dexie.js** (Apache 2.0) — IndexedDB client library for local persistence
- **PDF.js (`pdfjs-dist`)** (Apache 2.0) — Mozilla's PDF rendering engine
- **Tailwind CSS** (MIT License) — Utility-first styling system
- **Lucide React** (ISC License) — Icons
- **Vitest & React Testing Library** (MIT License) — Automated test runner

---

## ⚖️ Legal & Trademark Disclaimer

**Catchy ACCA** is an independent open-source project and is **not** endorsed by, affiliated with, or associated with the Association of Chartered Certified Accountants (ACCA).

- All ACCA paper names, qualifications, and exam structures are trademarks of ACCA.
- Catchy ACCA does not distribute copyrighted question banks or study materials from ACCA, Kaplan, BPP, or any other publisher. Students import their own legally obtained study materials.

---

*Catchy ACCA · by ly77ee*
