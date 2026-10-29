# Catchy ACCA · Known Limitations & Transparent Engineering Constraints

In accordance with our engineering principles, Catchy ACCA documents its operational boundaries, mathematical conventions, and limitations transparently rather than claiming universal compatibility.

---

## 1. PDF Study Material Extraction

1. **Native Text Layer Requirement vs Scanned Documents:**
   - PDF.js reads native digital text layers. If a PDF is a scanned image without an embedded OCR text layer, Catchy ACCA detects this diagnostic condition (text length < 100 characters) and presents an alert. Full local OCR (e.g. Tesseract.js WASM) was evaluated but excluded from the default offline build due to its heavy memory footprint (~60MB download, 300MB+ RAM during execution). Students with scanned PDFs should use OCR-processed copies or create questions manually.
2. **Real-World Revision Kit Variance (Unverified on Proprietary Copyrighted Corpora):**
   - While Catchy ACCA passes automated multi-page boundary detection, offset mapping, and solution-matching test vectors, **real-world extraction accuracy across proprietary publisher exam kits (BPP, Kaplan) remains unverified on live copyrighted files** because redistributing third-party publisher kits without authorization is prohibited.
   - Real-world kits frequently have complex multi-column layouts, header/footer watermarks, and irregular section-based pagination.
   - **Requirement for Student Review:** Students must review extracted questions, page references, and answer keys in the Review Screen before saving to IndexedDB.
3. **Pagination & Page-Offset Heuristics:**
   - Physical PDF page indices and printed book page numbers often diverge due to introductory front matter (contents, syllabus guides, exam structure).
   - The engine detects printed numbers in page footers/headers and maps index references. However, if a document contains multiple disjoint numbering sequences (e.g., Section A numbered 1–40, Section B numbered 1–60), the calculated offset reflects the primary sequence.
4. **Single-Volume vs Separate Question and Answer Books:**
   - Single-volume revision kits with questions in the first division and solutions in the latter division are automatically correlated using index mappings and answer division parsing.
   - If a student imports a standalone question PDF with answers in a separate file, the questions are extracted with status `unmatched` / `needs_review` until the student enters or imports the answers.

---

## 2. Spreadsheet & Formula Engine Conventions

All spreadsheet financial and mathematical calculations adhere to official Microsoft Excel and Google Sheets standards:

| Formula | Syntax | Sign & Cash Flow Timing Convention | Edge Cases & Errors |
| :--- | :--- | :--- | :--- |
| **NPV** | `=NPV(rate, value1, [value2], ...)` | Cash flows are discounted starting at period 1 ($t=1$): $\sum_{t=1}^n \frac{CF_t}{(1+r)^t}$. Initial investment at $t=0$ is **not discounted** and must be added outside: `=-Cost + NPV(rate, Range)`. | Rate $\le -1$ returns `#VALUE!`. |
| **IRR** | `=IRR(range, [guess])` | Solves $\sum_{t=0}^n \frac{CF_t}{(1+IRR)^t} = 0$ via Newton-Raphson. Cash flows must contain at least one positive and one negative value. | If iteration does not converge within 100 steps or derivative is singular, surfaces `#NUM!` (never an un-converged pseudo-rate). |
| **PMT** | `=PMT(rate, nper, pv, [fv], [type])` | Consistent Excel annuity equation: $PV(1+r)^n + PMT(1+r \cdot type)\frac{(1+r)^n - 1}{r} + FV = 0$. Borrowing positive $PV$ yields negative $PMT$ (cash outflow). | $rate = 0$ returns $-(PV + FV) / nper$. Non-numeric returns `#VALUE!`. |
| **PV** | `=PV(rate, nper, pmt, [fv], [type])` | Solves for present value. If $PMT$ is negative (outflows), $PV$ returns positive. | $rate = 0$ returns $-(FV + PMT \cdot nper)$. |
| **FV** | `=FV(rate, nper, pmt, [pv], [type])` | Solves for accumulated future value. Periodic payments of $PMT = -100$ at 5% over 5 periods yields $+552.56$. | Returns `#VALUE!` on invalid arguments. |
| **SUM / AVERAGE** | `=SUM(...)`, `=AVERAGE(...)` | Text cells are ignored. Evaluates numeric ranges and literal arguments. | **Error Propagation:** If any referenced cell evaluates to an error (`#DIV/0!`, `#REF!`, `#NUM!`), the error propagates immediately. |
| **COUNTA** | `=COUNTA(range)` | Counts non-empty cells (numbers, text, labels). Blank cells are excluded. | Does not count empty strings. |
| **Cross-Sheet** | `=Sheet2!A1`, `='Tax Sheet'!B4` | Resolves across all workbook sheets. Quoted names supported for sheets with spaces. | Non-existent sheet returns `#REF!`. Circular dependency returns `#CIRCULAR!`. |

---

## 3. Privacy, Storage & Security Boundaries

1. **Sandboxed Local IndexedDB:**
   - All student records, drafts, spreadsheets, and PDF blobs are persisted strictly on the user's computer inside browser IndexedDB (`CatchyAccaDB`).
   - No data is transmitted to remote servers. Users should periodically export portable JSON backups via **Settings → Export Backup**.
2. **Optional AI Assistance:**
   - Core study management, question practice, and CBE workspaces operate 100% offline without any AI provider.
   - If a student enables a remote provider (e.g. Gemini API), explicit external transmission consent is enforced, and API keys are stored strictly in browser localStorage.
