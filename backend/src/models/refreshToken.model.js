'use strict';
const crypto = require('crypto');
const db = require('../config/db');

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function create({ userId, token, expiresAt }) {
  const hash = hashToken(token);
  await db.query(
    'INSERT INTO public.refresh_tokens(user_id, token_hash, expires_at) VALUES($1,$2,$3)',
    [userId, hash, expiresAt]
  );
}

async function findValid(token) {
  const hash = hashToken(token);
  const r = await db.query(
    `SELECT id, user_id, expires_at FROM public.refresh_tokens
     WHERE token_hash=$1 AND revoked_at IS NULL AND expires_at > NOW() LIMIT 1`,
    [hash]
  );
  return r.rows[0] || null;
}

async function revoke(token) {
  const hash = hashToken(token);
  await db.query(
    'UPDATE public.refresh_tokens SET revoked_at=NOW() WHERE token_hash=$1',
    [hash]
  );
}

async function revokeAllForUser(userId) {
  await db.query(
    'UPDATE public.refresh_tokens SET revoked_at=NOW() WHERE user_id=$1 AND revoked_at IS NULL',
    [userId]
  );
}

async function purgeExpired() {
  await db.query('DELETE FROM public.refresh_tokens WHERE expires_at < NOW()');
}

module.exports = { create, findValid, revoke, revokeAllForUser, purgeExpired };
