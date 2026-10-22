const db = require('../config/db');

async function create({ userId, originalName, storedName, mimeType, sizeBytes }) {
  const result = await db.query(
    `INSERT INTO public.documents (user_id, original_name, stored_name, mime_type, size_bytes)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, original_name, mime_type, size_bytes, created_at`,
    [userId, originalName, storedName, mimeType, sizeBytes]
  );
  return result.rows[0];
}
async function listByUser(userId, filters = {}) {
  const values = [userId]; let where = 'user_id = $1';
  if (filters.q) { values.push(`%${filters.q.replace(/[\\%_]/g, '\\$&')}%`); where += ` AND (original_name ILIKE $${values.length} ESCAPE '\\\\')`; }
  if (filters.type && filters.type !== 'all') { values.push(filters.type); where += ` AND lower(split_part(original_name, '.', -1)) = $${values.length}`; }
  const sort = ({name:'original_name ASC', oldest:'created_at ASC', size:'size_bytes DESC', newest:'created_at DESC'})[filters.sort] || 'created_at DESC';
  const result = await db.query(`SELECT id, original_name, mime_type, size_bytes, created_at, ocr_status FROM public.documents WHERE ${where} ORDER BY ${sort}`, values);
  return result.rows;
}
async function findByIdAndUser(id, userId) {
  const result = await db.query(`SELECT id, user_id, original_name, stored_name, mime_type, size_bytes, extracted_text, ocr_status, created_at FROM public.documents WHERE id=$1 AND user_id=$2 LIMIT 1`, [id,userId]);
  return result.rows[0] || null;
}
async function rename(id,userId,name) {
  const result = await db.query(`UPDATE public.documents SET original_name=$3 WHERE id=$1 AND user_id=$2 RETURNING id, original_name, mime_type, size_bytes, created_at, ocr_status`,[id,userId,name]);
  return result.rows[0] || null;
}
async function saveOcr(id,userId,text,status='completed') {
  const result = await db.query(`UPDATE public.documents SET extracted_text=$3, ocr_status=$4, ocr_updated_at=NOW() WHERE id=$1 AND user_id=$2 RETURNING id, original_name, extracted_text, ocr_status, ocr_updated_at`,[id,userId,text,status]);
  return result.rows[0] || null;
}
async function remove(id,userId) { const result = await db.query('DELETE FROM public.documents WHERE id=$1 AND user_id=$2',[id,userId]); return (result.rowCount||0)>0; }
module.exports = { create, listByUser, findByIdAndUser, rename, saveOcr, remove };
