import { z } from "zod";

/** Response of `GET /api/me`: the signed-in person. */
export const meResponseSchema = z.object({
  id: z.uuid(),
  email: z.string(),
  name: z.string(),
  avatarUrl: z.string().nullable(),
  isSuperAdmin: z.boolean(),
});
export type MeResponse = z.infer<typeof meResponseSchema>;
