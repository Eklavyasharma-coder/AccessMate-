'use strict';
const db = require('../config/db');
const { STAFF_ASSIGNABLE_PERMISSIONS } = require('../config/permissions');

async function getForUser(userId) {
  const r = await db.query(
    'SELECT permission, granted FROM public.staff_permissions WHERE user_id=$1',
    [userId]
  );
  return r.rows;
}

async function set({ userId, permission, granted, grantedBy }) {
  if (!STAFF_ASSIGNABLE_PERMISSIONS.has(permission)) {
    const e = new Error(`Permission '${permission}' cannot be assigned to staff.`);
    e.status = 400;
    throw e;
  }
  await db.query(
    `INSERT INTO public.staff_permissions(user_id, permission, granted, granted_by)
     VALUES($1,$2,$3,$4)
     ON CONFLICT(user_id, permission) DO UPDATE SET granted=$3, granted_by=$4, created_at=NOW()`,
    [userId, permission, granted, grantedBy]
  );
}

async function remove(userId, permission) {
  await db.query(
    'DELETE FROM public.staff_permissions WHERE user_id=$1 AND permission=$2',
    [userId, permission]
  );
}

module.exports = { getForUser, set, remove };
