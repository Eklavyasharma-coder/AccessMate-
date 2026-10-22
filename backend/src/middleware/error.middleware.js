'use strict';
function notFound(_req, res) {
  res.status(404).json({ error: 'API route not found.' });
}

function errorHandler(err, req, res, _next) {
  const rid = req.requestId ? ` [${req.requestId}]` : '';
  if (err.code === 'LIMIT_FILE_SIZE')       return res.status(413).json({ error: 'File is larger than the allowed limit.' });
  if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') return res.status(400).json({ error: 'Upload one file using the document field.' });
  if (err.type === 'entity.too.large')      return res.status(413).json({ error: 'Request body is too large.' });
  if (err.type === 'entity.parse.failed')   return res.status(400).json({ error: 'Request body contains invalid JSON.' });
  if (err.message === 'Unsupported file type') return res.status(415).json({ error: 'Unsupported file type. Upload a supported PDF, Word, text, or image file.' });
  if (err.message === 'Origin is not allowed by CORS.') return res.status(403).json({ error: 'This frontend origin is not allowed.' });
  if (process.env.NODE_ENV !== 'production') console.error(`[error]${rid}`, err);
  const status = err.status && err.status < 500 ? err.status : 500;
  const message = status < 500 ? err.message : `Internal server error.${rid}`;
  return res.status(status).json({ error: message });
}

module.exports = { notFound, errorHandler };
