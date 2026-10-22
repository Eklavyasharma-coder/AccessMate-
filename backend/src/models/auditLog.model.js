'use strict';
const db = require('../config/db');

async function insert({ actorId, actorRole, action, targetType, targetId, outcome = 'success', details = {}, ipAddress, requestId }) {
  try {
    await db.query(
      `INSERT INTO public.audit_logs
         (actor_id, actor_role, action, target_type, target_id, outcome, details, ip_address, request_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9)`,
      [actorId || null, actorRole || null, action, targetType || null, targetId || null,
       outcome, JSON.stringify(details), ipAddress || null, requestId || null]
    );
  } catch (e) {
    // Never let audit log failures crash requests.
    if (process.env.NODE_ENV !== 'production') console.error('[audit] insert failed:', e.message);
  }
}

async function listByActor(actorId, { limit = 100, offset = 0 } = {}) {
  const r = await db.query(
    `SELECT id, actor_id, actor_role, action, target_type, target_id, outcome, details, ip_address, created_at
     FROM public.audit_logs WHERE actor_id=$1
     ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    [actorId, limit, offset]
  );
  return r.rows;
}

async function listRecent({ action, outcome, limit = 200, offset = 0 } = {}) {
  const vals = [];
  const conds = [];
  if (action)  { vals.push(action);  conds.push(`action=$${vals.length}`); }
  if (outcome) { vals.push(outcome); conds.push(`outcome=$${vals.length}`); }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  vals.push(limit, offset);
  const r = await db.query(
    `SELECT id, actor_id, actor_role, action, target_type, target_id, outcome, details, ip_address, created_at
     FROM public.audit_logs ${where}
     ORDER BY created_at DESC LIMIT $${vals.length - 1} OFFSET $${vals.length}`,
    vals
  );
  return r.rows;
}

module.exports = { insert, listByActor, listRecent };
