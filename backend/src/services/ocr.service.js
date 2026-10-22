'use strict';
const fs   = require('fs/promises');
const path = require('path');

async function extract(filePath, mimeType, language = 'eng') {
  if (mimeType === 'text/plain' || path.extname(filePath).toLowerCase() === '.txt') {
    return fs.readFile(filePath, 'utf8');
  }
  if (!/^image\/(png|jpeg|jpg|webp|bmp|tiff?)$/i.test(mimeType)) {
    const e = new Error('OCR currently supports image files and plain-text files. PDF/Word OCR requires document-to-image conversion setup.'); e.status = 415; throw e;
  }

  let Tesseract;
  try { Tesseract = require('tesseract.js'); }
  catch { const e = new Error('OCR dependency is not installed. Run npm install in backend.'); e.status = 503; throw e; }

  const allowed = new Set(['eng', 'hin', 'eng+hin']);
  if (!allowed.has(language)) { const e = new Error('Supported OCR languages: eng, hin, eng+hin.'); e.status = 400; throw e; }

  const timeoutMs = Number(process.env.OCR_TIMEOUT_MS || 60000);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const result = await Promise.race([
      Tesseract.recognize(filePath, language, { logger: () => {} }),
      new Promise((_, reject) => controller.signal.addEventListener('abort', () =>
        reject(Object.assign(new Error('OCR timed out. Try a smaller image.'), { status: 504 }))
      )),
    ]);
    return String(result.data?.text || '').trim();
  } catch (err) {
    if (err.status) throw err;
    const e = new Error('OCR failed. Confirm the image is readable and language data is available.'); e.status = 502; throw e;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { extract };
