'use strict';
const router      = require('express').Router();
const { requireAuth }       = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');
const { adminRateLimit }    = require('../middleware/security.middleware');
const { PERMISSIONS }       = require('../config/permissions');
const auditModel  = require('../models/auditLog.model');
const userModel   = require('../models/user.model');
const cookieParser = require('cookie-parser');

router.use(cookieParser());

// Admin dashboard data
router.get('/stats', requireAuth, requirePermission(PERMISSIONS.ANALYTICS_READ_AUTH), async (req, res, next) => {
  try {
    const [users, recent] = await Promise.all([
      userModel.listUsers({ limit: 5, offset: 0 }),
      auditModel.listRecent({ limit: 20 }),
    ]);
    res.json({ recentUsers: users, recentAuditEvents: recent });
  } catch (e) { next(e); }
});

router.get('/users', requireAuth, requirePermission(PERMISSIONS.USERS_READ), adminRateLimit, async (req, res, next) => {
  try {
    const { role, status, q, limit = 50, offset = 0 } = req.query;
    const rows = await userModel.listUsers({ role: role||undefined, status: status||undefined, q: q?String(q).slice(0,100):undefined, limit: Math.min(Number(limit)||50,200), offset: Number(offset)||0 });
    res.json({ users: rows });
  } catch (e) { next(e); }
});

router.get('/audit', requireAuth, requirePermission(PERMISSIONS.AUDIT_LOGS_READ), adminRateLimit, async (req, res, next) => {
  try {
    const { action, outcome, limit = 100, offset = 0 } = req.query;
    const logs = await auditModel.listRecent({ action: action||undefined, outcome: outcome||undefined, limit: Math.min(Number(limit)||100,500), offset: Number(offset)||0 });
    res.json({ logs });
  } catch (e) { next(e); }
});

module.exports = router;
