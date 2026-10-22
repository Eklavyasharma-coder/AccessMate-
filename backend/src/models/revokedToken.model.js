'use strict';
const db = require('../config/db');

async function revoke(jti, expiresAt) {
  await db.query(
    'INSERT INTO public.revoked_tokens(jti, expires_at) VALUES($1,$2) ON CONFLICT DO NOTHING',
    [jti, expiresAt]
  );
}

async function isRevoked(jti) {
  const r = await db.query('SELECT 1 FROM public.revoked_tokens WHERE jti=$1 LIMIT 1', [jti]);
  return r.rowCount > 0;
}

async function purgeExpired() {
  await db.query('DELETE FROM public.revoked_tokens WHERE expires_at < NOW()');
}

module.exports = { revoke, isRevoked, purgeExpired };
