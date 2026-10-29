# Catchy ACCA · by ly77ee

> A clean, modern, beginner-friendly desktop study companion and exam progress manager for ACCA students worldwide. Built with React, TypeScript, Tailwind CSS, and local-first IndexedDB persistence.

---

## 📖 Product Objective

**Catchy ACCA** is designed to give ACCA students a dedicated, private, and distraction-free workspace on their computer. Students can track their qualification progress, import their study materials, organize past exam questions, flag doubts, and prepare systematically for upcoming exam sessions.

All documents, questions, and personal notes remain **100% on your device** in local browser storage (IndexedDB). No cloud account, third-party login, or paid AI subscription is required to use the core application.

---

## 🎨 Visual Identity & Principles

- **ACCA-Inspired Palette:** High-contrast professional black (`#141419`), charcoal (`#1e1e24`), crisp white, and ACCA signature red (`#c00000`).
- **Circular Progress Indicators:** Circular rings showing overall qualification completion and individual paper statuses.
- **Typographic Wordmark:** Distinctive **Catchy ACCA** typographic wordmark with creator credit **by ly77ee**.
- **No Mock Functionality:** Features are implemented with genuine functionality or clearly labeled with roadmap notes for future phases.

---

## ✨ Phase 1 Features

### 1. Main Dashboard
- **Overall ACCA Progress Ring:** Live circular indicator calculating progress towards qualifying (out of 13 exams).
- **Summary Metrics:** Real-time counts for Passed, In-Progress, Exempt, and Remaining papers.
- **Qualification Stage Breakdown:** Progress through Applied Knowledge (3), Applied Skills (6), Strategic Professional Essentials (2), Strategic Professional Options (2), and EPSM.
- **Subject-Wise Paper Grid:** Visual cards for each ACCA paper with individual circular progress indicators and quick status updates.
- **Next Exam Countdown:** Real student-entered exam target showing countdown in days, scheduled date, and target score.
- **Today's Study Plan:** Interactive daily task checklist with time estimates and completion checkboxes.
- **Global Search:** Top search bar allowing instant searching across papers, questions, and imported documents.
- **Recent Activity Feed:** Real-time log of exam updates, questions logged, and documents imported.

### 2. ACCA Qualification Configuration
- **Centralized & Versioned Data:** Paper names, codes, stages, and requirements are defined in `src/config/accaStructure.ts` rather than scattered in code.
- **Version Switcher:** Toggle between **Current Professional Qualification (2024–2026)** and **Evolved Qualification (Announced Framework)**.
- **Transition Rule Guarantee:** All passed exams, exemptions, and historical notes are permanently preserved when switching syllabus frameworks.

### 3. Study Material & PDF Library
- **Local PDF Import:** Select PDF files directly from your computer to store them in your browser's private IndexedDB.
- **Interactive PDF Viewer:** Built with `pdfjs-dist` featuring canvas rendering, previous/next page navigation, direct page jump (`Page X of Y`), zoom in/out, and zoom reset.
- **Metadata Display:** Track document title, file size, page count, and linked ACCA paper.
- **Privacy First:** No documents are ever uploaded to cloud servers.

### 4. Question Manager
- **Comprehensive Question Logging:** Record question number, title, ACCA paper, question type (Section A MCQ, Section B Case, Section C Constructed), topic tags, and personal study notes.
- **Link Directly to PDF Pages:** Link questions to an imported PDF and page number. Clicking **Open PDF (p. X)** instantly jumps to that exact page in the PDF viewer.
- **Doubt Flagging:** Flag difficult questions with one click for easy pre-exam revision.
- **Confidence Rating:** Rate your understanding from 1 to 5 stars.
- **Flexible Grouping & Filtering:** Filter by paper, status, or doubts, and group by topic tags, paper, or status.
- **Exam Attempt Tracker:** Log marks scored, total available marks, and timing notes per question.

### 5. Persistence, Backup & Restore
- **IndexedDB via Dexie.js:** Fast, relational local storage that handles large binary blobs (PDFs) and survives application restarts.
- **Export Backup:** Download a structured JSON snapshot (`catchy-acca-backup-YYYY-MM-DD.json`) of all papers, questions, notes, and targets.
- **Restore Backup:** Upload backup files with schema validation, conflict preview, and a choice between **Safe Merge** or **Complete Replace**.

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

To run the Vitest automated test suite:
```bash
npm test
```

To run a production build and type check:
```bash
npm run build
```

---

## 📂 Project Directory Structure

```
catchy-acca/
├── src/
│   ├── components/
│   │   ├── common/           # CircularProgress, Badge, Modal, EmptyState, ComingSoon
│   │   ├── dashboard/        # Main Dashboard, metrics, study plan, next exam countdown
│   │   ├── help/             # User guide & ACCA student documentation
│   │   ├── layout/           # AppLayout, navigation sidebar, global search bar
│   │   ├── qualification/    # My ACCA qualification tracking & syllabus version switcher
│   │   ├── questions/        # Question manager, doubt flags, topic grouping, attempts
│   │   ├── settings/         # Local persistence explanation, JSON backup & restore
│   │   └── study-materials/  # PDF library & canvas-based PDF viewer
│   ├── config/
│   │   └── accaStructure.ts  # Official ACCA syllabus structure & progress math
│   ├── db/
│   │   └── index.ts          # Dexie.js IndexedDB database & backup validation
│   ├── test/
│   │   ├── accaStructure.test.ts  # Qualification rules & percentage math tests
│   │   ├── backupValidation.test.ts # JSON backup validation tests
│   │   ├── components.test.tsx    # CircularProgress & Badge UI tests
│   │   └── integration.test.tsx   # End-to-end IndexedDB workflow tests
│   ├── types/
│   │   └── index.ts          # Core TypeScript type definitions
│   ├── App.tsx               # Root component & reactive queries
│   ├── main.tsx              # React DOM mounting
│   └── index.css             # Tailwind CSS & global styles
├── index.html                # HTML entry point with Catchy ACCA wordmark
├── package.json              # Project dependencies & npm scripts
├── tailwind.config.js        # ACCA color scheme configuration
├── tsconfig.json             # TypeScript configuration
└── vite.config.ts            # Vite & Vitest configuration
```

---

## 📜 Dependency & License Inventory

Catchy ACCA is built exclusively with permissive, maintained open-source libraries:
- **React 18** (MIT License) — UI library
- **TypeScript** (Apache 2.0) — Type safety and developer experience
- **Vite** (MIT License) — Build tool and dev server
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
