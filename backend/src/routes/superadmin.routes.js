'use strict';
const router      = require('express').Router();
const { requireAuth }       = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');
const { adminRateLimit }    = require('../middleware/security.middleware');
const { PERMISSIONS, ROLES } = require('../config/permissions');
const auditModel  = require('../models/auditLog.model');
const userModel   = require('../models/user.model');
const { PERMISSIONS: P }    = require('../config/permissions');
const cookieParser = require('cookie-parser');

router.use(cookieParser());

// Super Admin: full user list including admins
router.get('/users', requireAuth, requirePermission(P.ADMINS_READ), adminRateLimit, async (req, res, next) => {
  try {
    const { role, status, q, limit = 50, offset = 0 } = req.query;
    const rows = await userModel.listUsers({ role: role||undefined, status: status||undefined, q: q?String(q).slice(0,100):undefined, limit: Math.min(Number(limit)||50,200), offset: Number(offset)||0 });
    res.json({ users: rows });
  } catch (e) { next(e); }
});

// Super Admin: full audit log
router.get('/audit', requireAuth, requirePermission(P.AUDIT_LOGS_READ), adminRateLimit, async (req, res, next) => {
  try {
    const { action, outcome, limit = 200, offset = 0 } = req.query;
    const logs = await auditModel.listRecent({ action: action||undefined, outcome: outcome||undefined, limit: Math.min(Number(limit)||200,1000), offset: Number(offset)||0 });
    res.json({ logs });
  } catch (e) { next(e); }
});

// Super Admin: permission catalog
router.get('/permissions', requireAuth, requirePermission(P.PERMISSIONS_READ), (req, res) => {
  res.json({ permissions: Object.values(PERMISSIONS), roles: Object.values(ROLES) });
});

module.exports = router;
