'use strict';
const fs   = require('fs/promises');
const path = require('path');

/** Sanitize browser-supplied filename: strip control chars/null bytes, limit length. */
function sanitizeFilename(name) {
  return String(name || 'untitled')
    .replace(/[\x00-\x1f\x7f\\/:*?"<>|]/g, '_')
    .replace(/\.{2,}/g, '_')
    .trim()
    .slice(0, 200) || 'untitled';
}

const documents = require('../models/document.model');

async function saveUpload(userId, file) {
  return documents.create({
    userId,
    originalName: sanitizeFilename(file.originalname),
    storedName:   file.filename,
    mimeType:     file.mimetype,
    sizeBytes:    file.size,
  });
}

async function deleteDocument(id, userId) {
  const doc = await documents.findByIdAndUser(id, userId);
  if (!doc) return false;
  const deleted = await documents.remove(id, userId);
  if (deleted) {
    const uploadDir = process.env.UPLOAD_DIR
      ? path.resolve(process.env.UPLOAD_DIR)
      : path.join(__dirname, '..', '..', 'uploads');
    await fs.unlink(path.join(uploadDir, doc.stored_name)).catch(() => {});
  }
  return deleted;
}

module.exports = { saveUpload, deleteDocument, sanitizeFilename };
