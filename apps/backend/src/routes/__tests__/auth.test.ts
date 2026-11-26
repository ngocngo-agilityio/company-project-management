import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { meResponseSchema, SESSION_COOKIE_NAME } from "@board/shared";
import { buildApp } from "../../app.js";
import type { GoogleAuth, GoogleProfile } from "../../services/google.js";
import { SESSION_TTL_MS } from "../../constants/index.js";
import type { AuthStore, StoredSession, StoredUser } from "../../types/index.js";

const WEB = "https://web.example.com";
const START = new Date("2026-11-25T08:00:00.000Z");

function makeUser(over: Partial<StoredUser> = {}): StoredUser {
  return {
    id: randomUUID(),
    email: "admin@example.com",
    name: "Admin",
    avatarUrl: null,
    googleId: null,
    isSuperAdmin: true,
    deactivatedAt: null,
    ...over,
  };
}

/** In-memory AuthStore: no database. */
function makeStore(users: StoredUser[]) {
  const sessions = new Map<string, Omit<StoredSession, "user"> & { userId: string }>();
  const store: AuthStore = {
    async findUser({ googleId, email }) {
      return users.find((u) => u.googleId === googleId) ?? users.find((u) => u.email === email) ?? null;
    },
    async updateProfile(userId, profile) {
      const user = users.find((u) => u.id === userId)!;
      Object.assign(user, profile);
      return user;
    },
    async hasPendingInvitation() {
      return false;
    },
    async hasActiveMembership() {
      return false;
    },
    async admit(input) {
      const existing = users.find((u) => u.id === input.userId);
      if (existing) {
        Object.assign(existing, { googleId: input.googleId, name: input.name, avatarUrl: input.avatarUrl });
        return existing;
      }
      const created = makeUser({
        email: input.email,
        name: input.name,
        avatarUrl: input.avatarUrl,
        googleId: input.googleId,
        isSuperAdmin: input.isFirstSuperAdmin,
      });
      users.push(created);
      return created;
    },
    async createSession(userId, expiresAt) {
      const id = randomUUID();
      sessions.set(id, { id, userId, expiresAt, lastUsedAt: null });
      return { id };
    },
    async findSession(id) {
      const row = sessions.get(id);
      if (!row) return null;
      return {
        id: row.id,
        expiresAt: row.expiresAt,
        lastUsedAt: row.lastUsedAt,
        user: users.find((u) => u.id === row.userId)!,
      };
    },
    async touchSession(id, input) {
      Object.assign(sessions.get(id)!, input);
    },
    async deleteSession(id) {
      sessions.delete(id);
    },
  };
  return { store, sessions };
}

/** Fake Google: returns the given profile, or throws (bad state, refused consent). */
function fakeGoogle(result: GoogleProfile | Error): GoogleAuth {
  return {
    async register() {},
    async fetchProfile() {
      if (result instanceof Error) throw result;
      return result;
    },
  };
}

const profile = (over: Partial<GoogleProfile> = {}): GoogleProfile => ({
  id: "google-1",
  email: "Admin@Example.com",
  emailVerified: true,
  name: "Admin From Google",
  avatarUrl: "https://example.com/a.png",
  ...over,
});

const apps: Array<{ close(): Promise<unknown> }> = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((a) => a.close()));
});

function setup(
  opts: {
    users?: StoredUser[];
    google?: GoogleProfile | Error;
    crossSite?: boolean;
    now?: () => Date;
    trustProxy?: boolean;
    superAdminEmail?: string | undefined;
  } = {},
) {
  const users = opts.users ?? [makeUser()];
  const { store, sessions } = makeStore(users);
  const app = buildApp({
    webOrigin: WEB,
    trustProxy: opts.trustProxy ?? false,
    auth: {
      store,
      google: fakeGoogle(opts.google ?? profile()),
      crossSite: opts.crossSite ?? true,
      superAdminEmail: "superAdminEmail" in opts ? opts.superAdminEmail : "admin@example.com",
      now: opts.now ?? (() => START),
    },
  });
  apps.push(app);
  return { app, users, sessions };
}

const cookieOf = (res: { cookies: Array<{ name: string; value: string }> }) =>
  res.cookies.find((c) => c.name === SESSION_COOKIE_NAME);

