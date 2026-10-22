const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
test('private uploaded files are not exposed through a static uploads route', () => {
  const app = fs.readFileSync(path.join(root, 'src/app.js'), 'utf8');
  assert.equal(app.includes("app.use('/uploads', express.static"), false);
});
test('AI endpoint refuses missing credentials instead of fabricating results', () => {
  const service = fs.readFileSync(path.join(root, 'src/services/ai.service.js'), 'utf8');
  assert.match(service, /AI_API_KEY/); assert.match(service, /AI is not configured/);
});
test('database migration is additive and does not drop existing tables', () => {
  const sql = fs.readFileSync(path.join(root, '..', 'database/migrations/001_stage4_document_tools.sql'), 'utf8');
  assert.match(sql, /ADD COLUMN IF NOT EXISTS extracted_text/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public.activity_logs/);
  assert.doesNotMatch(sql, /\bDROP\s+(TABLE|DATABASE)\b/i);
});
test('environment example contains placeholders rather than supplied credentials', () => {
  const env = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
  assert.match(env, /replace_with_database_password/); assert.doesNotMatch(env, /Eklavya@1|cee2614c1d0a8257/);
});
