# Catchy ACCA · by ly77ee

> A clean, modern, beginner-friendly desktop study companion and exam progress manager for ACCA students worldwide. Built with React, TypeScript, Tailwind CSS, and local-first IndexedDB persistence.

---

## 📖 Product Objective

**Catchy ACCA** gives ACCA students a dedicated, private, and distraction-free workspace on their computer. Students can track their qualification progress, import their study materials, extract questions intelligently, practise in a faithful CBE exam simulator, flag doubts, and prepare systematically for upcoming exam sessions.

All documents, questions, exam responses, and notes remain **100% on your device** in local browser storage (IndexedDB). No cloud account, third-party login, or paid AI subscription is required to use the core application.

---

## 🎨 Visual Identity & Principles

- **ACCA-Inspired Palette:** High-contrast professional black (`#141419`), charcoal slate (`#1e1e24`), crisp white, and ACCA signature red (`#c00000`).
- **Circular Progress Indicators:** Circular rings showing overall qualification completion, individual paper progress, and exam simulation scores.
- **Typographic Wordmark:** Distinctive **Catchy ACCA** typographic wordmark with creator credit **by ly77ee**.
- **Honest Engineering:** Features are implemented with genuine functionality or clearly labeled with roadmap notes for future phases. Never pretends to auto-grade open essays without an official marking guide.

---

## ✨ Features Overview

### Phase 1: Foundation
- **Main Dashboard:** Live circular progress indicator calculating overall qualification completion (out of 13 exams), stage-wise progress, subject-wise paper grid, daily study checklist, next-exam countdown, and global search.
- **ACCA Qualification Configuration:** Centralized and versioned qualification definitions (`current_2024_2026` and `redesigned_future`) guaranteeing permanent preservation of passes, exemptions, and notes across framework views.
- **Local PDF Study Materials Library:** Fast in-browser canvas rendering with page navigation, zoom, and metadata.
- **Question Manager:** Comprehensive logging with topic tags, doubt flags, confidence ratings, and direct jumping to PDF pages.
- **Persistence & Backup:** Relational IndexedDB storage via Dexie.js with JSON export/import and pre-flight validation.

### Phase 2: Question Intelligence & Exam Simulator
- **Intelligent Question Extraction:**
  - Extracts question numbers, titles, prompts, subquestions, marks, options, and answer keys from imported study PDFs.
  - Automatically detects scanned/image-only PDFs lacking an embedded text layer and alerts the user with helpful diagnostics.
- **Interactive Review Screen (`ExtractionReviewModal`):**
  - Allows students to review, edit, approve, or correct extracted questions, options, page references, and answer keys before importing them.
  - Never silently invents missing questions or answers.
- **Syllabus Topic Intelligence:**
  - Analyzes extracted question text against official ACCA syllabus taxonomies (e.g., IFRS 15, IFRS 16, IAS 36, Consolidation, ABC, Variances, ISA 315).
  - Recommends topic tags with keyword match density. Students can approve, edit, or reject suggestions.
- **CBE Exam Simulator (`ExamEnvironment`):**
  - **Setup Screen:** Configure paper, source document, topic filters, question format filters, question count, ordering (sequential, randomized, by topic), timer mode (timed or untimed), and solution feedback (immediate or delayed).
  - Only offers question formats supported by the selected material.
  - **Live Exam Delivery:** Focused interface with single question display, question navigator (answered, unanswered, current, flagged), flag-for-review toggle, live countdown timer with low-time visual alerts, and autosaved responses.
  - **Results & Debrief:** Score percentage, marks awarded, question-by-question review, official answer keys, and marking guide explanations.
- **Attempt History:**
  - Stores completed simulations in IndexedDB with time spent, marks, responses, and review flags.
  - Automatically synchronizes with Dashboard activity logs and Question Manager attempt records.

---

## 📋 Supported vs. Unsupported Question Formats

| Format | Support Status | Evaluation Method | Notes |
| :--- | :---: | :--- | :--- |
| **Section A Objective MCQ (Single-Select)** | **Full** | Automated (Answer Key) | Exact match with verified answer key (A, B, C, D). |
| **Section A/B Multi-Select Objective** | **Full** | Automated (Partial Credit) | Evaluates all correct selections; proportional credit if partially correct with zero wrong choices. |
| **Section C Constructed Response (Essay)** | **Full** | Self-Evaluation (Marking Guide) | Candidate response workspace with word count; evaluated against official marking guide points after submission. Does not simulate arbitrary grading. |
| **Financial Calculation / Numerical** | **Full** | Self-Evaluation / Solution Workings | Working area with step-by-step model solution review. |
| **Scanned Image-Only PDFs (without OCR text)** | *Requires Manual Entry* | N/A | System detects missing text layers and alerts user instead of corrupting data. |
| **Interactive Drag-and-Drop CBE Hotspots** | *Future / Manual Entry* | N/A | Proprietary ACCA CBE proprietary interactive widgets. |

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

To run the Vitest test suite (32 automated unit and integration tests):
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
│   │   ├── exam/             # Exam Environment, Setup, Live Session, Results, History
│   │   ├── extraction/       # Extraction Review Screen & verification
│   │   ├── help/             # User guide & ACCA student documentation
│   │   ├── layout/           # AppLayout, navigation sidebar, global search bar
│   │   ├── qualification/    # My ACCA qualification tracking & syllabus version switcher
│   │   ├── questions/        # Question manager, doubt flags, topic grouping, attempts
│   │   ├── settings/         # Local persistence explanation, JSON backup & restore
│   │   └── study-materials/  # PDF library, viewer & question extraction trigger
│   ├── config/
│   │   ├── accaStructure.ts  # Official ACCA syllabus structure & progress math
│   │   └── syllabusTopics.ts # Syllabus topic taxonomies & keyword matching
│   ├── db/
│   │   └── index.ts          # Dexie.js IndexedDB database (v2 with examAttempts)
│   ├── test/
│   │   ├── accaStructure.test.ts    # Qualification rules & percentage math tests
│   │   ├── backupValidation.test.ts # JSON backup validation tests
│   │   ├── components.test.tsx      # CircularProgress & Badge UI tests
│   │   ├── examScoring.test.ts      # Marking rules, partial credit & question ordering
│   │   ├── integration.test.tsx     # Phase 1 IndexedDB workflow tests
│   │   ├── pdfExtractor.test.ts     # Extraction parsing & topic intelligence tests
│   │   └── phase2Integration.test.tsx # Exam simulation & attempt history tests
│   ├── types/
│   │   └── index.ts          # Core TypeScript type definitions (Phase 1 & 2)
│   ├── utils/
│   │   ├── examScoring.ts    # Answer key evaluation & partial credit algorithms
│   │   └── pdfExtractor.ts   # PDF text extraction & pattern parser
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
