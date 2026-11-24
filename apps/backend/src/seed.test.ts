import { describe, expect, it } from "vitest";
import { seedSuperAdmin, type SeedUserClient } from "./seed.js";

/** In-memory stand-in that behaves like `upsert` on a unique email. */
function fakeDb() {
  const rows = new Map<string, { id: string; email: string; name: string; isSuperAdmin: boolean }>();
  const db: SeedUserClient = {
    user: {
      async upsert({ where, create }) {
        const existing = rows.get(where.email);
        if (existing) return existing;
        const row = { id: `id-${rows.size + 1}`, ...create };
        rows.set(row.email, row);
        return row;
      },
    },
  };
  return { db, rows };
}

describe("seedSuperAdmin", () => {
  it("creates a Super Admin with a lowercase email", async () => {
    const { db, rows } = fakeDb();
    await seedSuperAdmin(db, { email: "  Admin@Example.com ", name: "Ada" });
    expect([...rows.values()]).toEqual([{ id: "id-1", email: "admin@example.com", name: "Ada", isSuperAdmin: true }]);
  });

  it("defaults the name to the part before @", async () => {
    const { db, rows } = fakeDb();
    await seedSuperAdmin(db, { email: "boss@example.com" });
    expect(rows.get("boss@example.com")?.name).toBe("boss");
  });

  it("is safe to repeat", async () => {
    const { db, rows } = fakeDb();
    await seedSuperAdmin(db, { email: "a@b.co" });
    await seedSuperAdmin(db, { email: "A@B.co", name: "Other" });
    expect(rows.size).toBe(1);
  });
});
