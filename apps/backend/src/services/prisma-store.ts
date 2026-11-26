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
