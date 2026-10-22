'use strict';
const userModel      = require('../models/user.model');
const auditSvc       = require('../services/auditLog.service');
const authService    = require('../services/auth.service');
const { PERMISSIONS, ROLES, isRoleAtLeast } = require('../config/permissions');
const staffPermModel = require('../models/staffPermission.model');
const invitationModel = require('../models/invitation.model');
const emailService   = require('../services/email.service');
const crypto         = require('crypto');

// ── Own profile ──────────────────────────────────────────────────────────────
async function getProfile(req, res, next) {
  try {
    const user = await userModel.findPublicById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ user });
  } catch (e) { next(e); }
}

async function updateProfile(req, res, next) {
  try {
    const { name, preferences } = req.body;
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim() || name.trim().length > 120)
        return res.status(400).json({ error: 'Name must be 1–120 characters.' });
    }
    if (preferences !== undefined && typeof preferences !== 'object')
      return res.status(400).json({ error: 'Preferences must be an object.' });

    const updated = await userModel.updateProfile(req.user.id, {
      name: name?.trim(),
      preferences,
    });
    await auditSvc.log({ req, actorId: req.user.id, actorRole: req.user.role, action: 'user.profile.update', outcome: 'success' });
    res.json({ user: updated });
  } catch (e) { next(e); }
}

// ── Admin: list users ────────────────────────────────────────────────────────
async function listUsers(req, res, next) {
  try {
    const { role, status, q, limit = 50, offset = 0 } = req.query;
    const rows = await userModel.listUsers({
      role:   role   || undefined,
      status: status || undefined,
      q:      q      ? String(q).slice(0, 100) : undefined,
      limit:  Math.min(Number(limit) || 50, 200),
      offset: Number(offset) || 0,
    });
    res.json({ users: rows });
  } catch (e) { next(e); }
}

// ── Admin/Super Admin: suspend / restore / delete ────────────────────────────
async function suspendUser(req, res, next) {
  try {
    const targetId = Number(req.params.id);
    if (!targetId) return res.status(400).json({ error: 'Invalid user ID.' });

    const target = await userModel.findPublicById(targetId);
    if (!target) return res.status(404).json({ error: 'User not found.' });

    // Privilege check: cannot act on equal or higher role
    if (isRoleAtLeast(target.role, req.user.role)) {
      return res.status(403).json({ error: 'You cannot suspend an account with equal or higher privileges.' });
    }
    if (targetId === req.user.id) return res.status(400).json({ error: 'You cannot suspend your own account.' });

    const updated = await userModel.updateStatus(targetId, 'suspended');
    await authService.revokeAllSessions(targetId);
    await auditSvc.log({ req, actorId: req.user.id, actorRole: req.user.role, action: 'user.suspend', targetType: 'user', targetId, outcome: 'success' });
    res.json({ user: updated, message: 'Account suspended and all sessions revoked.' });
  } catch (e) { next(e); }
}

async function restoreUser(req, res, next) {
  try {
    const targetId = Number(req.params.id);
    if (!targetId) return res.status(400).json({ error: 'Invalid user ID.' });
    const updated = await userModel.updateStatus(targetId, 'active');
    if (!updated) return res.status(404).json({ error: 'User not found.' });
    await auditSvc.log({ req, actorId: req.user.id, actorRole: req.user.role, action: 'user.restore', targetType: 'user', targetId, outcome: 'success' });
    res.json({ user: updated, message: 'Account restored.' });
  } catch (e) { next(e); }
}

async function deleteUser(req, res, next) {
  try {
    const targetId = Number(req.params.id);
    if (!targetId) return res.status(400).json({ error: 'Invalid user ID.' });

    const target = await userModel.findPublicById(targetId);
    if (!target) return res.status(404).json({ error: 'User not found.' });
    if (isRoleAtLeast(target.role, req.user.role))
      return res.status(403).json({ error: 'You cannot delete an account with equal or higher privileges.' });
    if (targetId === req.user.id)
      return res.status(400).json({ error: 'You cannot delete your own account.' });

    await userModel.remove(targetId);
    await auditSvc.log({ req, actorId: req.user.id, actorRole: req.user.role, action: 'user.delete', targetType: 'user', targetId, outcome: 'success', details: { email: target.email } });
    res.json({ message: 'User account deleted.' });
  } catch (e) { next(e); }
}

