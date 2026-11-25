import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Indexes Prisma cannot express in schema.prisma. `prisma migrate dev` sees them as drift and
// adds a DROP INDEX to the next migration: delete that line by hand before committing.
const HAND_WRITTEN_INDEXES = ["invitation_project_id_email_pending_key"];

const dir = new URL("../prisma/migrations/", import.meta.url);
const migrations = readdirSync(dir, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort()
  .map((name) => ({ name, sql: readFileSync(new URL(`${name}/migration.sql`, dir), "utf8") }));

describe("hand-written indexes", () => {
  it.each(HAND_WRITTEN_INDEXES)("%s is created and never dropped", (index) => {
    expect(migrations.some((m) => m.sql.includes(`CREATE UNIQUE INDEX "${index}"`))).toBe(true);
    const dropped = migrations.filter((m) => new RegExp(`DROP INDEX[^;]*"${index}"`).test(m.sql));
    expect(dropped.map((m) => m.name)).toEqual([]);
  });
});

// CHECK constraints Prisma cannot express in schema.prisma (it ignores them, so no drift).
const HAND_WRITTEN_CHECKS = ["company_setting_single_row"];

describe("hand-written check constraints", () => {
  it.each(HAND_WRITTEN_CHECKS)("%s is added and never dropped", (constraint) => {
    expect(migrations.some((m) => m.sql.includes(`ADD CONSTRAINT "${constraint}" CHECK`))).toBe(true);
    const dropped = migrations.filter((m) => new RegExp(`DROP CONSTRAINT[^;]*"${constraint}"`).test(m.sql));
    expect(dropped.map((m) => m.name)).toEqual([]);
  });
});
