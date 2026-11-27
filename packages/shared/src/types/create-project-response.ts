import { z } from "zod";

/** Response of `POST /api/projects`: the project with its first board, lists and Owner. */
export const createProjectResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  createdAt: z.iso.datetime(),
  board: z.object({
    id: z.uuid(),
    name: z.string(),
    lists: z.array(z.object({ id: z.uuid(), name: z.string(), position: z.number(), isFinished: z.boolean() })),
  }),
  owner: z.object({ userId: z.uuid(), role: z.literal("OWNER") }),
});
export type CreateProjectResponse = z.infer<typeof createProjectResponseSchema>;
