import { z } from "zod";

/** Path parameters of `POST /api/invitations/:id/resend`. */
export const invitationIdParamSchema = z.object({ id: z.uuid() });
export type InvitationIdParam = z.infer<typeof invitationIdParamSchema>;
