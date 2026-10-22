# Stage 4 change log

- Added authenticated current-user endpoint and explicit logout semantics.
- Added protected document rename, search/filter/sort, OCR and extracted-text endpoints.
- Added local OCR service for image/TXT inputs; image OCR uses optional `tesseract.js` and requires its language data.
- Added configurable backend-only AI analysis with missing-key, provider error, timeout and long-input handling.
- Added activity logging and authenticated activity listing.
- Updated health check to probe PostgreSQL.
- Removed public static serving of private uploads; downloads now use ownership-checked route.
- Added additive PostgreSQL migration for extracted text, OCR status/timestamps and activity logs. Migration has NOT been run against a real database.
- Added static tests and API documentation.

## Not completed / limitations
- Password recovery returns HTTP 501 until email delivery and reset-token storage are implemented.
- JWT logout is client-side token removal; server-side token revocation is not implemented.
- OCR image/TXT only; PDF and Office document conversion not implemented.
- QR/barcode image decoding depends on browser `BarcodeDetector`; no backend decoder.
- Translation integration is not implemented.
- Upload checks filename extension and size; full MIME/signature validation and malware scanning remain future security work.
- Live PostgreSQL, browser, OCR language model, and real AI provider tests were not run in this environment.
