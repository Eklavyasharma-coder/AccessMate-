# Stage 6 — Final integration and acceptance checklist

Stage 6 packages the existing AccessMate AI stages with a repeatable local smoke test. It does not replace the original app with a new architecture, reset PostgreSQL, or silently enable unconfigured AI services.

## Local setup (Windows PowerShell)

1. Extract the ZIP to a new folder. Keep the original project and its `.env` untouched until you have a verified backup.
2. Review `backend/.env.example`; create `backend/.env` locally with the actual database settings. Never share it or put secrets in source control.
3. From `backend/`, run `npm ci`.
4. Start the API with `npm start`. Default API URL: `http://localhost:5000/api`.
5. In another terminal, run `npm run db:check`. Review the actual schema output before any migration.
6. Serve the `frontend/` folder using a local static server at `http://localhost:5500` (for example, VS Code Live Server configured to port 5500). Do not open HTML directly with `file://`.
7. Run the live smoke test: `npm run smoke`. Override the API base with `$env:ACCESSMATE_API_URL='http://localhost:5001/api'` if using another port.
8. If the database is not reachable, `/api/health` returns HTTP 503 and the smoke test fails by design. Fix the database configuration; do not treat that as a frontend-only problem.

## Acceptance checklist

- [ ] API starts and reports the intended port.
- [ ] `/api/health` returns HTTP 200 with `database: connected`.
- [ ] `npm run db:check` shows the intended database, schema, and tables.
- [ ] Registration rejects missing/invalid fields and passwords shorter than 8 characters.
- [ ] Login works with a test account and sends the user to the dashboard.
- [ ] A user can upload, list, preview/download, rename, OCR (supported formats only), and delete a test document.
- [ ] A second test user cannot download or modify the first user's document.
- [ ] AI endpoint clearly reports unavailable when provider credentials are absent; with credentials, test provider output and data-sharing implications.
- [ ] No unauthenticated request can read protected documents; `/uploads` is not a public static route.
- [ ] Test the UI at desktop and narrow mobile widths, including keyboard-only navigation and screen-reader labels.
- [ ] Verify backup archive and restore it into a separate, empty test database before any production migration.

## Known limits that are not to be misrepresented as complete

- Password recovery endpoints intentionally return HTTP 501 until email delivery and secure one-time token storage are implemented.
- Logout clears the client token, but JWT revocation is not implemented; an already issued token remains valid until expiry.
- OCR is optional and format/language dependent. Verify `tesseract.js` and required language data are installed for the intended image workflow; PDF/Office OCR is not fully implemented.
- AI requires provider credentials and network access configured only in the backend environment.
- Uploaded-file extension checks are not a substitute for file-signature inspection, malware scanning, or production-grade upload isolation.
- QR/barcode decoding is browser-capability dependent; server-side decoding is not implemented.
- A real PostgreSQL backup, restore, migration, end-to-end browser test, OCR test, and provider-backed AI test have not been executed in this packaged environment.

## Database safety

Do not run `database/schema.sql` against an existing database as a reset/setup command. Read `docs/stage5/POSTGRESQL_PRESERVATION.md` and verify a restorable backup before considering a migration. Test migrations on a separate restored database first.
