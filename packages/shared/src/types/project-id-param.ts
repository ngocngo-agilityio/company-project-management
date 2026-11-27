import { z } from "zod";

/** Path parameters of `POST /api/projects/:id/archive` and `/restore`. */
export const projectIdParamSchema = z.object({ id: z.uuid() });
export type ProjectIdParam = z.infer<typeof projectIdParamSchema>;
