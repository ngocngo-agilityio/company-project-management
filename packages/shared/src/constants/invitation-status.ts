import { z } from "zod";

/** State of an invitation. Values match the Prisma `InvitationStatus` enum. */
export const INVITATION_STATUS = {
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED",
  EXPIRED: "EXPIRED",
  REVOKED: "REVOKED",
} as const;

export const invitationStatusSchema = z.enum(INVITATION_STATUS);
export type InvitationStatus = z.infer<typeof invitationStatusSchema>;
