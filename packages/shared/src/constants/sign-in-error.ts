import { z } from "zod";

/** Codes the API puts in `WEB_ORIGIN/login?error=<code>` when sign-in is refused. No personal data. */
export const SIGN_IN_ERROR = {
  NOT_INVITED: "not_invited",
  UNVERIFIED_EMAIL: "unverified_email",
  DEACTIVATED: "deactivated",
  OAUTH_FAILED: "oauth_failed",
  /** Google sends `?error=access_denied` itself when the person cancels; we reuse the same value. */
  ACCESS_DENIED: "access_denied",
  RATE_LIMITED: "rate_limited",
} as const;

export const signInErrorSchema = z.enum(SIGN_IN_ERROR);
export type SignInError = z.infer<typeof signInErrorSchema>;
