import type { Role } from "./roles.js";

/**
 * Which roles may do which action. Source: docs/permissions.md.
 * Data, not logic: tests loop over it. Super Admin is listed explicitly in every row.
 *
 * Role-level only. "Is the person in this project" (404) and "is this their own comment"
 * are checked by the caller, not here.
 */
export const PERMISSIONS = {
  "people:view": ["SUPER_ADMIN"],
  "person:deactivate": ["SUPER_ADMIN"],
  "person:invite": ["SUPER_ADMIN"],
  "superadmin:invite": ["SUPER_ADMIN"],
  "project:create": ["SUPER_ADMIN"],
  "project:update": ["SUPER_ADMIN"],
  "project:archive": ["SUPER_ADMIN"],
  "project:view": ["SUPER_ADMIN", "OWNER", "MEMBER", "OBSERVER"],
  "member:manage": ["SUPER_ADMIN", "OWNER"],
  "member:leave": ["SUPER_ADMIN", "OWNER", "MEMBER", "OBSERVER"],
  "board:create": ["SUPER_ADMIN", "OWNER"],
  "list:manage": ["SUPER_ADMIN", "OWNER"],
  "label:manage": ["SUPER_ADMIN", "OWNER"],
  "card:write": ["SUPER_ADMIN", "OWNER", "MEMBER"],
  "card:archive": ["SUPER_ADMIN", "OWNER", "MEMBER"],
  "comment:write": ["SUPER_ADMIN", "OWNER", "MEMBER"],
  "comment:edit-own": ["SUPER_ADMIN", "OWNER", "MEMBER"],
  "comment:delete-any": ["SUPER_ADMIN", "OWNER"],
  "board:view": ["SUPER_ADMIN", "OWNER", "MEMBER", "OBSERVER"],
  "cards:mine": ["SUPER_ADMIN", "OWNER", "MEMBER", "OBSERVER"],
  "card:delete-archived": ["SUPER_ADMIN", "OWNER"],
  "structure:delete-archived": ["SUPER_ADMIN"],
  "systemlog:view": ["SUPER_ADMIN"],
} as const satisfies Record<string, readonly Role[]>;

/** Every permission key. */
export type Action = keyof typeof PERMISSIONS;
export const ACTIONS = Object.keys(PERMISSIONS) as Action[];
