import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "../../generated/prisma/client.js";
import { createPrismaPeopleStore } from "../prisma-people-store.js";

describe("createPrismaPeopleStore.listPeople", () => {
  it("never selects the Google id", async () => {
    const findMany = vi.fn<(args: { where: object; select: Record<string, boolean> }) => Promise<unknown[]>>(
      async () => [],
    );
    const db = { user: { findMany } } as unknown as PrismaClient;

    await createPrismaPeopleStore(db).listPeople({ activeOnly: false });

    const { select } = findMany.mock.calls[0]![0];
    expect(select).not.toHaveProperty("googleId");
  });

  it("filters out deactivated people only when activeOnly is set", async () => {
    const findMany = vi.fn<(args: { where: object; select: Record<string, boolean> }) => Promise<unknown[]>>(
      async () => [],
    );
    const db = { user: { findMany } } as unknown as PrismaClient;
    const store = createPrismaPeopleStore(db);

    await store.listPeople({ activeOnly: true });
    await store.listPeople({ activeOnly: false });

    expect(findMany.mock.calls[0]![0]).toMatchObject({ where: { deactivatedAt: null } });
    expect(findMany.mock.calls[1]![0]).toMatchObject({ where: {} });
  });
});
