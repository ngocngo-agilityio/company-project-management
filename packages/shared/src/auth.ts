import { z } from "zod";

/** Name of the sign-in session cookie. Its value is the `session.id`. */
export const SESSION_COOKIE_NAME = "sid";

/** Response of `GET /api/me`: the signed-in person. */
export const meResponseSchema = z.object({
  id: z.uuid(),
  email: z.string(),
  name: z.string(),
  avatarUrl: z.string().nullable(),
  isSuperAdmin: z.boolean(),
});
export type MeResponse = z.infer<typeof meResponseSchema>;

/** Codes the API puts in `WEB_ORIGIN/login?error=<code>` when sign-in is refused. No personal data. */
export const signInErrorSchema = z.enum([
  "not_invited",
  "unverified_email",
  "deactivated",
  "oauth_failed",
  "access_denied",
  "rate_limited",
]);
export type SignInError = z.infer<typeof signInErrorSchema>;

/** Body of an error answer such as 401. */
export const apiErrorSchema = z.object({ error: z.string() });
export type ApiError = z.infer<typeof apiErrorSchema>;