// ── Super Admin: assign role ─────────────────────────────────────────────────
async function assignRole(req, res, next) {
  try {
    const targetId = Number(req.params.id);
    const { role } = req.body;
    if (!targetId) return res.status(400).json({ error: 'Invalid user ID.' });
    if (!Object.values(ROLES).includes(role)) return res.status(400).json({ error: 'Invalid role.' });

    // Only super_admin can assign roles; cannot assign super_admin from this route except by existing super_admin
    if (role === ROLES.SUPER_ADMIN && req.user.role !== ROLES.SUPER_ADMIN)
      return res.status(403).json({ error: 'Only Super Admins may assign the Super Admin role.' });
    if (targetId === req.user.id)
      return res.status(400).json({ error: 'You cannot change your own role.' });

    // Guard: prevent deactivating last super admin
    if (role !== ROLES.SUPER_ADMIN) {
      const target = await userModel.findPublicById(targetId);
      if (target?.role === ROLES.SUPER_ADMIN) {
        const count = await userModel.countActiveSuperAdmins();
        if (count <= 1) return res.status(409).json({ error: 'Cannot change role of the last active Super Admin.' });
      }
    }

    const updated = await userModel.updateRole(targetId, role);
    if (!updated) return res.status(404).json({ error: 'User not found.' });
    await authService.revokeAllSessions(targetId);
    await auditSvc.log({ req, actorId: req.user.id, actorRole: req.user.role, action: 'user.role.assign', targetType: 'user', targetId, outcome: 'success', details: { newRole: role } });
    res.json({ user: updated, message: `Role updated to ${role}. All sessions revoked.` });
  } catch (e) { next(e); }
}

// ── Admin: invite staff ──────────────────────────────────────────────────────
async function inviteUser(req, res, next) {
  try {
    const { email, role } = req.body;
    if (!email || !role) return res.status(400).json({ error: 'Email and role are required.' });

    // Admins can only invite staff; super admins can invite up to admin
    const allowedRoles = req.user.role === ROLES.SUPER_ADMIN ? [ROLES.STAFF, ROLES.ADMIN] : [ROLES.STAFF];
    if (!allowedRoles.includes(role))
      return res.status(403).json({ error: `You are not permitted to invite a user with role: ${role}.` });

    if (await userModel.existsByEmail(email.trim().toLowerCase()))
      return res.status(409).json({ error: 'An account with this email already exists.' });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 48 * 3600 * 1000); // 48 hours
    await invitationModel.create({ email: email.trim().toLowerCase(), role, token, invitedBy: req.user.id, expiresAt });

    let emailSent = false;
    try { await emailService.sendInvitation(email, role, token); emailSent = true; } catch {}

    await auditSvc.log({ req, actorId: req.user.id, actorRole: req.user.role, action: 'user.invite', targetType: 'invitation', outcome: 'success', details: { email, role, emailSent } });
    res.status(201).json({ message: `Invitation created for ${email} as ${role}.`, emailSent, token: emailSent ? undefined : token });
  } catch (e) { next(e); }
}

// ── Admin: assign staff permission ───────────────────────────────────────────
async function setStaffPermission(req, res, next) {
  try {
    const targetId = Number(req.params.id);
    const { permission, granted } = req.body;
    if (!targetId || !permission || typeof granted !== 'boolean')
      return res.status(400).json({ error: 'targetId, permission, and granted (boolean) are required.' });

    const target = await userModel.findPublicById(targetId);
    if (!target || target.role !== ROLES.STAFF)
      return res.status(404).json({ error: 'Staff user not found.' });

    // Admins cannot grant permissions they themselves lack
    const actorPerms = req.permissions;
    if (actorPerms && !actorPerms.has(permission))
      return res.status(403).json({ error: 'You cannot grant a permission you do not hold.' });

    await staffPermModel.set({ userId: targetId, permission, granted, grantedBy: req.user.id });
    await auditSvc.log({ req, actorId: req.user.id, actorRole: req.user.role, action: 'staff.permission.set', targetType: 'user', targetId, outcome: 'success', details: { permission, granted } });
    res.json({ message: `Permission '${permission}' ${granted ? 'granted' : 'revoked'} for staff user ${targetId}.` });
  } catch (e) { next(e); }
}

module.exports = { getProfile, updateProfile, listUsers, suspendUser, restoreUser, deleteUser, assignRole, inviteUser, setStaffPermission };
