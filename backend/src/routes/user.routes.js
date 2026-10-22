'use strict';
const router      = require('express').Router();
const controller  = require('../controllers/user.controller');
const { requireAuth }       = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');
const { adminRateLimit }    = require('../middleware/security.middleware');
const { PERMISSIONS }       = require('../config/permissions');
const cookieParser = require('cookie-parser');

router.use(cookieParser());

// Own profile
router.get('/me',         requireAuth, controller.getProfile);
router.patch('/me',       requireAuth, controller.updateProfile);

// User management — admin and above
router.get('/',           requireAuth, requirePermission(PERMISSIONS.USERS_READ),    controller.listUsers);
router.post('/invite',    requireAuth, requirePermission(PERMISSIONS.STAFF_CREATE),   controller.inviteUser);
router.patch('/:id/suspend',  requireAuth, requirePermission(PERMISSIONS.USERS_SUSPEND), adminRateLimit, controller.suspendUser);
router.patch('/:id/restore',  requireAuth, requirePermission(PERMISSIONS.USERS_RESTORE), adminRateLimit, controller.restoreUser);
router.delete('/:id',         requireAuth, requirePermission(PERMISSIONS.USERS_DELETE),  adminRateLimit, controller.deleteUser);
router.patch('/:id/role',     requireAuth, requirePermission(PERMISSIONS.ROLES_ASSIGN),  adminRateLimit, controller.assignRole);
router.put('/:id/staff-permissions', requireAuth, requirePermission(PERMISSIONS.STAFF_PERMISSIONS_ASSIGN), adminRateLimit, controller.setStaffPermission);

module.exports = router;
