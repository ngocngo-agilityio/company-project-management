import { DEFAULT_BOARD_NAME, DEFAULT_LISTS, PROJECT_MEMBER_PREVIEW_MAX } from "@board/shared";
import type { Prisma, PrismaClient } from "../generated/prisma/client.js";
import type { ProjectStore, StoredProjectSummary } from "../types/index.js";

const projectSelect = { id: true, name: true, archivedAt: true, createdAt: true } as const;

/** What the list shows: the project, its counts and the first few members (Owners first, then by name). */
const summarySelect = {
  ...projectSelect,
  _count: { select: { memberships: true, boards: { where: { archivedAt: null } } } },
  memberships: {
    take: PROJECT_MEMBER_PREVIEW_MAX,
    orderBy: [{ role: "asc" }, { user: { name: "asc" } }],
    select: { user: { select: { id: true, name: true, avatarUrl: true } } },
  },
} satisfies Prisma.ProjectSelect;

type SummaryRow = {
  id: string;
  name: string;
  archivedAt: Date | null;
  createdAt: Date;
  _count: { memberships: number; boards: number };
  memberships: { user: { id: string; name: string; avatarUrl: string | null } }[];
};

function toSummary({ _count, memberships, ...project }: SummaryRow): StoredProjectSummary {
  return {
    ...project,
    boardCount: _count.boards,
    memberCount: _count.memberships,
    members: memberships.map(({ user }) => user),
  };
}

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
    async listAll() {
      const rows = await db.project.findMany({ select: summarySelect, orderBy: { name: "asc" } });
      return rows.map(toSummary);
    },
    async setArchived(id, archived) {
      // One conditional UPDATE, so two admins pressing Archive together cannot both "succeed".
      const { count } = await db.project.updateMany({
        where: { id, archivedAt: archived ? null : { not: null } },
        data: { archivedAt: archived ? new Date() : null },
      });
      if (count > 0) return "ok";
      const exists = await db.project.findUnique({ where: { id }, select: { id: true } });
      return exists ? "unchanged" : "not_found";
    },
    async listForUser(userId) {
      const rows = await db.membership.findMany({
        where: { userId },
        select: { role: true, project: { select: summarySelect } },
      });
      return rows.map(({ role, project }) => ({ ...toSummary(project), role }));
    },
  };
}
