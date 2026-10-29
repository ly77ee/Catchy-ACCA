# Catchy ACCA · PDF Extraction & Question Intelligence Design

## 1. The Challenge with Exam Kits
ACCA Practice & Revision Kits (published by BPP, Kaplan, and approved providers) often exceed 400–600 pages and follow complex structural patterns:
- Section A/B objective test questions are located at the beginning of the book.
- Section C long-form constructed response questions follow.
- Solutions, marking schemes, and examiner feedback are grouped together in a separate "Answers" division hundreds of pages later.
- Physical PDF page indices differ from printed folio page numbers due to front matter, covers, and roman-numeral prefaces.

## 2. Multi-Stage Document-Aware Pipeline
Instead of relying solely on shallow regular expressions, Catchy ACCA implements a structured 5-stage pipeline:

```
[ PDF Document ]
       │
       ▼
[ Stage 1: Document Inspection & Page Index Mapping ]
       │  • Analyze printed page numbers vs physical PDF page numbers
       │  • Parse table of contents / index tables
       ▼
[ Stage 2: Question Section Parsing ]
       │  • Detect question boundaries (headings, marks, subquestions, options)
       │  • Handle multi-page questions without splitting
       ▼
[ Stage 3: Answer & Marking Scheme Parsing ]
       │  • Detect answer section transition (Answers to Section A, Answers to Q1...)
       │  • Extract solution steps, marking allocations, and examiner tips
       ▼
[ Stage 4: Question-to-Answer Matching ]
       │  • Correlate questions and solutions using question IDs and index tables
       │  • Assign match confidence (Verified, High-Confidence, Needs Review, Unmatched)
       ▼
[ Stage 5: Verification & Quality Dashboard ]
       │  • Display processing stats (pages read, detected, extracted, matched)
       │  • Enable student manual review, correction, and approval
       ▼
[ Canonical Question Database ]
```

## 3. Printed-to-Physical Page Mapping
The pipeline scans introductory pages for the "Contents" table, capturing:
- Question Number / Name
- Printed Question Page
- Printed Answer Page
- Physical page offset $\Delta = \text{physical\_page} - \text{printed\_page}$

This mapping allows direct 1-click jumps from an extracted question in the workspace directly to its exact location in the PDF canvas viewer.
