const router = require('express').Router();
const { requireAuth } = require('../middleware/auth.middleware');
const { aiRateLimit } = require('../middleware/security.middleware');
const ai = require('../services/ai.service'); const activity = require('../services/activity.service'); const documents = require('../models/document.model');
router.post('/analyze', requireAuth, aiRateLimit, async (req, res, next) => {
 try {
  const text = typeof req.body.text === 'string' ? req.body.text : ''; const question = typeof req.body.question === 'string' ? req.body.question : '';
  if (text.length > 60000) return res.status(413).json({ error: 'Text is too long for one analysis request.' });
  if (question.length > 4000) return res.status(400).json({ error: 'Question must be 4,000 characters or fewer.' });
  let documentId = null;
  if (req.body.documentId !== undefined && req.body.documentId !== null && req.body.documentId !== '') {
   if (!/^\d+$/.test(String(req.body.documentId))) return res.status(400).json({ error: 'Invalid document ID.' });
   const ownedDocument = await documents.findByIdAndUser(String(req.body.documentId), req.user.id);
   if (!ownedDocument) return res.status(404).json({ error: 'Document not found.' }); documentId = Number(req.body.documentId);
  }
  const answer = await ai.analyze({ text, question });
  await activity.record(req.user.id, 'ai.analyze', documentId, { characters: text.length, mode: question ? 'question' : 'summary' });
  return res.json({ answer });
 } catch (error) { return next(error); }
});
module.exports = router;
