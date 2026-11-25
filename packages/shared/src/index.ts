import { z } from "zod";

export const healthResponseSchema = z.object({ ok: z.literal(true) });
export type HealthResponse = z.infer<typeof healthResponseSchema>;

export { normalizeEmail } from "./email.js";
export {
  SESSION_COOKIE_NAME,
  meResponseSchema,
  signInErrorSchema,
  apiErrorSchema,
  type MeResponse,
  type SignInError,
  type ApiError,
} from "./auth.js";
