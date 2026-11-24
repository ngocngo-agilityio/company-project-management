import { describe, expect, it } from "vitest";
import { assertLocalDatabase } from "./db-guard.js";

describe("assertLocalDatabase", () => {
  it.each([
    "postgresql://u:p@localhost:5432/db",
    "postgresql://u:p@127.0.0.1:5433/db",
    "postgresql://u:p@[::1]:5432/db",
  ])("allows %s", (url) => {
    expect(() => assertLocalDatabase(url, false)).not.toThrow();
  });

  it("refuses a remote host", () => {
    expect(() => assertLocalDatabase("postgresql://u:p@db.abc.supabase.co:5432/postgres", false)).toThrow(/non-local/);
  });

  it("allows a remote host with the override", () => {
    expect(() => assertLocalDatabase("postgresql://u:p@db.abc.supabase.co:5432/postgres", true)).not.toThrow();
  });

  it("fails when DATABASE_URL is missing", () => {
    expect(() => assertLocalDatabase(undefined, false)).toThrow(/DATABASE_URL/);
  });
});
