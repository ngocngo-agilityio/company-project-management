import {
  API_ERROR,
  API_ROUTES,
  can,
  createInvitationRequestSchema,
  HTTP_STATUS,
  invitationIdParamSchema,
  type ApiError,
  type Invitation,
  type InvitationListResponse,
  type InvitationResponse,
} from "@board/shared";
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { INVITATION_TTL_MS } from "../constants/index.js";
import type { InvitationStore, StoredInvitation, StoredUser } from "../types/index.js";
import { validationMessage } from "../utils/index.js";

export interface InvitationsOptions {
  store: InvitationStore;
  /** The signed-in person (memoised per request by the auth plugin), or null. */
  currentUser: (request: FastifyRequest, reply: FastifyReply) => Promise<StoredUser | null>;
  now: () => Date;
}

/** Pending past its date is Expired, even though the row still says Pending. */
function toInvitation(row: StoredInvitation, at: Date): Invitation {
  return {
    id: row.id,
    email: row.email,
    project: row.project,
    role: row.role,
    status: row.status === "PENDING" && row.expiresAt <= at ? "EXPIRED" : row.status,
    invitedBy: row.invitedBy,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
  };
}

/**
 * `GET` and `POST /api/invitations`, `POST /api/invitations/:id/resend`: invitations to the app with no
 * project. Super Admin only. Registered inside the auth plugin, which enforces `config.access`.
 */
export const invitationsPlugin: FastifyPluginAsync<InvitationsOptions> = async (app, { store, currentUser, now }) => {
  /** The signed-in Super Admin, or the answer to send (401, 403). */
  async function requireInviter(request: FastifyRequest, reply: FastifyReply): Promise<StoredUser | null> {
    const user = await currentUser(request, reply);
    if (!user) {
      await reply.code(HTTP_STATUS.UNAUTHORIZED).send({ error: API_ERROR.UNAUTHORIZED });
      return null;
    }
    // The access hook already refused others; check again so the rule also holds if the hook changes.
    if (!user.isSuperAdmin || !can("SUPER_ADMIN", "person:invite")) {
      await reply.code(HTTP_STATUS.FORBIDDEN).send({ error: API_ERROR.FORBIDDEN });
      return null;
    }
    return user;
  }

  app.get(
    API_ROUTES.INVITATIONS,
    { config: { access: "person:invite" } },
    async (request, reply): Promise<InvitationListResponse | ApiError> => {
      const user = await requireInviter(request, reply);
      if (!user) return reply;
      const at = now();
      return { invitations: (await store.list()).map((row) => toInvitation(row, at)) };
    },
  );

  app.post(
    API_ROUTES.INVITATIONS,
    { config: { access: "person:invite" } },
    async (request, reply): Promise<InvitationResponse | ApiError> => {
      const user = await requireInviter(request, reply);
      if (!user) return reply;
      const parsed = createInvitationRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .code(HTTP_STATUS.BAD_REQUEST)
          .send({ error: API_ERROR.VALIDATION_ERROR, message: validationMessage(parsed.error) });
      }
      const at = now();
      const created = await store.createAccountInvitation({
        email: parsed.data.email,
        invitedById: user.id,
        now: at,
        expiresAt: new Date(at.getTime() + INVITATION_TTL_MS),
      });
      if (created.result === "active_user") {
        return reply
          .code(HTTP_STATUS.CONFLICT)
          .send({ error: API_ERROR.CONFLICT, message: "This person already has an account." });
      }
      if (created.result === "pending_exists") {
        return reply.code(HTTP_STATUS.CONFLICT).send({
          error: API_ERROR.CONFLICT,
          message: "This email already has a pending invitation. Use Resend.",
        });
      }
      return reply.code(HTTP_STATUS.CREATED).send(toInvitation(created.invitation, at));
    },
  );

  app.post(
    API_ROUTES.INVITATION_RESEND,
    { config: { access: "person:invite" } },
    async (request, reply): Promise<InvitationResponse | ApiError> => {
      const user = await requireInviter(request, reply);
      if (!user) return reply;
      const params = invitationIdParamSchema.safeParse(request.params);
      if (!params.success) {
        return reply
          .code(HTTP_STATUS.BAD_REQUEST)
          .send({ error: API_ERROR.VALIDATION_ERROR, message: validationMessage(params.error) });
      }
      const at = now();
      const resent = await store.resend({ id: params.data.id, expiresAt: new Date(at.getTime() + INVITATION_TTL_MS) });
      if (resent.result === "not_found") return reply.code(HTTP_STATUS.NOT_FOUND).send({ error: API_ERROR.NOT_FOUND });
      if (resent.result === "not_resendable") {
        return reply.code(HTTP_STATUS.CONFLICT).send({
          error: API_ERROR.CONFLICT,
          message: "Only a pending invitation can be resent.",
        });
      }
      return toInvitation(resent.invitation, at);
    },
  );
};
