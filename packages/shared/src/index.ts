import { z } from "zod";

export const healthResponseSchema = z.object({ ok: z.literal(true) });
export type HealthResponse = z.infer<typeof healthResponseSchema>;

export { normalizeEmail } from "./email.js";
export { meResponseSchema, type MeResponse } from "./auth.js";
export * from "./constants/index.js";
