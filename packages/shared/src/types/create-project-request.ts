import { z } from "zod";
import { PROJECT_NAME_MAX } from "../constants/project-defaults.js";

/** Body of `POST /api/projects`: the name and the person who will be its Owner. */
export const createProjectRequestSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    // Counted in characters (code points), so an emoji is 1, not 2.
    .refine((value) => [...value].length <= PROJECT_NAME_MAX, {
      message: `Too big: expected at most ${PROJECT_NAME_MAX} characters`,
    }),
  ownerId: z.uuid(),
});
export type CreateProjectRequest = z.infer<typeof createProjectRequestSchema>;
