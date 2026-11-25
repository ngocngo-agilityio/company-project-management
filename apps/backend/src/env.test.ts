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
    expect(parseEnv({ DATABASE_URL: DB })).toEqual({
      PORT: 3000,
      HOST: "127.0.0.1",
      DATABASE_URL: DB,
      ALLOW_REMOTE_DB: "0",
      COMPANY_TIMEZONE: "Asia/Ho_Chi_Minh",
      COOKIE_CROSS_SITE: "0",
    });
  });

  it("reads the Google sign-in variables and treats empty ones as unset", () => {
    expect(parseEnv({ GOOGLE_CLIENT_ID: "", GOOGLE_CLIENT_SECRET: "", GOOGLE_REDIRECT_URI: "" })).toMatchObject({
      GOOGLE_CLIENT_ID: undefined,
      GOOGLE_CLIENT_SECRET: undefined,
      GOOGLE_REDIRECT_URI: undefined,
    });
    const set = parseEnv({
      GOOGLE_CLIENT_ID: "id",
      GOOGLE_CLIENT_SECRET: "secret",
      GOOGLE_REDIRECT_URI: "http://localhost:3000/auth/google/callback",
    });
    expect(set.GOOGLE_REDIRECT_URI).toBe("http://localhost:3000/auth/google/callback");
    expect(() => parseEnv({ GOOGLE_REDIRECT_URI: "not a url" })).toThrow(/GOOGLE_REDIRECT_URI/);
  });

  it("COOKIE_CROSS_SITE is 0 or 1 and defaults to 0", () => {
    expect(parseEnv({ COOKIE_CROSS_SITE: "1" }).COOKIE_CROSS_SITE).toBe("1");
    expect(parseEnv({ COOKIE_CROSS_SITE: "" }).COOKIE_CROSS_SITE).toBe("0");
    expect(() => parseEnv({ COOKIE_CROSS_SITE: "yes" })).toThrow(/COOKIE_CROSS_SITE/);
  });

  it("allows WEB_ORIGIN to be unset or empty and rejects a non-URL", () => {
    expect(parseEnv({}).WEB_ORIGIN).toBeUndefined();
    expect(parseEnv({ WEB_ORIGIN: "" }).WEB_ORIGIN).toBeUndefined();
    expect(parseEnv({ WEB_ORIGIN: "https://web.example.com" }).WEB_ORIGIN).toBe("https://web.example.com");
    expect(() => parseEnv({ WEB_ORIGIN: "not a url" })).toThrow(/WEB_ORIGIN/);
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

describe("seed and db guard variables", () => {
  it("lowercases SUPER_ADMIN_EMAIL and treats empty values as unset", () => {
    const env = parseEnv({ SUPER_ADMIN_EMAIL: "Admin@Example.COM", SUPER_ADMIN_NAME: "", ALLOW_REMOTE_DB: "" });
    expect(env.SUPER_ADMIN_EMAIL).toBe("admin@example.com");
    expect(env.SUPER_ADMIN_NAME).toBeUndefined();
    expect(env.ALLOW_REMOTE_DB).toBe("0");
  });

  it("trims SUPER_ADMIN_EMAIL before validating it", () => {
    expect(parseEnv({ SUPER_ADMIN_EMAIL: "  Admin@Example.com " }).SUPER_ADMIN_EMAIL).toBe("admin@example.com");
  });

  it("rejects an invalid SUPER_ADMIN_EMAIL", () => {
    expect(() => parseEnv({ SUPER_ADMIN_EMAIL: "not-an-email" })).toThrow(/SUPER_ADMIN_EMAIL/);
  });
});

describe("COMPANY_TIMEZONE", () => {
  it("defaults to Asia/Ho_Chi_Minh when unset or empty", () => {
    expect(parseEnv({}).COMPANY_TIMEZONE).toBe("Asia/Ho_Chi_Minh");
    expect(parseEnv({ COMPANY_TIMEZONE: "" }).COMPANY_TIMEZONE).toBe("Asia/Ho_Chi_Minh");
  });

  it("accepts an IANA name and trims it", () => {
    expect(parseEnv({ COMPANY_TIMEZONE: " Europe/Paris " }).COMPANY_TIMEZONE).toBe("Europe/Paris");
    expect(parseEnv({ COMPANY_TIMEZONE: "UTC" }).COMPANY_TIMEZONE).toBe("UTC");
  });

  it("rejects an unknown time zone", () => {
    expect(() => parseEnv({ COMPANY_TIMEZONE: "Mars/Olympus" })).toThrow(/COMPANY_TIMEZONE/);
  });
});
