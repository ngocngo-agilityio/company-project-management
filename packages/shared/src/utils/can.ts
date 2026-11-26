import { PERMISSIONS, type Action } from "../constants/permissions.js";
import type { Role } from "../constants/roles.js";

/**
 * May this role do this action? Pure, no database.
 *
 * Role-level answer only. The caller still checks project membership (404)
 * and ownership of a comment. The web app uses this only to hide controls;
 * the server is the real check.
 */
export function can(role: Role, action: Action): boolean {
  const allowed: readonly Role[] | undefined = PERMISSIONS[action];
  return allowed?.includes(role) ?? false;
}
