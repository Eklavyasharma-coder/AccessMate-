# Stage 5 — PostgreSQL preservation, migration and recovery

## Safety status

This package has **not** connected to your live PostgreSQL instance, taken a live database backup, applied a migration, or tested restoration. Do not treat the supplied schema file as proof of your live schema. Never run `database/schema.sql` against the existing database as a setup/reset step.

## 1. Back up first (Windows PowerShell)

1. Stop application writes while taking a consistent database/files backup.
2. Confirm `backend/.env` points to the intended database. Do not paste or share the file.
3. Confirm the actual uploaded-file storage path. The backup script defaults to `backend/uploads`; change `-UploadsPath` if the app stores files elsewhere.
4. From the project root run:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\backend\scripts\backup.ps1
```

The script uses `pg_dump -Fc`, validates the archive with `pg_restore --list`, copies the configured upload directory, and writes SHA-256 hashes. A successful command is not a complete recovery test; restore to a separate test database as described below. Keep backups encrypted/private and off the same disk when possible.

If `pg_dump` prompts for a password, enter it in the terminal. Avoid putting database passwords directly on the command line or in scripts.

## 2. Inspect the real schema before migration

Install dependencies from `backend/package-lock.json`, ensure the private `.env` contains the existing database settings, then run:

```powershell
cd backend
npm ci
node .\scripts\check-schema.js
```

Review the database name, role, port, tables, columns and constraints in the output. Confirm the application queries agree with the schema. Do not assume `public.users` or `public.documents` match the sample schema. The migration runner stops if the required `users(id)` or `documents(id,user_id)` columns are missing.

## 3. Apply additive migrations only after backup verification

Run against a **separate test database first**, with a database role restricted to the target database:

```powershell
$env:ALLOW_SCHEMA_MIGRATIONS = 'true'
node .\scripts\migrate.js
Remove-Item Env:\ALLOW_SCHEMA_MIGRATIONS
```

The runner takes a PostgreSQL advisory transaction lock, creates `public.schema_migrations`, applies ordered SQL files in a transaction, records applied versions, skips already recorded versions, and rolls back on errors. The current migration adds OCR metadata columns and an activity log table/indexes; it does not drop or recreate users/documents. `IF NOT EXISTS` alone does not prove a same-named existing column/table has the expected shape, so inspect any pre-existing objects before proceeding.

Do not run this on production until the test database restoration and application regression checks pass. Use a dedicated migration role with only the required DDL permissions. Confirm `DB_NAME` manually immediately before setting the flag.

## 4. Restore into a separate test database (never over production)

Create an empty database such as `accessmate_stage5_restore_test` using pgAdmin or an authorized DBA account. Verify the target name before restoring. Example PowerShell (replace placeholder values; never use the production DB name):

```powershell
$env:PGHOST = 'localhost'
$env:PGPORT = '5432'
$env:PGUSER = 'your_postgres_user'
$env:PGDATABASE = 'accessmate_stage5_restore_test'
pg_restore --exit-on-error --no-owner --no-acl --dbname=$env:PGDATABASE 'C:\path\to\AccessMate-backup\accessmate.dump'
```

`pg_restore` restores into the selected target; ensure it is the newly created test database and is empty. Do not add `--clean` or `--create`. Validate tables, row counts, relationships and a test login/document download against the restored copy. Restore the upload backup to a separate test folder and verify file names/sizes/hashes. The database and files should be backed up from a quiesced application window to reduce mismatch risk.

## 5. Rollback

- If migration fails during the transaction, the runner attempts `ROLLBACK`; inspect logs and schema before retrying.
- Do not delete `schema_migrations` to force a rerun. Investigate the exact migration and resulting schema first.
- Prefer a forward corrective migration for already committed changes.
- If recovery is required, restore the verified backup into a **new separate database** and point a test instance at it. Do not restore over the existing database automatically.
- Restore files to a separate path, compare checksums, and only switch the application after explicit review and downtime planning.

## 6. Stage 5 validation record

- Live DB backup: NOT TESTED (requires user's database credentials/runtime).
- Backup archive validation: script validates with `pg_restore --list` when run locally; not executed against user's live database here.
- Restore to separate DB: NOT TESTED.
- Live schema compatibility: NOT TESTED; inspect with `check-schema.js`.
- Migration on live database: NOT RUN.
- Existing users/documents preservation: not verifiable without access to the live DB; no live DB was modified by this package.
