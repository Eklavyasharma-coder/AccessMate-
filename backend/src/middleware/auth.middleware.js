'use strict';
const jwt = require('jsonwebtoken');
const users = require('../models/user.model');
const revokedTokens = require('../models/revokedToken.model');

/**
 * requireAuth — verifies Bearer JWT, checks revocation list, and checks account status.
 * Attaches req.user = { id, role, jti, exp } on success.
 */
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }

  // Check revocation blocklist
  if (payload.jti && await revokedTokens.isRevoked(payload.jti)) {
    return res.status(401).json({ error: 'Token has been revoked. Please sign in again.' });
  }

  // Fetch live account status — catches suspended/deactivated accounts
  const user = await users.findById(payload.sub);
  if (!user) return res.status(401).json({ error: 'Account no longer exists.' });
  if (user.status === 'suspended')   return res.status(403).json({ error: 'Your account has been suspended.' });
  if (user.status === 'deactivated') return res.status(403).json({ error: 'This account has been deactivated.' });

  req.user = { id: user.id, role: user.role, jti: payload.jti, exp: payload.exp };
  return next();
}

module.exports = { requireAuth };
