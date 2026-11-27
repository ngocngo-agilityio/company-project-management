import { z } from "zod";

/** Query of `GET /api/people`: `active` leaves out deactivated people. Default `all`. */
export const peopleListQuerySchema = z.object({
  status: z.enum(["active", "all"]).default("all"),
});
export type PeopleListQuery = z.infer<typeof peopleListQuerySchema>;
