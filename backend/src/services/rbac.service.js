'use strict';
/**
 * RBAC service — resolves the effective permission set for an authenticated user.
 * Called by rbac.middleware on every protected request.
 */
const { ROLE_PERMISSIONS, ROLES } = require('../config/permissions');
const staffPermissionModel = require('../models/staffPermission.model');

/**
 * Returns the effective Set<string> of permissions for a user.
 * For staff, merges role defaults with staff_permissions table overrides.
 */
async function resolvePermissions(userId, role) {
  // Super Admin gets everything — short-circuit DB lookup.
  if (role === ROLES.SUPER_ADMIN) {
    return ROLE_PERMISSIONS[ROLES.SUPER_ADMIN];
  }

  const base = new Set(ROLE_PERMISSIONS[role] || []);

  if (role === ROLES.STAFF) {
    const overrides = await staffPermissionModel.getForUser(userId);
    for (const { permission, granted } of overrides) {
      if (granted) base.add(permission);
      else         base.delete(permission);
    }
  }

  return base;
}

/**
 * Check whether a permission set satisfies a requirement.
 */
function hasPermission(permSet, required) {
  return permSet.has(required);
}

module.exports = { resolvePermissions, hasPermission };
