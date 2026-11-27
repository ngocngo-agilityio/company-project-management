import { SIGN_IN_ERROR, type SignInError } from "@board/shared";
import type { AuthStore, StoredUser } from "../types/index.js";

export type GateDecision = { allowed: true; isFirstSuperAdmin: boolean } | { allowed: false; code: SignInError };

interface GateInput {
  store: AuthStore;
  /** The person found by Google id or email, or null when there is no row yet. */
  user: StoredUser | null;
  googleId: string;
  /** Lowercase. */
  email: string;
  /** Lowercase email of the first Super Admin, or undefined when none is configured. */
  superAdminEmail: string | undefined;
  now: Date;
}

/**
 * Decides whether a person with a verified Google email may sign in. Reads only; writes nothing.
 * Order: Inactive, then a Google account mismatch, then the three groups let in:
 * the first Super Admin, an unexpired Pending invitation, a person with an account that is not deactivated
 * (a project member, or someone whose invitation was Accepted and who has no project).
 */
export async function evaluateGate({
  store,
  user,
  googleId,
  email,
  superAdminEmail,
  now,
}: GateInput): Promise<GateDecision> {
  if (user?.deactivatedAt) return { allowed: false, code: SIGN_IN_ERROR.DEACTIVATED };
  // An email already linked to another Google account is not let in.
  if (user?.googleId && user.googleId !== googleId) return { allowed: false, code: SIGN_IN_ERROR.NOT_INVITED };

  const isFirstSuperAdmin = superAdminEmail !== undefined && email === superAdminEmail;
  if (isFirstSuperAdmin) return { allowed: true, isFirstSuperAdmin };
  if (await store.hasPendingInvitation(email, now)) return { allowed: true, isFirstSuperAdmin };
  // Any other person with an account who is not deactivated (refused above): a project member, or someone
  // whose invitation was Accepted and who has no project yet.
  if (user) return { allowed: true, isFirstSuperAdmin };
  return { allowed: false, code: SIGN_IN_ERROR.NOT_INVITED };
}
