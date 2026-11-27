import { z } from "zod";

/** Codes in the `error` field of an API error answer such as 401 or 403. */
export const API_ERROR = {
  UNAUTHORIZED: "unauthorized",
  FORBIDDEN: "forbidden",
  FORBIDDEN_ORIGIN: "forbidden_origin",
  VALIDATION_ERROR: "validation_error",
  NOT_FOUND: "not_found",
  CONFLICT: "conflict",
  INTERNAL_ERROR: "internal_error",
} as const;

const apiErrorCodeSchema = z.enum(API_ERROR);

/** Body of an error answer such as 401. */
export const apiErrorSchema = z.object({ error: apiErrorCodeSchema, message: z.string().optional() });
export type ApiError = z.infer<typeof apiErrorSchema>;
