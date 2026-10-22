'use strict';
const { resolvePermissions, hasPermission } = require('../services/rbac.service');
const auditLog = require('../services/auditLog.service');

/**
 * requirePermission(perm) — Express middleware factory.
 * Usage: router.get('/route', requireAuth, requirePermission('users.read'), handler)
 */
function requirePermission(permission) {
  return async function rbacMiddleware(req, res, next) {
    try {
      const permSet = await resolvePermissions(req.user.id, req.user.role);
      if (!hasPermission(permSet, permission)) {
        await auditLog.log({
          req,
          actorId:    req.user.id,
          actorRole:  req.user.role,
          action:     `access.denied.${permission}`,
          targetType: null,
          targetId:   null,
          outcome:    'denied',
          details:    { required: permission, path: req.path },
        });
        return res.status(403).json({ error: 'You do not have permission to perform this action.' });
      }
      // Attach resolved permissions for use in controllers (avoids second DB hit).
      req.permissions = permSet;
      return next();
    } catch (e) {
      return next(e);
    }
  };
}

module.exports = { requirePermission };
