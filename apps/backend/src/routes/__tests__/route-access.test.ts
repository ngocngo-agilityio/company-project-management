import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { API_ERROR, API_ROUTES, SESSION_COOKIE_NAME, type Action } from "@board/shared";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../app.js";
import { createGoogleAuth, type GoogleAuth } from "../../services/google.js";
import type { AuthStore, RouteAccess, StoredUser } from "../../types/index.js";

const NOW = new Date("2026-11-26T08:00:00.000Z");

const makeUser = (over: Partial<StoredUser> = {}): StoredUser => ({
  id: randomUUID(),
  email: "person@example.com",
  name: "Person",
  avatarUrl: null,
  googleId: "google-1",
  isSuperAdmin: false,
  deactivatedAt: null,
  ...over,
});

/** Only what the access check and `/api/me` read: sessions. */
function makeStore() {
  const users = new Map<string, StoredUser>();
  const sessions = new Map<string, string>();
  const store = {
    async findSession(id: string) {
      const userId = sessions.get(id);
      if (!userId) return null;
      return {
        id,
        expiresAt: new Date(NOW.getTime() + 60 * 60 * 1000),
        lastUsedAt: NOW,
        user: users.get(userId)!,
      };
    },
    async deleteSession(id: string) {
      sessions.delete(id);
    },
    async touchSession() {},
  } as unknown as AuthStore;
  /** A session for this person; returns the Cookie header to send. */
  const signIn = (user: StoredUser) => {
    const id = randomUUID();
    users.set(user.id, user);
    sessions.set(id, user.id);
    return { cookie: `${SESSION_COOKIE_NAME}=${id}` };
  };
  return { store, signIn };
}

/** The real Google part only adds the redirect route; no request leaves the machine. */
const realGoogle = (): GoogleAuth =>
  createGoogleAuth({
    clientId: "test-client",
    clientSecret: "test-secret",
    redirectUri: "http://localhost:3000/auth/google/callback",
    secureCookies: false,
  });

/**
 * Google that also adds routes next to the real ones, inside the auth plugin where the access check
 * runs. Test-only: no such routes exist in the app.
 */
function googleWith(extra: (app: FastifyInstance) => void): GoogleAuth {
  const google = realGoogle();
  return {
    fetchProfile: google.fetchProfile,
    async register(app) {
      await google.register(app);
      extra(app);
    },
  };
}

const apps: Array<{ close(): Promise<unknown> }> = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((a) => a.close()));
});

function setup(google: GoogleAuth = realGoogle()) {
  const { store, signIn } = makeStore();
  const app = buildApp({ auth: { store, google, crossSite: false, superAdminEmail: undefined, now: () => NOW } });
  apps.push(app);
  return { app, signIn };
}

describe("every route declares who may call it", () => {
  it("gives each registered route an access, and only the expected routes are public", async () => {
    const { app } = setup();
    await app.ready();
    const routes = app.routeAccessTable().map((r) => ({ route: `${r.method} ${r.url}`, access: r.access }));

    expect(routes.filter((r) => r.access === undefined)).toEqual([]);
    // A new public route must be added to this list on purpose.
    const isPublic = (r: { access: RouteAccess | undefined }) => r.access === "public";
    expect(
      routes
        .filter(isPublic)
        .map((r) => r.route)
        .sort(),
    ).toEqual(
      [
        `GET ${API_ROUTES.HEALTH}`,
        `GET ${API_ROUTES.ABOUT}`,
        `GET ${API_ROUTES.PRIVACY}`,
        `GET ${API_ROUTES.GOOGLE_SIGN_IN}`,
        `GET ${API_ROUTES.GOOGLE_CALLBACK}`,
        `POST ${API_ROUTES.LOGOUT}`,
      ].sort(),
    );
    expect(routes.find((r) => r.route === `GET ${API_ROUTES.ME}`)?.access).toBe("authenticated");
  });

  it("refuses to start when a route has no access declaration", async () => {
    const { app } = setup();
    app.get("/undeclared", async () => ({ ok: true }));
    await expect(app.ready()).rejects.toThrow(/Routes without config\.access: GET \/undeclared/);
  });
});

describe("GET /api/me (authenticated)", () => {
  it("answers 401 without a session", async () => {
    const { app } = setup();
    const res = await app.inject({ method: "GET", url: API_ROUTES.ME });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ error: API_ERROR.UNAUTHORIZED });
  });

  it("answers 200 for any signed-in person, whatever the role", async () => {
    const { app, signIn } = setup();
    const res = await app.inject({ method: "GET", url: API_ROUTES.ME, headers: signIn(makeUser()) });
    expect(res.statusCode).toBe(200);
  });
});

describe("a route that names an Action", () => {
  const ACTION: Action = "systemlog:view";
  const ROUTE = "/test-only/action";
  const withActionRoute = () =>
    setup(
      googleWith((app) => {
        app.get(ROUTE, { config: { access: ACTION } }, async () => ({ ok: true }));
      }),
    );

  it("answers 401 without a session", async () => {
    const { app } = withActionRoute();
    const res = await app.inject({ method: "GET", url: ROUTE });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ error: API_ERROR.UNAUTHORIZED });
  });

  it("answers 403 when the role is refused the action", async () => {
    const { app, signIn } = withActionRoute();
    const res = await app.inject({ method: "GET", url: ROUTE, headers: signIn(makeUser({ isSuperAdmin: false })) });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({ error: API_ERROR.FORBIDDEN });
  });

  it("answers 200 for the Super Admin", async () => {
    const { app, signIn } = withActionRoute();
    const res = await app.inject({ method: "GET", url: ROUTE, headers: signIn(makeUser({ isSuperAdmin: true })) });
    expect(res.statusCode).toBe(200);
  });

  it("answers 401 for a deactivated person, even with a Super Admin flag", async () => {
    const { app, signIn } = withActionRoute();
    const gone = makeUser({ isSuperAdmin: true, deactivatedAt: new Date("2026-11-01T00:00:00.000Z") });
    const res = await app.inject({ method: "GET", url: ROUTE, headers: signIn(gone) });
    expect(res.statusCode).toBe(401);
  });
});
