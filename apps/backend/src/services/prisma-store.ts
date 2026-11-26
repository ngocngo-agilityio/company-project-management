import type { PrismaClient } from "../generated/prisma/client.js";
import type { AuthStore, StoredUser } from "../types/index.js";

const userSelect = {
  id: true,
  email: true,
  name: true,
  avatarUrl: true,
  googleId: true,
  isSuperAdmin: true,
  deactivatedAt: true,
} as const;

export function createPrismaAuthStore(db: PrismaClient): AuthStore {
  return {
    async findUser({ googleId, email }): Promise<StoredUser | null> {
      const byGoogle = await db.user.findUnique({ where: { googleId }, select: userSelect });
      if (byGoogle) return byGoogle;
      return db.user.findUnique({ where: { email }, select: userSelect });
    },
    updateProfile(userId, profile) {
      return db.user.update({ where: { id: userId }, data: profile, select: userSelect });
    },
    async hasPendingInvitation(email, now) {
      const count = await db.invitation.count({ where: { email, status: "PENDING", expiresAt: { gt: now } } });
      return count > 0;
    },
    async hasActiveMembership(userId) {
      const count = await db.membership.count({ where: { userId, project: { archivedAt: null } } });
      return count > 0;
    },
    admit(input) {
      return db.$transaction(async (tx) => {
        // Claim each invitation with a conditional update: a parallel sign-in can win a row only once.
        const pending = await tx.invitation.findMany({
          where: { email: input.email, status: "PENDING", expiresAt: { gt: input.now } },
          select: { id: true, projectId: true, role: true },
        });
        const won: typeof pending = [];
        for (const invitation of pending) {
          const { count } = await tx.invitation.updateMany({
            where: { id: invitation.id, status: "PENDING", expiresAt: { gt: input.now } },
            data: { status: "ACCEPTED" },
          });
          if (count === 1) won.push(invitation);
        }
        if (!input.isFirstSuperAdmin && won.length === 0) {
          const member = input.userId
            ? await tx.membership.count({ where: { userId: input.userId, project: { archivedAt: null } } })
            : 0;
          if (member === 0) return null;
        }
        const profile = { googleId: input.googleId, name: input.name, avatarUrl: input.avatarUrl };
        const user = input.userId
          ? await tx.user.update({ where: { id: input.userId }, data: profile, select: userSelect })
          : await tx.user.create({
              data: { ...profile, email: input.email, isSuperAdmin: input.isFirstSuperAdmin },
              select: userSelect,
            });
        if (won.length > 0) {
          await tx.membership.createMany({
            data: won.map(({ projectId, role }) => ({ projectId, role, userId: user.id })),
            skipDuplicates: true,
          });
        }
        return user;
      });
    },
    async createSession(userId, expiresAt) {
      const row = await db.session.create({ data: { userId, expiresAt }, select: { id: true } });
      return { id: row.id };
    },
    findSession(id) {
      return db.session.findUnique({
        where: { id },
        select: { id: true, expiresAt: true, lastUsedAt: true, user: { select: userSelect } },
      });
    },
    async touchSession(id, { expiresAt, lastUsedAt }) {
      await db.session.updateMany({ where: { id }, data: { expiresAt, lastUsedAt } });
    },
    async deleteSession(id) {
      await db.session.deleteMany({ where: { id } });
    },
  };
}
