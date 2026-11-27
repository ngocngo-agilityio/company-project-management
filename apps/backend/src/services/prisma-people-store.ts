import type { PrismaClient } from "../generated/prisma/client.js";
import type { PeopleStore } from "../types/index.js";

export function createPrismaPeopleStore(db: PrismaClient): PeopleStore {
  return {
    listPeople({ activeOnly }) {
      return db.user.findMany({
        where: activeOnly ? { deactivatedAt: null } : {},
        select: { id: true, email: true, name: true, avatarUrl: true, isSuperAdmin: true, deactivatedAt: true },
        orderBy: { name: "asc" },
      });
    },
  };
}
