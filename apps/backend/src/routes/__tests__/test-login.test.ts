import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { API_ROUTES, SESSION_COOKIE_NAME } from "@board/shared";
import { buildApp } from "../../app.js";
import { createGoogleAuth } from "../../services/google.js";
import type { AuthStore, StoredUser } from "../../types/index.js";

const NOW = new Date("2026-11-27T08:00:00.000Z");
const google = createGoogleAuth({
  clientId: "test-client",
  clientSecret: "test-secret",
  redirectUri: "http://localhost:3000/auth/google/callback",
  secureCookies: false,
});

const person = (over: Partial<StoredUser> = {}): StoredUser => ({
  id: randomUUID(),
  email: "person@example.com",
  name: "Person",
  avatarUrl: null,
  googleId: "e2e:person@example.com",
  isSuperAdmin: false,
  deactivatedAt: null,
  ...over,
});

function makeStore(existing: StoredUser[] = []) {
  const users = [...existing];
  const sessions = new Map<string, string>();
  const store = {
    async findUser({ email }: { email: string }) {
      return users.find((u) => u.email === email) ?? null;
    },
    async admit(input: { email: string; name: string; googleId: string; isFirstSuperAdmin: boolean }) {
      const user = person({
        id: randomUUID(),
        email: input.email,
        name: input.name,
        googleId: input.googleId,
        isSuperAdmin: input.isFirstSuperAdmin,
      });
      users.push(user);
      return user;
    },
    async createSession(userId: string) {
      const id = randomUUID();
      sessions.set(id, userId);
      return { id };
    },
    async findSession(id: string) {
      const userId = sessions.get(id);
      const user = users.find((u) => u.id === userId);
      return user ? { id, expiresAt: new Date(NOW.getTime() + 3_600_000), lastUsedAt: NOW, user } : null;
    },
    async touchSession() {},
    async deleteSession() {},
  } as unknown as AuthStore;
  return { store, users };
}

const apps: Array<{ close(): Promise<unknown> }> = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((a) => a.close()));
});

function setup(opts: { e2eLogin?: boolean; users?: StoredUser[] } = {}) {
  const { store, users } = makeStore(opts.users);
  const app = buildApp({
    auth: { store, google, crossSite: false, superAdminEmail: undefined, now: () => NOW, e2eLogin: opts.e2eLogin },
  });
  apps.push(app);
  return { app, users };
}

const login = (app: ReturnType<typeof setup>["app"], payload: unknown) =>
  app.inject({ method: "POST", url: API_ROUTES.TEST_LOGIN, payload: payload as object });

describe("POST /api/test/login", () => {
  it("does not exist without E2E (404)", async () => {
    const { app } = setup({ e2eLogin: false });
    const res = await login(app, { email: "person@example.com" });
    expect(res.statusCode).toBe(404);
    expect(res.headers["set-cookie"]).toBeUndefined();
  });

  it("is not in the route table without E2E", async () => {
    const { app } = setup({ e2eLogin: false });
    await app.ready();
    expect(app.routeAccessTable().map((r) => r.url)).not.toContain(API_ROUTES.TEST_LOGIN);
  });

  it("signs in an existing person and sets the session cookie", async () => {
    const { app } = setup({ e2eLogin: true, users: [person()] });
    const res = await login(app, { email: "Person@Example.com" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ email: "person@example.com", isSuperAdmin: false });
    const cookie = res.cookies.find((c) => c.name === SESSION_COOKIE_NAME);
    expect(cookie?.httpOnly).toBe(true);

    const me = await app.inject({
      method: "GET",
      url: API_ROUTES.ME,
      headers: { cookie: `${SESSION_COOKIE_NAME}=${cookie!.value}` },
    });
    expect(me.statusCode).toBe(200);
  });

  it("creates a Super Admin that does not exist yet", async () => {
    const { app, users } = setup({ e2eLogin: true });
    const res = await login(app, { email: "admin@example.com", isSuperAdmin: true });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ isSuperAdmin: true });
    expect(users).toHaveLength(1);
  });

  it("does not create an ordinary person that does not exist (404)", async () => {
    const { app, users } = setup({ e2eLogin: true });
    const res = await login(app, { email: "nobody@example.com" });
    expect(res.statusCode).toBe(404);
    expect(users).toHaveLength(0);
  });

  it("refuses a deactivated person (403)", async () => {
    const { app } = setup({ e2eLogin: true, users: [person({ deactivatedAt: NOW })] });
    const res = await login(app, { email: "person@example.com" });
    expect(res.statusCode).toBe(403);
    expect(res.headers["set-cookie"]).toBeUndefined();
  });

  it.each([{}, { email: "not-an-email" }, { email: "a@example.com", isSuperAdmin: "yes" }])(
    "refuses invalid input (400): %j",
    async (body) => {
      const { app } = setup({ e2eLogin: true });
      const res = await login(app, body);
      expect(res.statusCode).toBe(400);
      expect(res.json()).toMatchObject({ error: "validation_error" });
    },
  );

  it("refuses a request from another origin (403)", async () => {
    const { store } = makeStore([person()]);
    const app = buildApp({
      webOrigin: "https://web.example.com",
      auth: { store, google, crossSite: false, superAdminEmail: undefined, now: () => NOW, e2eLogin: true },
    });
    apps.push(app);
    const res = await app.inject({
      method: "POST",
      url: API_ROUTES.TEST_LOGIN,
      headers: { origin: "https://evil.example.com" },
      payload: { email: "person@example.com" },
    });
    expect(res.statusCode).toBe(403);
  });
});
