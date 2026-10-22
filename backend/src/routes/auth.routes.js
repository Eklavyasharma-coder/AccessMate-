'use strict';
const router      = require('express').Router();
const controller  = require('../controllers/auth.controller');
const { requireAuth }       = require('../middleware/auth.middleware');
const { authRateLimit }     = require('../middleware/security.middleware');
const cookieParser = require('cookie-parser');

router.use(cookieParser());
router.use(authRateLimit);

router.post('/register',        controller.register);
router.post('/login',           controller.login);
router.post('/refresh',         controller.refreshToken);
router.get('/me',               requireAuth, controller.me);
router.post('/logout',          requireAuth, controller.logout);
router.post('/forgot-password', controller.forgotPassword);
router.post('/reset-password',  controller.resetPassword);
router.post('/change-password', requireAuth, controller.changePassword);

module.exports = router;
