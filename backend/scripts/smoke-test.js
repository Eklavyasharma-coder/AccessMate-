#!/usr/bin/env node
// Live smoke test for a locally running AccessMate API. No data is created or changed.
const base = (process.env.ACCESSMATE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
const checks = [
  { name: 'health endpoint', path: '/health', expected: [200] },
  { name: 'protected current-user endpoint', path: '/auth/me', expected: [401, 403] },
  { name: 'protected documents endpoint', path: '/documents', expected: [401, 403] },
  { name: 'private uploads are not served statically', path: '/../uploads/', expected: [400, 404] }
];
(async () => {
  let failed = 0;
  for (const check of checks) {
    try {
      const response = await fetch(`${base}${check.path}`, { redirect: 'manual', signal: AbortSignal.timeout(5000) });
      const ok = check.expected.includes(response.status);
      console.log(`${ok ? 'PASS' : 'FAIL'} ${check.name}: HTTP ${response.status}`);
      if (!ok) failed++;
      await response.body?.cancel();
    } catch (error) {
      failed++;
      console.log(`FAIL ${check.name}: ${error.message}`);
    }
  }
  console.log(`\n${checks.length - failed}/${checks.length} live smoke checks passed.`);
  if (failed) process.exitCode = 1;
})();
