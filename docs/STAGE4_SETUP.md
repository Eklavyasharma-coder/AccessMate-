# Stage 4 Windows setup

1. Keep your original project and uploaded files backed up. Before applying the migration, create a database backup and uploaded-files backup.
2. In PowerShell, from the project root, copy `backend/.env.example` to `backend/.env` and edit it privately. Use the existing database name/user/password, and generate a unique JWT secret. Never share `.env`.
3. Install Node.js LTS and PostgreSQL client tools (`pg_dump`, `psql`).
4. From `backend` run `npm install`. For image OCR run `npm install tesseract.js`. Tesseract.js downloads language data as needed; first OCR may require internet. Supported language codes: `eng`, `hin`, `eng+hin`.
5. Create a verified backup (replace database/user as appropriate):
   `pg_dump -h localhost -p 5432 -U YOUR_DB_USER -Fc -f ..\accessmate-pre-stage4.dump accessmate`
   Back up `backend\uploads` separately, e.g. `Compress-Archive -Path .\uploads\* -DestinationPath ..\accessmate-uploads-pre-stage4.zip` from `backend`.
6. Apply migration only after backup and after reviewing it: `psql -h localhost -p 5432 -U YOUR_DB_USER -d accessmate -v ON_ERROR_STOP=1 -f ..\database\migrations\001_stage4_document_tools.sql`. This migration adds columns/table and does not drop data. Rollback should be a tested restore into a separate database, not destructive SQL against the original.
7. Optional AI: configure `AI_API_URL`, `AI_API_KEY`, and `AI_MODEL` in `backend/.env`. Without these, AI responds with a clear 503 configuration error. External analysis sends selected text to the configured provider.
8. Start backend with `npm start` in `backend`. Health check: `http://localhost:5000/api/health`.
9. Serve `frontend` from `http://localhost:5500` (for example, use VS Code Live Server configured to port 5500). Keep `FRONTEND_ORIGIN=http://localhost:5500`.
10. Run backend static tests: `npm test`; syntax checks: `npm run check`.

Do not apply the migration to production until the backup restore has been tested on a separate database. This environment did not connect to your live PostgreSQL database and did not run a live migration.
