'use strict';
const fs = require('node:fs');
const path = require('node:path');
const pool = require('../src/config/db');

const migrationsDir = path.resolve(__dirname, '..', '..', 'database', 'migrations');
const required = {
  users: ['id'],
  documents: ['id', 'user_id']
};

async function assertSchema(client) {
  for (const [table, columns] of Object.entries(required)) {
    const result = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`,
      [table]
    );
    const found = new Set(result.rows.map(row => row.column_name));
    const missing = columns.filter(column => !found.has(column));
    if (missing.length) {
      throw new Error(`Preflight stopped: public.${table} is missing expected column(s): ${missing.join(', ')}. No migration was applied. Inspect the actual schema and write a compatible migration.`);
    }
  }
}

async function main() {
  if (process.env.ALLOW_SCHEMA_MIGRATIONS !== 'true') {
    throw new Error('Refusing to run. Set ALLOW_SCHEMA_MIGRATIONS=true only after taking and verifying a backup and confirming DB_NAME targets the intended database.');
  }
  const client = await pool.connect();
  try {
    const db = await client.query('SELECT current_database() AS name, current_user AS username');
    console.log(`Target database: ${db.rows[0].name}; database role: ${db.rows[0].username}`);
    await assertSchema(client);
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1, $2)', [18452, 5]);
    await client.query(`CREATE TABLE IF NOT EXISTS public.schema_migrations (
      version VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
    const files = fs.readdirSync(migrationsDir).filter(name => /^\d+.*\.sql$/.test(name)).sort();
    for (const file of files) {
      const exists = await client.query('SELECT 1 FROM public.schema_migrations WHERE version = $1', [file]);
      if (exists.rowCount) {
        console.log(`SKIP already applied: ${file}`);
        continue;
      }
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await client.query(sql);
      await client.query('INSERT INTO public.schema_migrations(version) VALUES ($1)', [file]);
      console.log(`APPLIED: ${file}`);
    }
    await client.query('COMMIT');
    console.log('Migration run finished. Verify schema and application queries before use.');
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(error => {
  console.error(`Migration failed safely: ${error.message}`);
  process.exitCode = 1;
});
