export const SYSTEM_ROLES = ['USER', 'ADMIN', 'MODERATOR'] as const;
export type SystemRole = (typeof SYSTEM_ROLES)[number];

export const DEFAULT_ROLE: SystemRole = 'USER';

export const ROLE_DEFINITIONS: ReadonlyArray<{
  name: SystemRole;
  description: string;
}> = [
  {
    name: 'USER',
    description: 'Default application user with basic access',
  },
  {
    name: 'ADMIN',
    description: 'Administrator with full application management access',
  },
  {
    name: 'MODERATOR',
    description: 'Moderator with limited operational controls',
  },
];

export const PERMISSION_DEFINITIONS = [
  { key: 'profile:read', description: 'Read own profile information' },
  { key: 'profile:update', description: 'Update own profile information' },
  { key: 'auth:change-password', description: 'Change account password' },
  { key: 'users:read', description: 'Read user records' },
  { key: 'users:manage', description: 'Create/update/delete users and roles' },
  { key: 'roles:manage', description: 'Manage role and permission assignments' },
  { key: 'system:health:read', description: 'Read system health and diagnostics' },
] as const;

export type PermissionKey = (typeof PERMISSION_DEFINITIONS)[number]['key'];

export const ROLE_PERMISSION_MAP: Readonly<Record<SystemRole, readonly PermissionKey[]>> = {
  USER: ['profile:read', 'profile:update', 'auth:change-password'],
  MODERATOR: ['profile:read', 'profile:update', 'auth:change-password', 'users:read', 'system:health:read'],
  ADMIN: [
    'profile:read',
    'profile:update',
    'auth:change-password',
    'users:read',
    'users:manage',
    'roles:manage',
    'system:health:read',
  ],
};
