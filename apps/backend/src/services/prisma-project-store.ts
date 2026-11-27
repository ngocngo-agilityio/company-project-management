import { DEFAULT_BOARD_NAME, DEFAULT_LISTS } from "@board/shared";
import type { PrismaClient } from "../generated/prisma/client.js";
import type { ProjectStore } from "../types/index.js";

const projectSelect = { id: true, name: true, archivedAt: true, createdAt: true } as const;

export function createPrismaProjectStore(db: PrismaClient): ProjectStore {
  return {
    createProject({ name, ownerId }) {
      // One transaction: a failure at any step leaves no project without its board or its Owner.
      return db.$transaction(
        async (tx) => {
          // FOR SHARE: a concurrent deactivation of the owner waits until this transaction ends.
          const [owner] = await tx.$queryRaw<{ id: string }[]>`
          SELECT id FROM "user" WHERE id = ${ownerId}::uuid AND deactivated_at IS NULL FOR SHARE`;
          if (!owner) return null;
          const project = await tx.project.create({ data: { name }, select: projectSelect });
          const board = await tx.board.create({
            data: { projectId: project.id, name: DEFAULT_BOARD_NAME, position: 1 },
            select: { id: true, name: true },
          });
          const lists = [];
          for (const [index, list] of DEFAULT_LISTS.entries()) {
            const created = await tx.list.create({
              data: { boardId: board.id, name: list.name, position: index + 1, isFinished: list.isFinished },
              select: { id: true, name: true, position: true, isFinished: true },
            });
            lists.push({ ...created, position: Number(created.position) });
          }
          await tx.membership.create({ data: { projectId: project.id, userId: owner.id, role: "OWNER" } });
          return { project, board: { ...board, lists }, ownerId: owner.id };
          // Several sequential queries over a pooler: allow more than Prisma's 5 s default.
        },
        { timeout: 15_000 },
      );
    },
    listAll() {
      return db.project.findMany({ select: projectSelect, orderBy: { name: "asc" } });
    },
    async listForUser(userId) {
      const rows = await db.membership.findMany({
        where: { userId },
        select: { role: true, project: { select: projectSelect } },
      });
      return rows.map(({ role, project }) => ({ ...project, role }));
    },
  };
}
