import {
  API_ERROR,
  API_ROUTES,
  can,
  HTTP_STATUS,
  peopleListQuerySchema,
  type ApiError,
  type PeopleListResponse,
} from "@board/shared";
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import type { PeopleStore, StoredUser } from "../types/index.js";
import { compareNames, validationMessage } from "../utils/index.js";

export interface PeopleOptions {
  store: PeopleStore;
  /** The signed-in person (memoised per request by the auth plugin), or null. */
  currentUser: (request: FastifyRequest, reply: FastifyReply) => Promise<StoredUser | null>;
}

/** `GET /api/people`. Registered inside the auth plugin, which enforces `config.access`. */
export const peoplePlugin: FastifyPluginAsync<PeopleOptions> = async (app, { store, currentUser }) => {
  app.get(
    API_ROUTES.PEOPLE,
    { config: { access: "people:view" } },
    async (request, reply): Promise<PeopleListResponse | ApiError> => {
      const user = await currentUser(request, reply);
      if (!user) return reply.code(HTTP_STATUS.UNAUTHORIZED).send({ error: API_ERROR.UNAUTHORIZED });
      if (!user.isSuperAdmin || !can("SUPER_ADMIN", "people:view")) {
        return reply.code(HTTP_STATUS.FORBIDDEN).send({ error: API_ERROR.FORBIDDEN });
      }
      const parsed = peopleListQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply
          .code(HTTP_STATUS.BAD_REQUEST)
          .send({ error: API_ERROR.VALIDATION_ERROR, message: validationMessage(parsed.error) });
      }
      const people = await store.listPeople({ activeOnly: parsed.data.status === "active" });
      return {
        people: people
          .map((person) => ({
            id: person.id,
            email: person.email,
            name: person.name,
            avatarUrl: person.avatarUrl,
            isSuperAdmin: person.isSuperAdmin,
            deactivatedAt: person.deactivatedAt?.toISOString() ?? null,
          }))
          .sort((a, b) => compareNames(a.name, b.name)),
      };
    },
  );
};
