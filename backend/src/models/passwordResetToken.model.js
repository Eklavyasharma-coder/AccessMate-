'use strict';
const crypto = require('crypto');
const db = require('../config/db');

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function create({ userId, token, expiresAt }) {
  await db.query(
    'INSERT INTO public.password_reset_tokens(user_id, token_hash, expires_at) VALUES($1,$2,$3)',
    [userId, hashToken(token), expiresAt]
  );
}

async function findValid(token) {
  const hash = hashToken(token);
  const r = await db.query(
    `SELECT id, user_id FROM public.password_reset_tokens
     WHERE token_hash=$1 AND used_at IS NULL AND expires_at > NOW() LIMIT 1`,
    [hash]
  );
  return r.rows[0] || null;
}

async function markUsed(id) {
  await db.query('UPDATE public.password_reset_tokens SET used_at=NOW() WHERE id=$1', [id]);
}

async function purgeExpired() {
  await db.query('DELETE FROM public.password_reset_tokens WHERE expires_at < NOW()');
}

module.exports = { create, findValid, markUsed, purgeExpired };
