import type { Prisma, PrismaClient } from "../generated/prisma/client.js";
import type { InvitationStore, StoredInvitation } from "../types/index.js";

const invitationSelect = {
  id: true,
  email: true,
  role: true,
  status: true,
  createdAt: true,
  expiresAt: true,
  project: { select: { id: true, name: true } },
  invitedBy: { select: { id: true, name: true } },
} satisfies Prisma.InvitationSelect;

/** Prisma error code for a violated unique index (here: a second Pending account invitation for one email). */
const UNIQUE_VIOLATION = "P2002";

const isUniqueViolation = (error: unknown) =>
  typeof error === "object" && error !== null && (error as { code?: unknown }).code === UNIQUE_VIOLATION;

export function createPrismaInvitationStore(db: PrismaClient): InvitationStore {
  return {
    list(): Promise<StoredInvitation[]> {
      return db.invitation.findMany({ select: invitationSelect, orderBy: { createdAt: "desc" } });
    },

    async createAccountInvitation({ email, invitedById, now, expiresAt }) {
      try {
        return await db.$transaction(async (tx) => {
          const person = await tx.user.findUnique({ where: { email }, select: { id: true, deactivatedAt: true } });
          if (person && !person.deactivatedAt) return { result: "active_user" } as const;

          if (person) {
            // A deactivated person: reactivate at once, the invitation is Accepted from the start.
            await tx.user.update({ where: { id: person.id }, data: { deactivatedAt: null } });
            await tx.invitation.updateMany({
              where: { email, projectId: null, status: "PENDING" },
              data: { status: "ACCEPTED" },
            });
            const invitation = await tx.invitation.create({
              data: { email, invitedById, status: "ACCEPTED", expiresAt },
              select: invitationSelect,
            });
            return { result: "reactivated", invitation } as const;
          }

          // Pending past its date still holds the unique index: Resend renews it, so refuse here too.
          const pending = await tx.invitation.count({ where: { email, projectId: null, status: "PENDING" } });
          if (pending > 0) return { result: "pending_exists" } as const;
          const invitation = await tx.invitation.create({
            data: { email, invitedById, expiresAt, createdAt: now },
            select: invitationSelect,
          });
          return { result: "created", invitation } as const;
        });
      } catch (error) {
        // Two parallel invitations for one email: the unique index lets only one win.
        if (isUniqueViolation(error)) return { result: "pending_exists" };
        throw error;
      }
    },

    async resend({ id, expiresAt }) {
      // One conditional update: a parallel accept or revoke cannot be overwritten.
      const { count } = await db.invitation.updateMany({
        where: { id, status: { in: ["PENDING", "EXPIRED"] } },
        data: { status: "PENDING", expiresAt },
      });
      if (count === 1) {
        const invitation = await db.invitation.findUniqueOrThrow({ where: { id }, select: invitationSelect });
        return { result: "ok", invitation };
      }
      const exists = await db.invitation.count({ where: { id } });
      return { result: exists > 0 ? "not_resendable" : "not_found" };
    },
  };
}
