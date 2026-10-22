'use strict';
const crypto = require('crypto');
const db = require('../config/db');

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function create({ email, role, token, invitedBy, expiresAt }) {
  await db.query(
    `INSERT INTO public.account_invitations(email, role, token_hash, invited_by, expires_at)
     VALUES($1,$2,$3,$4,$5)`,
    [email, role, hashToken(token), invitedBy, expiresAt]
  );
}

async function findValid(token) {
  const hash = hashToken(token);
  const r = await db.query(
    `SELECT id, email, role, invited_by FROM public.account_invitations
     WHERE token_hash=$1 AND accepted_at IS NULL AND expires_at > NOW() LIMIT 1`,
    [hash]
  );
  return r.rows[0] || null;
}

async function markAccepted(id) {
  await db.query('UPDATE public.account_invitations SET accepted_at=NOW() WHERE id=$1', [id]);
}

async function purgeExpired() {
  await db.query('DELETE FROM public.account_invitations WHERE expires_at < NOW()');
}

module.exports = { create, findValid, markAccepted, purgeExpired };
