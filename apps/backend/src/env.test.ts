import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadDotEnv, parseEnv } from "./env.js";

describe("loadDotEnv", () => {
  const dir = mkdtempSync(join(tmpdir(), "env-test-"));
  afterEach(() => {
    delete process.env.ENV_TEST_A;
  });

  it("ignores a missing file", () => {
    expect(() => loadDotEnv(join(dir, "missing.env"))).not.toThrow();
  });

  it("loads variables but does not override existing ones", () => {
    const file = join(dir, "a.env");
    writeFileSync(file, "ENV_TEST_A=from-file\n");
    process.env.ENV_TEST_A = "from-process";
    loadDotEnv(file);
    expect(process.env.ENV_TEST_A).toBe("from-process");
    delete process.env.ENV_TEST_A;
    loadDotEnv(file);
    expect(process.env.ENV_TEST_A).toBe("from-file");
  });

  it("rethrows errors other than ENOENT", () => {
    expect(() => loadDotEnv(dir)).toThrow();
  });
});

const DB = "postgresql://u:p@localhost:5432/db";

describe("parseEnv", () => {
  it("applies defaults", () => {
    expect(parseEnv({ DATABASE_URL: DB })).toEqual({ PORT: 3000, HOST: "127.0.0.1", DATABASE_URL: DB });
  });

  it("treats empty PORT as unset", () => {
    expect(parseEnv({ PORT: "", DATABASE_URL: DB }).PORT).toBe(3000);
  });

  it("rejects an invalid PORT", () => {
    expect(() => parseEnv({ PORT: "abc", DATABASE_URL: DB })).toThrow(/PORT/);
  });

  it("allows DATABASE_URL to be unset or empty", () => {
    expect(parseEnv({}).DATABASE_URL).toBeUndefined();
    expect(parseEnv({ DATABASE_URL: "" }).DATABASE_URL).toBeUndefined();
  });

  it("rejects a non-postgres DATABASE_URL", () => {
    expect(() => parseEnv({ DATABASE_URL: "mysql://x" })).toThrow(/DATABASE_URL/);
  });
});