describe("GET /auth/google/callback", () => {
  it("signs in a known person: session row, cookie, redirect to the web app", async () => {
    const { app, users, sessions } = setup();
    const res = await app.inject({ method: "GET", url: "/auth/google/callback?code=x&state=y" });

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe(`${WEB}/`);
    const cookie = cookieOf(res)!;
    expect(sessions.has(cookie.value)).toBe(true);
    expect(sessions.get(cookie.value)!.userId).toBe(users[0]!.id);
    expect(sessions.get(cookie.value)!.expiresAt.getTime()).toBe(START.getTime() + SESSION_TTL_MS);
    // Name, avatar and Google id are saved from Google.
    expect(users[0]).toMatchObject({
      googleId: "google-1",
      name: "Admin From Google",
      avatarUrl: "https://example.com/a.png",
    });
  });

  it("sets HttpOnly, Secure, SameSite=None in cross-site mode", async () => {
    const { app } = setup({ crossSite: true });
    const res = await app.inject({ method: "GET", url: "/auth/google/callback?code=x" });
    const header = String(res.headers["set-cookie"]);
    expect(header).toMatch(/HttpOnly/i);
    expect(header).toMatch(/Secure/i);
    expect(header).toMatch(/SameSite=None/i);
  });

  it("uses SameSite=Lax and no Secure flag for local development", async () => {
    const { app } = setup({ crossSite: false });
    const res = await app.inject({ method: "GET", url: "/auth/google/callback?code=x" });
    const header = String(res.headers["set-cookie"]);
    expect(header).toMatch(/HttpOnly/i);
    expect(header).not.toMatch(/Secure/i);
    expect(header).toMatch(/SameSite=Lax/i);
  });

  it("tells a cancelled consent apart from a failed one, without calling Google", async () => {
    const { app, sessions } = setup({ google: new Error("must not be called") });
    const res = await app.inject({ method: "GET", url: "/auth/google/callback?error=access_denied&state=y" });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe(`${WEB}/login?error=access_denied`);
    expect(cookieOf(res)).toBeUndefined();
    expect(sessions.size).toBe(0);
  });

  it("treats any other ?error= from Google as a failure", async () => {
    const { app } = setup({ google: new Error("no code") });
    const res = await app.inject({ method: "GET", url: "/auth/google/callback?error=server_error" });
    expect(res.headers.location).toBe(`${WEB}/login?error=oauth_failed`);
  });

  type Setup = Parameters<typeof setup>[0];
  const refusals: Array<[string, Setup, string]> = [
    [
      "an unknown email",
      { users: [makeUser({ email: "other@example.com" })], superAdminEmail: undefined },
      "not_invited",
    ],
    ["an unverified email", { google: profile({ emailVerified: false }) }, "unverified_email"],
    ["a deactivated person", { users: [makeUser({ deactivatedAt: new Date() })] }, "deactivated"],
    ["a failed Google exchange (bad state, bad code)", { google: new Error("bad state") }, "oauth_failed"],
    ["an email linked to another Google account", { users: [makeUser({ googleId: "someone-else" })] }, "not_invited"],
  ];
  it.each(refusals)("refuses %s: no session, redirect with %s", async (_label, over, code) => {
    const { app, sessions } = setup(over);
    const res = await app.inject({ method: "GET", url: "/auth/google/callback?code=x" });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe(`${WEB}/login?error=${code}`);
    expect(cookieOf(res)).toBeUndefined();
    expect(sessions.size).toBe(0);
  });

  it("never puts the email in the redirect", async () => {
    const { app } = setup({ users: [], superAdminEmail: undefined });
    const res = await app.inject({ method: "GET", url: "/auth/google/callback?code=x" });
    expect(String(res.headers.location)).not.toMatch(/example\.com\/?$|@|admin/i);
  });
});

describe("GET /api/me", () => {
  async function signIn(app: ReturnType<typeof setup>["app"]) {
    const res = await app.inject({ method: "GET", url: "/auth/google/callback?code=x" });
    return cookieOf(res)!.value;
  }

  it("answers 401 without a cookie", async () => {
    const { app } = setup();
    const res = await app.inject({ method: "GET", url: "/api/me" });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ error: "unauthorized" });
  });

  it("answers 401 for a cookie that is not a session id", async () => {
    const { app } = setup();
    const res = await app.inject({ method: "GET", url: "/api/me", cookies: { [SESSION_COOKIE_NAME]: "nope" } });
    expect(res.statusCode).toBe(401);
  });

  it("answers 401 for an unknown session id", async () => {
    const { app } = setup();
    const res = await app.inject({ method: "GET", url: "/api/me", cookies: { [SESSION_COOKIE_NAME]: randomUUID() } });
    expect(res.statusCode).toBe(401);
  });

  it("returns the signed-in person", async () => {
    const { app, users } = setup();
    const sid = await signIn(app);
    const res = await app.inject({ method: "GET", url: "/api/me", cookies: { [SESSION_COOKIE_NAME]: sid } });
    expect(res.statusCode).toBe(200);
    expect(meResponseSchema.parse(res.json())).toEqual({
      id: users[0]!.id,
      email: "admin@example.com",
      name: "Admin From Google",
      avatarUrl: "https://example.com/a.png",
      isSuperAdmin: true,
    });
  });

  it("answers 401 and deletes the row once the session has expired", async () => {
    let clock = START;
    const { app, sessions } = setup({ now: () => clock });
    const sid = await signIn(app);
    clock = new Date(START.getTime() + SESSION_TTL_MS + 1000);
    const res = await app.inject({ method: "GET", url: "/api/me", cookies: { [SESSION_COOKIE_NAME]: sid } });
    expect(res.statusCode).toBe(401);
    expect(sessions.has(sid)).toBe(false);
  });

  it("extends the session when it is used", async () => {
    let clock = START;
    const { app, sessions } = setup({ now: () => clock });
    const sid = await signIn(app);
    clock = new Date(START.getTime() + 24 * 60 * 60 * 1000);
    const res = await app.inject({ method: "GET", url: "/api/me", cookies: { [SESSION_COOKIE_NAME]: sid } });
    expect(res.statusCode).toBe(200);
    expect(sessions.get(sid)!.expiresAt.getTime()).toBe(clock.getTime() + SESSION_TTL_MS);
  });

  it("answers 401 when the person was deactivated after signing in", async () => {
    const { app, users, sessions } = setup();
    const sid = await signIn(app);
    users[0]!.deactivatedAt = new Date();
    const res = await app.inject({ method: "GET", url: "/api/me", cookies: { [SESSION_COOKIE_NAME]: sid } });
    expect(res.statusCode).toBe(401);
    expect(sessions.has(sid)).toBe(false);
  });
});

