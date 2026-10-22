# Stage 3 — Frontend tools integration

## Updated
- `frontend/documents.html`: document search/filter/sort controls, preview area, OCR/text editor controls, speech controls, AI analysis interface, camera scanner, image decoder control.
- `frontend/js/documents.js`: connected current document endpoints; safe DOM rendering; client-side filename/type filtering and sorting; authenticated download/preview; rename request with honest unsupported-endpoint error; OCR request with explicit unsupported-endpoint handling; browser-native speech synthesis; Unicode TXT export; browser BarcodeDetector camera/image decode when supported; backend-only AI request with honest missing-endpoint errors.
- `frontend/css/style.css`: responsive workspace controls, preview, scanner and tool layouts.

## API-to-tool mapping
| UI feature | Request/capability | Current status |
|---|---|---|
| Document list | `GET /api/documents` | Existing backend route |
| Upload | `POST /api/documents` multipart field `document` | Existing backend route |
| Download/preview | `GET /api/documents/:id/download` | Existing backend route |
| Delete | `DELETE /api/documents/:id` | Existing backend route |
| Rename | `PATCH /api/documents/:id` JSON `{ "originalName": "..." }` | Frontend wired; backend route not yet implemented |
| OCR | `POST /api/documents/:id/ocr` JSON `{ "language": "eng" | "hin" | "eng+hin" }` | Frontend wired; backend route not yet implemented |
| AI summary/questions | `POST /api/ai/analyze` JSON `{ "text": "...", "question": "...", "documentId": 1 }` | Frontend wired; backend route/provider not yet implemented |
| Text-to-speech | Browser `speechSynthesis` | Browser-native; voice availability depends on OS/browser |
| QR/barcode live/image scan | Browser `BarcodeDetector` | Works only in supported browsers and secure contexts; not guaranteed in all browsers |
| TXT export | Browser Blob download, UTF-8 BOM | Implemented client-side for text currently in editor |
| Search/filter/sort | In-memory document metadata | Client-side filename/type/date; not server-side extracted-text search |

## Known gaps for Stage 4
- Implement authenticated rename, OCR, AI, QR/barcode image-decoding backend endpoints.
- OCR requires local Tesseract installation and `eng` / `hin` language data; no OCR claim is made until this exists and is tested.
- Add database persistence for extracted text, OCR status, analysis and activity history using safe migrations after verified backup.
- Add password recovery, server-side search/filter and activity endpoints where absent.
- QR/barcode browser support varies; a maintained fallback library/backend endpoint should be evaluated.
- Translation is not implemented; do not imply that a language dropdown translates text.
- Existing backend API and database were not contacted during this frontend-only stage.
