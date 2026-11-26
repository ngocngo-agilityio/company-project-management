import { z } from "zod";

/** Codes in the `error` field of an API error answer such as 401 or 403. */
export const API_ERROR = {
  UNAUTHORIZED: "unauthorized",
  FORBIDDEN_ORIGIN: "forbidden_origin",
  INTERNAL_ERROR: "internal_error",
} as const;

export const apiErrorCodeSchema = z.enum(API_ERROR);
export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;

/** Body of an error answer such as 401. */
export const apiErrorSchema = z.object({ error: apiErrorCodeSchema });
export type ApiError = z.infer<typeof apiErrorSchema>;
