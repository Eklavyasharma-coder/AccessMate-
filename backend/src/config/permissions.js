'use strict';
/**
 * Central permission catalog and role–permission matrix.
 * The backend always resolves permissions from this module.
 * Never trust role or permission values supplied by the browser.
 */

const ROLES = Object.freeze({
  USER:        'user',
  STAFF:       'staff',
  ADMIN:       'admin',
  SUPER_ADMIN: 'super_admin',
});

const PERMISSIONS = Object.freeze({
  // Own resources
  DOCUMENTS_READ_OWN:       'documents.read_own',
  DOCUMENTS_MANAGE_OWN:     'documents.manage_own',
  HISTORY_READ_OWN:         'history.read_own',
  ANALYTICS_READ_OWN:       'analytics.read_own',
  PROFILE_READ_OWN:         'profile.read_own',
  PROFILE_UPDATE_OWN:       'profile.update_own',

  // User management
  USERS_READ_LIMITED:       'users.read_limited',
  USERS_READ:               'users.read',
  USERS_UPDATE:             'users.update',
  USERS_SUSPEND:            'users.suspend',
  USERS_RESTORE:            'users.restore',
  USERS_DELETE:             'users.delete',

  // Staff management
  STAFF_READ:               'staff.read',
  STAFF_CREATE:             'staff.create',
  STAFF_UPDATE:             'staff.update',
  STAFF_DEACTIVATE:         'staff.deactivate',
  STAFF_RESTORE:            'staff.restore',
  STAFF_PERMISSIONS_ASSIGN: 'staff.permissions.assign',

  // Admin management
  ADMINS_READ:              'admins.read',
  ADMINS_CREATE:            'admins.create',
  ADMINS_DEACTIVATE:        'admins.deactivate',
  ADMINS_RESTORE:           'admins.restore',

  // Roles and permissions
  ROLES_READ:               'roles.read',
  ROLES_ASSIGN:             'roles.assign',
  PERMISSIONS_READ:         'permissions.read',
  PERMISSIONS_MANAGE:       'permissions.manage',

  // Analytics and reporting
  ANALYTICS_READ_AUTH:      'analytics.read_authorized',
  REPORTS_READ:             'reports.read',
  SUPPORT_READ:             'support.read',
  SUPPORT_MANAGE:           'support.manage',

  // Security and system
  AUDIT_LOGS_READ:          'audit_logs.read',
  SECURITY_EVENTS_READ:     'security_events.read',
  SETTINGS_READ:            'settings.read',
  SETTINGS_MANAGE:          'settings.manage',
  DOCUMENTS_READ_AUTH:      'documents.read_authorized',
});

/**
 * Default permissions granted to each role.
 * Staff may receive additional permissions via staff_permissions table.
 * Super Admin always gets everything.
 */
const ROLE_PERMISSIONS = Object.freeze({
  [ROLES.USER]: new Set([
    PERMISSIONS.DOCUMENTS_READ_OWN,
    PERMISSIONS.DOCUMENTS_MANAGE_OWN,
    PERMISSIONS.HISTORY_READ_OWN,
    PERMISSIONS.ANALYTICS_READ_OWN,
    PERMISSIONS.PROFILE_READ_OWN,
    PERMISSIONS.PROFILE_UPDATE_OWN,
  ]),

  [ROLES.STAFF]: new Set([
    PERMISSIONS.DOCUMENTS_READ_OWN,
    PERMISSIONS.DOCUMENTS_MANAGE_OWN,
    PERMISSIONS.HISTORY_READ_OWN,
    PERMISSIONS.ANALYTICS_READ_OWN,
    PERMISSIONS.PROFILE_READ_OWN,
    PERMISSIONS.PROFILE_UPDATE_OWN,
    // Staff start with minimal extra permissions;
    // authorized admins may grant additional ones via staff_permissions table.
  ]),

  [ROLES.ADMIN]: new Set([
    PERMISSIONS.DOCUMENTS_READ_OWN,
    PERMISSIONS.DOCUMENTS_MANAGE_OWN,
    PERMISSIONS.HISTORY_READ_OWN,
    PERMISSIONS.ANALYTICS_READ_OWN,
    PERMISSIONS.PROFILE_READ_OWN,
    PERMISSIONS.PROFILE_UPDATE_OWN,
    PERMISSIONS.USERS_READ_LIMITED,
    PERMISSIONS.USERS_READ,
    PERMISSIONS.USERS_UPDATE,
    PERMISSIONS.USERS_SUSPEND,
    PERMISSIONS.USERS_RESTORE,
    PERMISSIONS.USERS_DELETE,
    PERMISSIONS.STAFF_READ,
    PERMISSIONS.STAFF_CREATE,
    PERMISSIONS.STAFF_UPDATE,
    PERMISSIONS.STAFF_DEACTIVATE,
    PERMISSIONS.STAFF_RESTORE,
    PERMISSIONS.STAFF_PERMISSIONS_ASSIGN,
    PERMISSIONS.ROLES_READ,
    PERMISSIONS.PERMISSIONS_READ,
    PERMISSIONS.ANALYTICS_READ_AUTH,
    PERMISSIONS.REPORTS_READ,
    PERMISSIONS.SUPPORT_READ,
    PERMISSIONS.SUPPORT_MANAGE,
    PERMISSIONS.SETTINGS_READ,
  ]),

  [ROLES.SUPER_ADMIN]: new Set(Object.values(PERMISSIONS)),
});

/**
 * Permissions that Staff accounts may be granted (delegation ceiling).
 * An Admin can only assign permissions from this set to Staff.
 */
const STAFF_ASSIGNABLE_PERMISSIONS = new Set([
  PERMISSIONS.USERS_READ_LIMITED,
  PERMISSIONS.USERS_READ,
  PERMISSIONS.USERS_UPDATE,
  PERMISSIONS.USERS_SUSPEND,
  PERMISSIONS.USERS_RESTORE,
  PERMISSIONS.STAFF_READ,
  PERMISSIONS.ANALYTICS_READ_AUTH,
  PERMISSIONS.REPORTS_READ,
  PERMISSIONS.SUPPORT_READ,
  PERMISSIONS.SUPPORT_MANAGE,
  PERMISSIONS.PERMISSIONS_READ,
  PERMISSIONS.AUDIT_LOGS_READ,
  PERMISSIONS.SECURITY_EVENTS_READ,
  PERMISSIONS.DOCUMENTS_READ_AUTH,
]);

/** Role ordering for privilege comparison (higher index = more privilege). */
const ROLE_ORDER = [ROLES.USER, ROLES.STAFF, ROLES.ADMIN, ROLES.SUPER_ADMIN];

function getRoleLevel(role) {
  const idx = ROLE_ORDER.indexOf(role);
  return idx === -1 ? -1 : idx;
}

function isRoleAtLeast(actorRole, minimumRole) {
  return getRoleLevel(actorRole) >= getRoleLevel(minimumRole);
}

module.exports = { ROLES, PERMISSIONS, ROLE_PERMISSIONS, STAFF_ASSIGNABLE_PERMISSIONS, ROLE_ORDER, getRoleLevel, isRoleAtLeast };
