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

// Staff dashboard: own stats + limited user list
router.get('/stats', requireAuth, requirePermission(PERMISSIONS.ANALYTICS_READ_OWN), async (req, res, next) => {
  try {
    const own = await auditModel.listByActor(req.user.id, { limit: 20 });
    res.json({ recentActions: own });
  } catch (e) { next(e); }
});

router.get('/users', requireAuth, requirePermission(PERMISSIONS.USERS_READ_LIMITED), adminRateLimit, async (req, res, next) => {
  try {
    const { q, status, limit = 30, offset = 0 } = req.query;
    const rows = await userModel.listUsers({ role: 'user', status: status || undefined, q: q ? String(q).slice(0,100) : undefined, limit: Math.min(Number(limit)||30, 100), offset: Number(offset)||0 });
    res.json({ users: rows });
  } catch (e) { next(e); }
});

module.exports = router;
