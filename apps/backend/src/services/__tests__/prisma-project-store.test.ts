import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "../../generated/prisma/client.js";
import { createPrismaProjectStore } from "../prisma-project-store.js";

/** A stand-in for Prisma whose `$transaction` keeps writes only if the callback finishes. */
function fakeDb(opts: { ownerExists?: boolean; failOn?: "membership" } = {}) {
  const committed: string[] = [];
  let n = 0;
  const id = () => `id-${++n}`;
  const $transaction = vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
    const pending: string[] = [];
    const tx = {
      $queryRaw: async () => (opts.ownerExists === false ? [] : [{ id: "owner-1" }]),
      project: {
        create: async ({ data }: { data: { name: string } }) => {
          pending.push("project");
          return { id: id(), name: data.name, archivedAt: null, createdAt: new Date("2026-11-27T00:00:00Z") };
        },
      },
      board: {
        create: async ({ data }: { data: { name: string } }) => {
          pending.push("board");
          return { id: id(), name: data.name };
        },
      },
      list: {
        create: async ({ data }: { data: { name: string; position: number; isFinished: boolean } }) => {
          pending.push(`list:${data.name}`);
          return { id: id(), name: data.name, position: data.position, isFinished: data.isFinished };
        },
      },
      membership: {
        create: async ({ data }: { data: { role: string } }) => {
          if (opts.failOn === "membership") throw new Error("database down");
          pending.push(`membership:${data.role}`);
          return {};
        },
      },
    };
    const result = await fn(tx);
    committed.push(...pending);
    return result;
  });
  return { db: { $transaction } as unknown as PrismaClient, $transaction, committed };
}

describe("createPrismaProjectStore.createProject", () => {
  it("writes the project, board, three lists and the Owner in one transaction", async () => {
    const { db, $transaction, committed } = fakeDb();
    const result = await createPrismaProjectStore(db).createProject({ name: "Site", ownerId: "owner-1" });

    expect($transaction).toHaveBeenCalledTimes(1);
    expect(committed).toEqual(["project", "board", "list:To do", "list:In progress", "list:Done", "membership:OWNER"]);
    expect(result!.board.name).toBe("Main board");
    expect(result!.board.lists.map((l) => [l.name, l.position, l.isFinished])).toEqual([
      ["To do", 1, false],
      ["In progress", 2, false],
      ["Done", 3, true],
    ]);
    expect(result!.ownerId).toBe("owner-1");
  });

  it("writes nothing and returns null when the owner is not an active person", async () => {
    const { db, committed } = fakeDb({ ownerExists: false });
    const result = await createPrismaProjectStore(db).createProject({ name: "Site", ownerId: "ghost" });
    expect(result).toBeNull();
    expect(committed).toEqual([]);
  });

  it("leaves no project without an Owner when the last step fails", async () => {
    const { db, committed } = fakeDb({ failOn: "membership" });
    await expect(createPrismaProjectStore(db).createProject({ name: "Site", ownerId: "owner-1" })).rejects.toThrow(
      "database down",
    );
    expect(committed).toEqual([]);
  });
});

describe("createPrismaProjectStore lists", () => {
  const base = { id: "p1", name: "Site", archivedAt: null, createdAt: new Date("2026-11-27T00:00:00Z") };
  const lan = { id: "u1", name: "Lan", avatarUrl: null };
  /** The project as Prisma returns it with the summary select: relation counts and the member preview. */
  const row = { ...base, _count: { memberships: 3, boards: 2 }, memberships: [{ user: lan }] };
  /** The same project as the store hands it to the routes. */
  const summary = { ...base, boardCount: 2, memberCount: 3, members: [lan] };

  it("listForUser reads only the memberships of that person and keeps the membership role", async () => {
    const membershipFindMany = vi.fn(async () => [{ role: "MEMBER", project: row }]);
    const db = { membership: { findMany: membershipFindMany } } as unknown as PrismaClient;

    const result = await createPrismaProjectStore(db).listForUser("user-1");

    expect(membershipFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "user-1" } }));
    expect(result).toEqual([{ ...summary, role: "MEMBER" }]);
  });

  it("listAll is the only unfiltered query", async () => {
    const projectFindMany = vi.fn(async () => [row]);
    const db = { project: { findMany: projectFindMany } } as unknown as PrismaClient;

    const result = await createPrismaProjectStore(db).listAll();

    expect(projectFindMany).toHaveBeenCalledWith(expect.not.objectContaining({ where: expect.anything() }));
    expect(result).toEqual([summary]);
  });

  it("counts only boards that are not archived, and previews Owners first then by name, four at most", async () => {
    const projectFindMany = vi.fn(async () => [row]);
    const db = { project: { findMany: projectFindMany } } as unknown as PrismaClient;

    await createPrismaProjectStore(db).listAll();

    const [{ select }] = projectFindMany.mock.calls[0] as unknown as [{ select: Record<string, unknown> }];
    expect(select._count).toEqual({ select: { memberships: true, boards: { where: { archivedAt: null } } } });
    expect(select.memberships).toMatchObject({
      take: 4,
      orderBy: [{ role: "asc" }, { user: { name: "asc" } }],
    });
  });
});

describe("createPrismaProjectStore.setArchived", () => {
  it("archives with one conditional update, only a project that is not archived yet", async () => {
    const updateMany = vi.fn(async () => ({ count: 1 }));
    const db = { project: { updateMany } } as unknown as PrismaClient;

    const result = await createPrismaProjectStore(db).setArchived("p1", true);

    expect(result).toBe("ok");
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "p1", archivedAt: null },
      data: { archivedAt: expect.any(Date) },
    });
  });

  it("restores only a project that is archived, clearing the date", async () => {
    const updateMany = vi.fn(async () => ({ count: 1 }));
    const db = { project: { updateMany } } as unknown as PrismaClient;

    await createPrismaProjectStore(db).setArchived("p1", false);

    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "p1", archivedAt: { not: null } },
      data: { archivedAt: null },
    });
  });

  it("tells a project already in that state from one that does not exist", async () => {
    const updateMany = vi.fn(async () => ({ count: 0 }));
    const findUnique = vi.fn().mockResolvedValueOnce({ id: "p1" }).mockResolvedValueOnce(null);
    const db = { project: { updateMany, findUnique } } as unknown as PrismaClient;
    const store = createPrismaProjectStore(db);

    expect(await store.setArchived("p1", true)).toBe("unchanged");
    expect(await store.setArchived("ghost", true)).toBe("not_found");
  });
});
