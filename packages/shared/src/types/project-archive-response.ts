import { z } from "zod";

/** Response of `POST /api/projects/:id/archive` and `/restore`: `archivedAt` is set after archive, null after restore. */
export const projectArchiveResponseSchema = z.object({
  id: z.uuid(),
  archivedAt: z.iso.datetime().nullable(),
});
export type ProjectArchiveResponse = z.infer<typeof projectArchiveResponseSchema>;
