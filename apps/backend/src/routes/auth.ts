import fastifyCookie from "@fastify/cookie";
import fastifyRateLimit from "@fastify/rate-limit";
import { normalizeEmail, SESSION_COOKIE_NAME, type ApiError, type MeResponse, type SignInError } from "@board/shared";
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import type { GoogleAuth } from "../services/google.js";
import type { AuthStore, StoredUser } from "../services/store.js";

/** A session lasts 7 days from the last time it was used. */
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** Do not write to the database on every request: refresh `lastUsedAt` at most this often. */
const TOUCH_INTERVAL_MS = 5 * 60 * 1000;

/** Sign-in attempts allowed per minute and address (`/auth/google` and its callback). */
const SIGN_IN_LIMIT = 10;
/** Sign-outs allowed per minute and address. Counted apart from sign-in. */
const LOGOUT_LIMIT = 30;
const isLogout = (request: FastifyRequest) => request.url.startsWith("/auth/logout");

const callbackQuerySchema = z.object({ error: z.string().optional() });

export interface AuthOptions {
  store: AuthStore;
  google: GoogleAuth;
  /** Where the browser goes after sign-in. Unset: relative links (same origin). */
  webOrigin?: string | undefined;
  /** true: cookie is Secure + SameSite=None (web and API on different addresses). false: Lax, not Secure. */
  crossSite: boolean;
  now?: () => Date;
}

export const authPlugin: FastifyPluginAsync<AuthOptions> = async (app, opts) => {
  const { store, google, crossSite } = opts;
  const now = opts.now ?? (() => new Date());
  const webBase = opts.webOrigin ? new URL(opts.webOrigin).origin : "";

  await app.register(fastifyCookie);
  // Only the /auth/* routes are limited; /api/me is polled by the web app.
  // Sign-in routes: 10 a minute per address. Logout has its own, separate counter.
  await app.register(fastifyRateLimit, {
    global: true,
    max: (request) => (isLogout(request) ? LOGOUT_LIMIT : SIGN_IN_LIMIT),
    keyGenerator: (request) => `${isLogout(request) ? "logout" : "sign-in"}:${request.ip}`,
    timeWindow: "1 minute",
    allowList: (request) => !request.url.startsWith("/auth/"),
  });
  await google.register(app);

  const cookieBase = {
    path: "/",
    httpOnly: true,
    secure: crossSite,
    sameSite: crossSite ? ("none" as const) : ("lax" as const),
  };
  const setSessionCookie = (reply: FastifyReply, id: string, expires: Date) =>
    reply.setCookie(SESSION_COOKIE_NAME, id, { ...cookieBase, expires });
  const clearSessionCookie = (reply: FastifyReply) => reply.clearCookie(SESSION_COOKIE_NAME, cookieBase);
  const fail = (reply: FastifyReply, code: SignInError) => reply.redirect(`${webBase}/login?error=${code}`);

  // The browser goes straight to /auth/google, so a too-many-attempts answer would show as raw JSON.
  // Send it back to the sign-in screen with a code instead. Other routes keep the JSON answer.
  app.setErrorHandler((error: { statusCode?: number; message?: string }, request, reply) => {
    if (error.statusCode === 429 && request.method === "GET" && request.url.startsWith("/auth/google")) {
      return fail(reply, "rate_limited");
    }
    return reply
      .code(error.statusCode ?? 500)
      .send(error.statusCode && error.statusCode < 500 ? error : { error: "internal_error" });
  });

  const sessionIdFrom = (request: FastifyRequest): string | null => {
    const parsed = z.uuid().safeParse(request.cookies[SESSION_COOKIE_NAME]);
    return parsed.success ? parsed.data : null;
  };

  /** The signed-in person, or null (no cookie, unknown, expired or deactivated session). */
  async function currentUser(request: FastifyRequest, reply: FastifyReply): Promise<StoredUser | null> {
    const id = sessionIdFrom(request);
    if (!id) return null;
    const session = await store.findSession(id);
    if (!session) {
      clearSessionCookie(reply);
      return null;
    }
    const at = now();
    if (session.expiresAt <= at || session.user.deactivatedAt) {
      await store.deleteSession(session.id);
      clearSessionCookie(reply);
      return null;
    }
    if (!session.lastUsedAt || at.getTime() - session.lastUsedAt.getTime() > TOUCH_INTERVAL_MS) {
      const expiresAt = new Date(at.getTime() + SESSION_TTL_MS);
      await store.touchSession(session.id, { expiresAt, lastUsedAt: at });
      setSessionCookie(reply, session.id, expiresAt);
    }
    return session.user;
  }

  app.get("/auth/google/callback", async (request, reply) => {
    // The person pressed Cancel on Google's screen: Google comes back with ?error=access_denied.
    if (callbackQuerySchema.safeParse(request.query).data?.error === "access_denied") {
      return fail(reply, "access_denied");
    }
    let profile;
    try {
      profile = await google.fetchProfile(request, reply);
    } catch (err) {
      request.log.warn({ errName: (err as Error).name }, "Google sign-in failed");
      return fail(reply, "oauth_failed");
    }
    // Only trust the email when Google says it is verified.
    if (!profile.emailVerified) return fail(reply, "unverified_email");

    const email = normalizeEmail(profile.email);
    const user = await store.findUser({ googleId: profile.id, email });
    // Unknown people, and an email already linked to another Google account, are not let in.
    if (!user || (user.googleId && user.googleId !== profile.id)) return fail(reply, "not_invited");
    if (user.deactivatedAt) return fail(reply, "deactivated");

    await store.updateProfile(user.id, {
      googleId: profile.id,
      name: profile.name?.trim() || user.name,
      avatarUrl: profile.avatarUrl ?? null,
    });
    const expiresAt = new Date(now().getTime() + SESSION_TTL_MS);
    const session = await store.createSession(user.id, expiresAt);
    setSessionCookie(reply, session.id, expiresAt);
    return reply.redirect(`${webBase}/`);
  });

  app.post("/auth/logout", async (request, reply) => {
    const id = sessionIdFrom(request);
    if (id) await store.deleteSession(id);
    clearSessionCookie(reply);
    return reply.code(204).send();
  });

  app.get("/api/me", async (request, reply): Promise<MeResponse | ApiError> => {
    const user = await currentUser(request, reply);
    if (!user) return reply.code(401).send({ error: "unauthorized" });
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      isSuperAdmin: user.isSuperAdmin,
    };
  });
};
