import { z } from "zod";
import { PROJECT_MEMBER_PREVIEW_MAX } from "../constants/project-defaults.js";
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
      /** Boards that are not archived. */
      boardCount: z.number().int().nonnegative(),
      memberCount: z.number().int().nonnegative(),
      /** The first members (Owners first, then by name), at most `PROJECT_MEMBER_PREVIEW_MAX`, for the avatars. */
      members: z
        .array(z.object({ id: z.uuid(), name: z.string(), avatarUrl: z.string().nullable() }))
        .max(PROJECT_MEMBER_PREVIEW_MAX),
      /** Placeholder: always 0 until the Card model exists. */
      openCardCount: z.number().int().nonnegative(),
      /** Placeholder: always 0 until the Card model exists. */
      overdueCardCount: z.number().int().nonnegative(),
    }),
  ),
});
export type ProjectListResponse = z.infer<typeof projectListResponseSchema>;
