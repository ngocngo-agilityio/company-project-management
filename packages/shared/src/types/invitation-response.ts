import { z } from "zod";

export const INVITATION_STATUSES = ["PENDING", "ACCEPTED", "EXPIRED", "REVOKED"] as const;
export type InvitationStatus = (typeof INVITATION_STATUSES)[number];

/**
 * One invitation as the People screen shows it. `project` and `role` are null for an invitation to the
 * app with no project. `status` is Expired as soon as `expiresAt` has passed, even if the row still says Pending.
 */
export const invitationSchema = z.object({
  id: z.uuid(),
  email: z.string(),
  project: z.object({ id: z.uuid(), name: z.string() }).nullable(),
  role: z.enum(["OWNER", "MEMBER", "OBSERVER"]).nullable(),
  status: z.enum(INVITATION_STATUSES),
  invitedBy: z.object({ id: z.uuid(), name: z.string() }),
  createdAt: z.iso.datetime(),
  expiresAt: z.iso.datetime(),
});
export type Invitation = z.infer<typeof invitationSchema>;

/** Response of `POST /api/invitations` and `POST /api/invitations/:id/resend`. */
export const invitationResponseSchema = invitationSchema;
export type InvitationResponse = Invitation;

/** Response of `GET /api/invitations`, newest first. */
export const invitationListResponseSchema = z.object({ invitations: z.array(invitationSchema) });
export type InvitationListResponse = z.infer<typeof invitationListResponseSchema>;
