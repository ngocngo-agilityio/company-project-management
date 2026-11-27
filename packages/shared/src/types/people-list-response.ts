import { z } from "zod";

/** Response of `GET /api/people`. Never carries the Google account id. */
export const peopleListResponseSchema = z.object({
  people: z.array(
    z.object({
      id: z.uuid(),
      email: z.string(),
      name: z.string(),
      avatarUrl: z.string().nullable(),
      isSuperAdmin: z.boolean(),
      deactivatedAt: z.iso.datetime().nullable(),
    }),
  ),
});
export type PeopleListResponse = z.infer<typeof peopleListResponseSchema>;
