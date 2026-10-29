# Catchy ACCA · Known Limitations & Transparent Constraints

In compliance with our engineering principles, we document limitations transparently rather than claiming universal compatibility:

1. **Scanned & Flattened PDFs:**
   - PDF.js reads native digital text layers. If a document is a pure scanned image without an OCR text layer, Catchy ACCA alerts the student and provides a manual question entry screen. Full local OCR (e.g. Tesseract/PaddleOCR) in pure browser WASM has high memory requirements and is surfaced as an explicit fallback.
2. **Complex Multi-Column Publisher Formats:**
   - Publisher exam kits occasionally interleave sidebars, advertisements, and complex tables across pages. While Catchy ACCA identifies page offsets and question boundaries through index mapping, students should use the Review Screen to confirm boundaries on irregular publisher prints.
3. **CBE Exam Interface Simulation:**
   - Catchy ACCA simulates the functional behavior of CBE exams (timers, flags, navigators, Word, Excel, objective formats). It does not claim pixel-perfect reproduction of ACCA's proprietary Pearson VUE CBE exam software.
4. **AI Assistance Disclaimer:**
   - Catchy ACCA Study Assistant and Answer Review are educational self-evaluation tools. AI evaluations must never be taken as official examiner marks.
5. **Browser Sandbox Storage Quota:**
   - IndexedDB storage is managed by the student's browser. While typical quotas allow several gigabytes, users should regularly export a `.json` backup via Settings to safeguard their study data.
