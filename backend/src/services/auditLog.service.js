'use strict';
const auditLog = require('../models/auditLog.model');

/**
 * Thin service wrapper so controllers don't import the model directly.
 * Adds contextual defaults and ensures audit failures never crash requests.
 */
async function log({ req, actorId, actorRole, action, targetType, targetId, outcome = 'success', details = {} }) {
  await auditLog.insert({
    actorId,
    actorRole,
    action,
    targetType,
    targetId,
    outcome,
    details,
    ipAddress: req?.ip || null,
    requestId: req?.requestId || null,
  });
}

module.exports = { log };
