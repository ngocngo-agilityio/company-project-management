import { z } from "zod";

/** Longest email address (RFC 5321). */
const EMAIL_MAX = 254;

/** Body of `POST /api/invitations`: the Google account email of the person to invite. Stored in lowercase. */
export const createInvitationRequestSchema = z.object({
  email: z.string().trim().toLowerCase().max(EMAIL_MAX).pipe(z.email()),
});
export type CreateInvitationRequest = z.infer<typeof createInvitationRequestSchema>;
