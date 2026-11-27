import { z } from "zod";
import { normalizeEmail } from "../utils/index.js";

/**
 * Body of `POST /api/test/login`, a route that exists only when the backend runs with `E2E=1`.
 * Signs in an existing person by email. An email with no row is created only with `isSuperAdmin: true`.
 */
export const testLoginRequestSchema = z.object({
  email: z.string().trim().pipe(z.email()).transform(normalizeEmail),
  name: z.string().trim().min(1).max(100).optional(),
  isSuperAdmin: z.boolean().default(false),
});
export type TestLoginRequest = z.infer<typeof testLoginRequestSchema>;
