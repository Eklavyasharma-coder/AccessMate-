'use strict';
const db = require('../config/db');

async function findByEmail(email) {
  const r = await db.query(
    'SELECT id, name, email, password_hash, role, status, last_login_at, preferences FROM public.users WHERE email=$1 LIMIT 1',
    [email]
  );
  return r.rows[0] || null;
}

async function findById(id) {
  const r = await db.query(
    'SELECT id, name, email, role, status, last_login_at, preferences, created_at FROM public.users WHERE id=$1 LIMIT 1',
    [id]
  );
  return r.rows[0] || null;
}

async function findPublicById(id) {
  const r = await db.query(
    'SELECT id, name, email, role, status, created_at FROM public.users WHERE id=$1 LIMIT 1',
    [id]
  );
  return r.rows[0] || null;
}

async function create({ name, email, passwordHash, role = 'user' }) {
  const r = await db.query(
    `INSERT INTO public.users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, role, status, created_at`,
    [name, email, passwordHash, role]
  );
  return r.rows[0];
}

async function updateLastLogin(id) {
  await db.query('UPDATE public.users SET last_login_at=NOW() WHERE id=$1', [id]);
}

async function updateStatus(id, status) {
  const r = await db.query(
    'UPDATE public.users SET status=$2 WHERE id=$1 RETURNING id, name, email, role, status',
    [id, status]
  );
  return r.rows[0] || null;
}

async function updateRole(id, role) {
  const r = await db.query(
    'UPDATE public.users SET role=$2 WHERE id=$1 RETURNING id, name, email, role, status',
    [id, role]
  );
  return r.rows[0] || null;
}

async function updateProfile(id, { name, preferences }) {
  const sets = [];
  const vals = [id];
  if (name !== undefined) { vals.push(name); sets.push(`name=$${vals.length}`); }
  if (preferences !== undefined) { vals.push(JSON.stringify(preferences)); sets.push(`preferences=$${vals.length}`); }
  if (!sets.length) return findPublicById(id);
  const r = await db.query(
    `UPDATE public.users SET ${sets.join(',')} WHERE id=$1 RETURNING id, name, email, role, status, preferences`,
    vals
  );
  return r.rows[0] || null;
}

async function updatePassword(id, passwordHash) {
  await db.query('UPDATE public.users SET password_hash=$2 WHERE id=$1', [id, passwordHash]);
}

async function listUsers({ role, status, q, limit = 50, offset = 0 }) {
  const vals = [];
  const conds = [];
  if (role)   { vals.push(role);             conds.push(`role=$${vals.length}`); }
  if (status) { vals.push(status);           conds.push(`status=$${vals.length}`); }
  if (q)      { vals.push(`%${q.replace(/[%_\\]/g, '\\$&')}%`); conds.push(`(name ILIKE $${vals.length} OR email ILIKE $${vals.length})`); }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  vals.push(limit, offset);
  const r = await db.query(
    `SELECT id, name, email, role, status, last_login_at, created_at
     FROM public.users ${where}
     ORDER BY created_at DESC
     LIMIT $${vals.length - 1} OFFSET $${vals.length}`,
    vals
  );
  return r.rows;
}

async function countActiveSuperAdmins() {
  const r = await db.query(
    "SELECT COUNT(*) AS n FROM public.users WHERE role='super_admin' AND status='active'"
  );
  return Number(r.rows[0].n);
}

async function existsByEmail(email) {
  const r = await db.query('SELECT 1 FROM public.users WHERE email=$1 LIMIT 1', [email]);
  return r.rowCount > 0;
}

async function remove(id) {
  await db.query('DELETE FROM public.users WHERE id=$1', [id]);
}

module.exports = {
  findByEmail, findById, findPublicById, create,
  updateLastLogin, updateStatus, updateRole, updateProfile, updatePassword,
  listUsers, countActiveSuperAdmins, existsByEmail, remove,
};
