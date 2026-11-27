import {
  API_ERROR,
  API_ROUTES,
  can,
  createProjectRequestSchema,
  projectIdParamSchema,
  HTTP_STATUS,
  type ApiError,
  type CreateProjectResponse,
  type ProjectArchiveResponse,
  type ProjectListResponse,
} from "@board/shared";
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import type { ProjectStore, StoredUser } from "../types/index.js";
import { compareNames, validationMessage } from "../utils/index.js";

export interface ProjectsOptions {
  store: ProjectStore;
  /** The signed-in person (memoised per request by the auth plugin), or null. */
  currentUser: (request: FastifyRequest, reply: FastifyReply) => Promise<StoredUser | null>;
}

/** `POST` and `GET /api/projects`. Registered inside the auth plugin, which enforces `config.access`. */
export const projectsPlugin: FastifyPluginAsync<ProjectsOptions> = async (app, { store, currentUser }) => {
  app.post(
    API_ROUTES.PROJECTS,
    { config: { access: "project:create" } },
    async (request, reply): Promise<CreateProjectResponse | ApiError> => {
      const user = await currentUser(request, reply);
      if (!user) return reply.code(HTTP_STATUS.UNAUTHORIZED).send({ error: API_ERROR.UNAUTHORIZED });
      // The access hook already refused others; check again here so the rule also holds if the hook changes.
      if (!user.isSuperAdmin || !can("SUPER_ADMIN", "project:create")) {
        return reply.code(HTTP_STATUS.FORBIDDEN).send({ error: API_ERROR.FORBIDDEN });
      }
      const parsed = createProjectRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .code(HTTP_STATUS.BAD_REQUEST)
          .send({ error: API_ERROR.VALIDATION_ERROR, message: validationMessage(parsed.error) });
      }
      const created = await store.createProject(parsed.data);
      if (!created) {
        return reply.code(HTTP_STATUS.BAD_REQUEST).send({
          error: API_ERROR.VALIDATION_ERROR,
          message: "ownerId: no active person with this id",
        });
      }
      return reply.code(HTTP_STATUS.CREATED).send({
        id: created.project.id,
        name: created.project.name,
        createdAt: created.project.createdAt.toISOString(),
        board: created.board,
        owner: { userId: created.ownerId, role: "OWNER" },
      });
    },
  );

  app.get(
    API_ROUTES.PROJECTS,
    // Not `project:view`: the access hook knows only the Super Admin flag and would refuse members.
    // This handler does the "all versus own" split itself.
    { config: { access: "authenticated" } },
    async (request, reply): Promise<ProjectListResponse | ApiError> => {
      const user = await currentUser(request, reply);
      if (!user) return reply.code(HTTP_STATUS.UNAUTHORIZED).send({ error: API_ERROR.UNAUTHORIZED });
      // The Super Admin sees every project and counts as Owner in each; everyone else only their own.
      const rows = user.isSuperAdmin
        ? (await store.listAll()).map((project) => ({ ...project, role: "SUPER_ADMIN" as const }))
        : await store.listForUser(user.id);
      const projects = rows
        .map((row) => ({
          id: row.id,
          name: row.name,
          archivedAt: row.archivedAt?.toISOString() ?? null,
          createdAt: row.createdAt.toISOString(),
          role: row.role,
          boardCount: row.boardCount,
          memberCount: row.memberCount,
          members: row.members,
          // Placeholders until the Card model exists (cards story). Then count from the database.
          openCardCount: 0,
          overdueCardCount: 0,
        }))
        .sort((a, b) => compareNames(a.name, b.name));
      return { projects };
    },
  );

  /** Archive and restore are the same call with the flag flipped. */
  for (const { url, archived } of [
    { url: API_ROUTES.PROJECT_ARCHIVE, archived: true },
    { url: API_ROUTES.PROJECT_RESTORE, archived: false },
  ]) {
    app.post(
      url,
      { config: { access: "project:archive" } },
      async (request, reply): Promise<ProjectArchiveResponse | ApiError> => {
        const user = await currentUser(request, reply);
        if (!user) return reply.code(HTTP_STATUS.UNAUTHORIZED).send({ error: API_ERROR.UNAUTHORIZED });
        // The access hook already refused others; check again so the rule also holds if the hook changes.
        if (!user.isSuperAdmin || !can("SUPER_ADMIN", "project:archive")) {
          return reply.code(HTTP_STATUS.FORBIDDEN).send({ error: API_ERROR.FORBIDDEN });
        }
        const params = projectIdParamSchema.safeParse(request.params);
        if (!params.success) {
          return reply
            .code(HTTP_STATUS.BAD_REQUEST)
            .send({ error: API_ERROR.VALIDATION_ERROR, message: validationMessage(params.error) });
        }
        const result = await store.setArchived(params.data.id, archived);
        if (result === "not_found") return reply.code(HTTP_STATUS.NOT_FOUND).send({ error: API_ERROR.NOT_FOUND });
        if (result === "unchanged") {
          return reply.code(HTTP_STATUS.CONFLICT).send({
            error: API_ERROR.CONFLICT,
            message: archived ? "The project is already archived." : "The project is not archived.",
          });
        }
        return { id: params.data.id, archivedAt: archived ? new Date().toISOString() : null };
      },
    );
  }
};
