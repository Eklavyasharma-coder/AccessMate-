# AccessMate AI — Stage 6 (Final Integration Package)

This package consolidates the previous AccessMate stages and adds final integration guidance plus a read-only live API smoke test. It preserves the modular Express + PostgreSQL architecture.

## Quick start
- Backend: see `docs/STAGE4_SETUP.md`; Node.js LTS and PostgreSQL required.
- Frontend: serve `frontend/` at `http://localhost:5500`.
- API: `http://localhost:5000/api`.
- Apply `database/migrations/001_stage4_document_tools.sql` only after a verified database backup and separate-database restore test.
- API reference: `docs/STAGE4_API.md`.
- Final acceptance checklist: `docs/STAGE6_ACCEPTANCE.md`.
- Stage 6 changes: `docs/STAGE6_CHANGELOG.md`.
- Live smoke test (requires running server): from `backend/`, run `npm run smoke`.
- Change log/limitations: `docs/STAGE4_CHANGELOG.md`.

No real `.env`, database backup, node_modules, or `.git` directory is included. The migration has not been run against the user's live database. OCR images require `npm install tesseract.js`; AI requires explicitly configured provider credentials.


## Validation boundary

Automated source tests and syntax checks can run without your database. Live PostgreSQL, backup/restore, browser workflows, OCR and AI-provider behavior must be verified in your local environment using the Stage 6 checklist.


## Stage 7 security hardening
See `docs/STAGE7_SECURITY.md` for production CORS, rate limits, upload validation, JWT secret, and deployment guidance. Run `cd backend`, `npm ci`, `npm run check`, and `npm test`.
