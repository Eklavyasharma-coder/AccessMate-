'use strict';
const authService   = require('../services/auth.service');
const userModel     = require('../models/user.model');
const prtModel      = require('../models/passwordResetToken.model');
const emailService  = require('../services/email.service');
const activitySvc   = require('../services/activity.service');
const auditSvc      = require('../services/auditLog.service');
const crypto        = require('crypto');

async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;
    if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string'
        || !name.trim() || !email.trim() || !password)
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    if (password.length < 8 || password.length > 128)
      return res.status(400).json({ error: 'Password must be 8–128 characters.' });
    if (name.trim().length > 120)
      return res.status(400).json({ error: 'Name must be 120 characters or fewer.' });
    if (email.trim().length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ error: 'Enter a valid email address.' });

    const result = await authService.register({
      name: name.trim().slice(0, 120),
      email: email.trim().toLowerCase(),
      password,
    });

    await activitySvc.record(result.user.id, 'auth.register');
    await auditSvc.log({ req, actorId: result.user.id, actorRole: 'user', action: 'auth.register', outcome: 'success' });

    res.cookie('accessmate_refresh', result.refreshToken, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict', maxAge: 7 * 24 * 3600 * 1000, path: '/api/auth',
    });
    return res.status(201).json({ user: result.user, accessToken: result.accessToken });
  } catch (e) { next(e); }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password)
      return res.status(400).json({ error: 'Email and password are required.' });
    if (email.length > 255 || password.length > 128)
      return res.status(400).json({ error: 'Invalid email or password.' });

    const result = await authService.login({ email: email.trim().toLowerCase(), password });
    await activitySvc.record(result.user.id, 'auth.login');
    await auditSvc.log({ req, actorId: result.user.id, actorRole: result.user.role, action: 'auth.login', outcome: 'success' });

    res.cookie('accessmate_refresh', result.refreshToken, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict', maxAge: 7 * 24 * 3600 * 1000, path: '/api/auth',
    });
    return res.json({ user: result.user, accessToken: result.accessToken });
  } catch (e) {
    if (e.status === 401) {
      await auditSvc.log({ req, actorId: null, actorRole: null, action: 'auth.login', outcome: 'failure', details: { email: req.body?.email } });
    }
    next(e);
  }
}

async function me(req, res, next) {
  try {
    const user = await userModel.findPublicById(req.user.id);
    if (!user) return res.status(401).json({ error: 'Account no longer exists.' });
    res.json({ user });
  } catch (e) { next(e); }
}

async function refreshToken(req, res, next) {
  try {
    const raw = req.cookies?.accessmate_refresh;
    if (!raw) return res.status(401).json({ error: 'No refresh token provided.' });
    const result = await authService.refresh(raw);
    res.cookie('accessmate_refresh', result.refreshToken, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict', maxAge: 7 * 24 * 3600 * 1000, path: '/api/auth',
    });
    return res.json({ accessToken: result.accessToken });
  } catch (e) { next(e); }
}

async function logout(req, res, next) {
  try {
    const raw = req.cookies?.accessmate_refresh;
    await authService.revokeSession(req.user.jti, req.user.exp, raw);
    await activitySvc.record(req.user.id, 'auth.logout');
    await auditSvc.log({ req, actorId: req.user.id, actorRole: req.user.role, action: 'auth.logout', outcome: 'success' });
    res.clearCookie('accessmate_refresh', { path: '/api/auth' });
    return res.json({ message: 'Logged out. Access token revoked.' });
  } catch (e) { next(e); }
}

async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    if (typeof email !== 'string' || !email.trim())
      return res.status(400).json({ error: 'Email address is required.' });

    // Always respond 200 to avoid email enumeration.
    const user = await userModel.findByEmail(email.trim().toLowerCase());
    if (user && user.status === 'active') {
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour
      await prtModel.create({ userId: user.id, token, expiresAt });
      try {
        await emailService.sendPasswordReset(user.email, token);
      } catch (emailErr) {
        if (process.env.NODE_ENV !== 'production') console.warn('[email] not sent:', emailErr.message);
      }
    }
    return res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
  } catch (e) { next(e); }
}

async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body;
    if (!token || typeof password !== 'string' || password.length < 8 || password.length > 128)
      return res.status(400).json({ error: 'A valid token and a password of 8–128 characters are required.' });

    const record = await prtModel.findValid(token);
    if (!record) return res.status(400).json({ error: 'Reset link is invalid or has expired.' });

    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash(password, 12);
    await userModel.updatePassword(record.user_id, hash);
    await prtModel.markUsed(record.id);
    await authService.revokeAllSessions(record.user_id);
    await auditSvc.log({ req, actorId: record.user_id, actorRole: null, action: 'auth.password_reset', outcome: 'success' });
    return res.json({ message: 'Password updated. Please sign in with your new password.' });
  } catch (e) { next(e); }
}

async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string')
      return res.status(400).json({ error: 'Current password and new password are required.' });
    if (newPassword.length < 8 || newPassword.length > 128)
      return res.status(400).json({ error: 'New password must be 8–128 characters.' });

    await authService.changePassword(req.user.id, currentPassword, newPassword);
    await auditSvc.log({ req, actorId: req.user.id, actorRole: req.user.role, action: 'auth.password_change', outcome: 'success' });
    res.clearCookie('accessmate_refresh', { path: '/api/auth' });
    return res.json({ message: 'Password changed. Please sign in again.' });
  } catch (e) { next(e); }
}

module.exports = { register, login, me, refreshToken, logout, forgotPassword, resetPassword, changePassword };
