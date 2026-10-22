const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..', '..');

test('frontend uses a single documented API base URL and backend exposes health route', () => {
  const api = fs.readFileSync(path.join(root, 'frontend/js/api.js'), 'utf8');
  const app = fs.readFileSync(path.join(root, 'backend/src/app.js'), 'utf8');
  assert.match(api, /http:\/\/localhost:5000\/api/);
  assert.match(app, /app\.get\('\/api\/health'/);
});

test('smoke test only makes read-only unauthenticated requests', () => {
  const smoke = fs.readFileSync(path.join(root, 'backend/scripts/smoke-test.js'), 'utf8');
  assert.match(smoke, /\/health/);
  assert.match(smoke, /\/auth\/me/);
  assert.match(smoke, /\/documents/);
  assert.doesNotMatch(smoke, /method:\s*['"](POST|PUT|PATCH|DELETE)['"]/i);
});

test('acceptance and limitation documentation are present', () => {
  for (const file of ['docs/STAGE6_ACCEPTANCE.md', 'docs/STAGE6_CHANGELOG.md', 'docs/STAGE4_API.md', 'docs/stage5/POSTGRESQL_PRESERVATION.md']) {
    assert.equal(fs.existsSync(path.join(root, file)), true, `missing ${file}`);
  }
});