describe("POST /auth/logout", () => {
  it("deletes the session row and clears the cookie", async () => {
    const { app, sessions } = setup();
    const signed = await app.inject({ method: "GET", url: "/auth/google/callback?code=x" });
    const sid = cookieOf(signed)!.value;

    const res = await app.inject({
      method: "POST",
      url: "/auth/logout",
      headers: { origin: WEB },
      cookies: { [SESSION_COOKIE_NAME]: sid },
    });
    expect(res.statusCode).toBe(204);
    expect(sessions.has(sid)).toBe(false);
    expect(cookieOf(res)?.value).toBe("");
  });

  it("is fine without a session", async () => {
    const { app } = setup();
    const res = await app.inject({ method: "POST", url: "/auth/logout", headers: { origin: WEB } });
    expect(res.statusCode).toBe(204);
  });
});

describe("Origin check", () => {
  it("refuses a POST from another origin with 403 and keeps the session", async () => {
    const { app, sessions } = setup();
    const signed = await app.inject({ method: "GET", url: "/auth/google/callback?code=x" });
    const sid = cookieOf(signed)!.value;

    const res = await app.inject({
      method: "POST",
      url: "/auth/logout",
      headers: { origin: "https://evil.example.com" },
      cookies: { [SESSION_COOKIE_NAME]: sid },
    });
    expect(res.statusCode).toBe(403);
    expect(sessions.has(sid)).toBe(true);
  });

  it("does not check safe methods", async () => {
    const { app } = setup();
    const res = await app.inject({ method: "GET", url: "/api/me", headers: { origin: "https://evil.example.com" } });
    expect(res.statusCode).toBe(401);
  });
});

describe("rate limit", () => {
  it("limits /auth/logout to 30 requests a minute per address and keeps the JSON answer", async () => {
    const { app } = setup();
    const codes: number[] = [];
    for (let i = 0; i < 31; i++) {
      const res = await app.inject({ method: "POST", url: "/auth/logout", headers: { origin: WEB } });
      codes.push(res.statusCode);
    }
    expect(codes.slice(0, 30).every((c) => c === 204)).toBe(true);
    expect(codes[30]).toBe(429);
  });

  it("sends /auth/google back to the sign-in screen with rate_limited, not raw JSON", async () => {
    const { app } = setup();
    const codes: number[] = [];
    let last;
    for (let i = 0; i < 11; i++) {
      last = await app.inject({ method: "GET", url: "/auth/google/callback?error=access_denied" });
      codes.push(last.statusCode);
    }
    expect(codes.slice(0, 10).every((c) => c === 302)).toBe(true);
    expect(last!.statusCode).toBe(302);
    expect(last!.headers.location).toBe(`${WEB}/login?error=rate_limited`);
  });

  it("counts logout apart from sign-in", async () => {
    const { app } = setup();
    for (let i = 0; i < 10; i++) {
      await app.inject({ method: "GET", url: "/auth/google/callback?error=access_denied" });
    }
    const res = await app.inject({ method: "POST", url: "/auth/logout", headers: { origin: WEB } });
    expect(res.statusCode).toBe(204);
  });

  it("counts each client address apart when behind a proxy", async () => {
    const { app } = setup({ trustProxy: true });
    const get = (ip: string) =>
      app.inject({
        method: "GET",
        url: "/auth/google/callback?error=access_denied",
        headers: { "x-forwarded-for": ip },
      });
    for (let i = 0; i < 10; i++) await get("203.0.113.1");
    expect((await get("203.0.113.1")).headers.location).toBe(`${WEB}/login?error=rate_limited`);
    expect((await get("203.0.113.2")).headers.location).toBe(`${WEB}/login?error=access_denied`);
  });

  it("does not limit /api/me", async () => {
    const { app } = setup();
    const codes = new Set<number>();
    for (let i = 0; i < 15; i++) codes.add((await app.inject({ method: "GET", url: "/api/me" })).statusCode);
    expect([...codes]).toEqual([401]);
  });
});
