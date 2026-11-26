import { z } from "zod";

/** Role of a person in a project. Values match the Prisma `MembershipRole` enum. */
export const MEMBERSHIP_ROLE = {
  OWNER: "OWNER",
  MEMBER: "MEMBER",
  OBSERVER: "OBSERVER",
} as const;

export const membershipRoleSchema = z.enum(MEMBERSHIP_ROLE);
export type MembershipRole = z.infer<typeof membershipRoleSchema>;
