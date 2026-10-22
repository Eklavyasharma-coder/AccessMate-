const db = require('../config/db');
async function record(userId, action, documentId = null, details = {}) {
  try { await db.query('INSERT INTO public.activity_logs(user_id, action, document_id, details) VALUES ($1,$2,$3,$4::jsonb)',[userId,action,documentId,JSON.stringify(details)]); }
  catch (e) { if (e.code !== '42P01' && e.code !== '42703') throw e; }
}
async function list(userId) {
  const r = await db.query('SELECT id, action, document_id, details, created_at FROM public.activity_logs WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100',[userId]);
  return r.rows;
}
module.exports = { record, list };
