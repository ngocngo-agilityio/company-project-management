import { describe, expect, it } from "vitest";
import {
  databaseHost,
  FAKE_SAMPLE_USERS,
  parseSampleArgs,
  parseSampleUser,
  seedSampleUsers,
  type SeedSampleClient,
} from "../seed-sample.js";

describe("parseSampleUser", () => {
  it('reads "Name <email>" and lowercases the email', () => {
    expect(parseSampleUser("Linh Pham <Linh@Gmail.com>")).toEqual({
      email: "linh@gmail.com",
      name: "Linh Pham",
      deactivated: false,
    });
  });

  it("defaults the name to the part before @ for a bare email", () => {
    expect(parseSampleUser("minh@gmail.com")).toMatchObject({ email: "minh@gmail.com", name: "minh" });
  });

  it("refuses something that is not an email", () => {
    expect(() => parseSampleUser("Linh <nope>")).toThrow(/Not an email address/);
  });
});

describe("parseSampleArgs", () => {
  it("collects people and the --yes flag, ignoring a lone --", () => {
    const args = parseSampleArgs(["--", "A <a@x.com>", "b@x.com", "--yes"]);
    expect(args.yes).toBe(true);
    expect(args.users.map((u) => u.email)).toEqual(["a@x.com", "b@x.com"]);
  });

  it("does not confirm by itself", () => {
    expect(parseSampleArgs(["a@x.com"]).yes).toBe(false);
  });

  it("--fake adds the fake people, one of them deactivated", () => {
    const { users } = parseSampleArgs(["--fake"]);
    expect(users).toHaveLength(FAKE_SAMPLE_USERS.length);
    expect(users.every((u) => u.email.endsWith("@example.com"))).toBe(true);
    expect(users.some((u) => u.deactivated)).toBe(true);
  });

  it("refuses an unknown option and an empty list", () => {
    expect(() => parseSampleArgs(["--drop", "a@x.com"])).toThrow(/Unknown option/);
    expect(() => parseSampleArgs([])).toThrow(/at least one person/);
  });
});

describe("databaseHost", () => {
  it("returns only the host, never the user name or password", () => {
    const host = databaseHost("postgresql://user:s3cret@db.example.supabase.co:5432/postgres?sslmode=require");
    expect(host).toBe("db.example.supabase.co");
    expect(host).not.toContain("s3cret");
  });

  it("does not echo an unreadable URL", () => {
    expect(databaseHost("not a url with s3cret")).toBe("(unreadable URL)");
  });
});

describe("seedSampleUsers", () => {
  function fakeDb() {
    const rows = new Map<string, { id: string; email: string; name: string; deactivatedAt: Date | null }>();
    const db: SeedSampleClient = {
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
  const now = new Date("2026-11-27T00:00:00Z");

  it("creates people with no Google id and no Super Admin flag, deactivating only the flagged one", async () => {
    const { db, rows } = fakeDb();
    await seedSampleUsers(db, [...FAKE_SAMPLE_USERS], now);
    expect(rows.size).toBe(3);
    for (const row of rows.values()) {
      expect(row).not.toHaveProperty("googleId");
      expect(row).not.toHaveProperty("isSuperAdmin");
    }
    expect(rows.get("chi.le@example.com")!.deactivatedAt).toEqual(now);
    expect(rows.get("an.nguyen@example.com")!.deactivatedAt).toBeNull();
  });

  it("is safe to repeat", async () => {
    const { db, rows } = fakeDb();
    const users = [parseSampleUser("A <a@x.com>")];
    await seedSampleUsers(db, users, now);
    await seedSampleUsers(db, users, now);
    expect(rows.size).toBe(1);
  });
});
