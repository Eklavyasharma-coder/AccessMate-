'use strict';
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const users = require('../models/user.model');
const revokedTokens = require('../models/revokedToken.model');
const refreshTokenModel = require('../models/refreshToken.model');

// ── Secret validation ────────────────────────────────────────────────────────
function assertSecret(name, value) {
  if (!value || value.length < 32 || value.startsWith('replace_')) {
    throw new Error(`Set a private ${name} (32+ chars) in backend/.env before using authentication.`);
  }
}

// ── Token factories ───────────────────────────────────────────────────────────
function makeAccessToken(user) {
  assertSecret('JWT_SECRET', process.env.JWT_SECRET);
  const jti = crypto.randomUUID();
  return {
    token: jwt.sign(
      { sub: String(user.id), role: user.role, jti },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    ),
    jti,
  };
}

function makeRefreshToken() {
  assertSecret('REFRESH_SECRET', process.env.REFRESH_SECRET);
  const raw = crypto.randomBytes(48).toString('base64url');
  const expiresAt = new Date(Date.now() + parseDuration(process.env.REFRESH_EXPIRES_IN || '7d'));
  return { raw, expiresAt };
}

/** Parse simple duration strings like '7d', '15m', '1h' to milliseconds. */
function parseDuration(str) {
  const m = /^(\d+)([smhd])$/.exec(str);
  if (!m) return 7 * 24 * 3600 * 1000;
  const n = Number(m[1]);
  return n * { s: 1000, m: 60000, h: 3600000, d: 86400000 }[m[2]];
}

// ── Auth operations ───────────────────────────────────────────────────────────
async function register({ name, email, password, role = 'user' }) {
  const existing = await users.findByEmail(email);
  if (existing) {
    const e = new Error('An account with this email already exists.'); e.status = 409; throw e;
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await users.create({ name, email, passwordHash, role });
  const { token: accessToken } = makeAccessToken(user);
  const refresh = makeRefreshToken();
  await refreshTokenModel.create({ userId: user.id, token: refresh.raw, expiresAt: refresh.expiresAt });
  return { user: sanitize(user), accessToken, refreshToken: refresh.raw };
}

async function login({ email, password }) {
  const user = await users.findByEmail(email);
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    const e = new Error('Email or password is incorrect.'); e.status = 401; throw e;
  }
  if (user.status === 'suspended') {
    const e = new Error('Your account has been suspended. Contact support.'); e.status = 403; throw e;
  }
  if (user.status === 'deactivated') {
    const e = new Error('This account has been deactivated.'); e.status = 403; throw e;
  }
  await users.updateLastLogin(user.id);
  const { token: accessToken } = makeAccessToken(user);
  const refresh = makeRefreshToken();
  await refreshTokenModel.create({ userId: user.id, token: refresh.raw, expiresAt: refresh.expiresAt });
  return { user: sanitize(user), accessToken, refreshToken: refresh.raw };
}

async function refresh(rawRefreshToken) {
  const record = await refreshTokenModel.findValid(rawRefreshToken);
  if (!record) {
    const e = new Error('Invalid or expired refresh token.'); e.status = 401; throw e;
  }
  const user = await users.findById(record.user_id);
  if (!user || user.status !== 'active') {
    const e = new Error('Account is not active.'); e.status = 403; throw e;
  }
  // Rotate: revoke old, issue new
  await refreshTokenModel.revoke(rawRefreshToken);
  const { token: accessToken } = makeAccessToken(user);
  const newRefresh = makeRefreshToken();
  await refreshTokenModel.create({ userId: user.id, token: newRefresh.raw, expiresAt: newRefresh.expiresAt });
  return { accessToken, refreshToken: newRefresh.raw };
}

async function revokeSession(jti, exp, rawRefreshToken) {
  if (jti && exp) await revokedTokens.revoke(jti, new Date(exp * 1000));
  if (rawRefreshToken) await refreshTokenModel.revoke(rawRefreshToken);
}

async function revokeAllSessions(userId) {
  await refreshTokenModel.revokeAllForUser(userId);
}

async function changePassword(userId, currentPassword, newPassword) {
  const user = await users.findByEmail((await users.findPublicById(userId)).email);
  if (!user || !(await bcrypt.compare(currentPassword, user.password_hash))) {
    const e = new Error('Current password is incorrect.'); e.status = 401; throw e;
  }
  const hash = await bcrypt.hash(newPassword, 12);
  await users.updatePassword(userId, hash);
  await refreshTokenModel.revokeAllForUser(userId);
}

function sanitize(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status };
}

module.exports = { register, login, refresh, revokeSession, revokeAllSessions, changePassword, makeAccessToken };
