# Stage 5 change log

- Added `backend/scripts/check-schema.js` to inspect the connected database's actual table/column inventory.
- Added `backend/scripts/migrate.js` with schema preflight, explicit opt-in, advisory transaction lock, version tracking, transaction/rollback, and idempotent migration skipping.
- Added `backend/scripts/backup.ps1` for custom-format PostgreSQL dump, archive-list validation, upload-folder copy, and SHA-256 manifest.
- Updated Stage 4 migration to be runner-transaction-managed rather than containing its own BEGIN/COMMIT.
- Added Windows backup, separate-test-database restore, migration, validation and rollback instructions.
- No live database connection was made and no live schema/data was modified.
