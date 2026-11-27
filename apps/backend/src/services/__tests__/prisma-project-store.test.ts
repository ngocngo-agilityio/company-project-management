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
