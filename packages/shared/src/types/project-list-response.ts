import { z } from "zod";
import { ROLES } from "../constants/roles.js";

/** Response of `GET /api/projects`. `role` is the caller's role there (`SUPER_ADMIN` for the Super Admin). */
export const projectListResponseSchema = z.object({
  projects: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      archivedAt: z.iso.datetime().nullable(),
      createdAt: z.iso.datetime(),
      role: z.enum(ROLES),
    }),
  ),
});
export type ProjectListResponse = z.infer<typeof projectListResponseSchema>;
