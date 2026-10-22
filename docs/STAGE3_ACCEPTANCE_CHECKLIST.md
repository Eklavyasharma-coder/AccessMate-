# Stage 3 acceptance checklist

- [x] Uses existing HTML/CSS/vanilla JavaScript frontend structure.
- [x] Uses configured API base URL and bearer token helper for backend requests.
- [x] Existing upload/list/download/delete calls retained.
- [x] Search by filename, file type filter, and sort implemented client-side.
- [x] Image/PDF preview where browser supports the format; text preview populates editor.
- [x] Text export includes UTF-8 BOM to support Unicode/Hindi in common Windows apps.
- [x] Speech reads actual editor text; pause/resume and stop controls are wired.
- [x] QR/barcode uses browser-native detector only when available; camera stops on decode and explicit stop.
- [x] Rename/OCR/AI controls show backend errors instead of fake success when endpoints are missing.
- [ ] Live browser checks across Chrome/Edge/Firefox and mobile devices.
- [ ] Authenticated integration tests against a running backend/PostgreSQL instance.
- [ ] Real OCR test with English and Hindi Tesseract data.
- [ ] Real AI provider test and missing-key failure test.
- [ ] Translation, history, password recovery, server-side full-text search and persisted OCR require later stages.
