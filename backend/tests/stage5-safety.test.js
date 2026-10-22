const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..', '..');

test('migration is additive and contains no destructive table/data commands', () => {
  const sql = fs.readFileSync(path.join(root, 'database/migrations/001_stage4_document_tools.sql'), 'utf8');
  assert.match(sql, /ADD COLUMN IF NOT EXISTS extracted_text/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.activity_logs/i);
  assert.doesNotMatch(sql, /\bDROP\s+(TABLE|DATABASE|SCHEMA|COLUMN)\b/i);
  assert.doesNotMatch(sql, /\bTRUNCATE\b/i);
  assert.doesNotMatch(sql, /\bDELETE\s+FROM\b/i);
});

test('migration runner requires explicit opt-in and preflights existing schema', () => {
  const js = fs.readFileSync(path.join(root, 'backend/scripts/migrate.js'), 'utf8');
  assert.match(js, /ALLOW_SCHEMA_MIGRATIONS !== 'true'/);
  assert.match(js, /assertSchema\(client\)/);
  assert.match(js, /pg_advisory_xact_lock/);
  assert.match(js, /ROLLBACK/);
  assert.match(js, /schema_migrations/);
});

test('backup script makes a custom-format dump and validates it', () => {
  const ps = fs.readFileSync(path.join(root, 'backend/scripts/backup.ps1'), 'utf8');
  assert.match(ps, /pg_dump --format=custom/);
  assert.match(ps, /pg_restore --list/);
  assert.match(ps, /Get-FileHash -Algorithm SHA256/);
  assert.match(ps, /Copy-Item.*UploadsPath/s);
});
