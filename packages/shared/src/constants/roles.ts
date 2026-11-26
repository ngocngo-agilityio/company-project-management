/** Every role `can()` understands. Super Admin is a system flag, not a membership role. */
export const ROLES = ["SUPER_ADMIN", "OWNER", "MEMBER", "OBSERVER"] as const;
export type Role = (typeof ROLES)[number];

/** Roles stored on `membership.role` (per project). */
export const MEMBERSHIP_ROLES = ["OWNER", "MEMBER", "OBSERVER"] as const satisfies readonly Role[];
export type MembershipRole = (typeof MEMBERSHIP_ROLES)[number];
