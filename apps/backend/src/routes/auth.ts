import fastifyCookie from "@fastify/cookie";
import fastifyRateLimit from "@fastify/rate-limit";
import {
  API_ERROR,
  API_ROUTES,
  AUTH_ROUTE_PREFIX,
  HTTP_STATUS,
  normalizeEmail,
  SESSION_COOKIE_NAME,
  SIGN_IN_ERROR,
  SIGN_IN_ERROR_PARAM,
  type ApiError,
  type MeResponse,
  type SignInError,
  WEB_ROUTES,
} from "@board/shared";
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
const isLogout = (request: FastifyRequest) => request.url.startsWith(API_ROUTES.LOGOUT);

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
    allowList: (request) => !request.url.startsWith(AUTH_ROUTE_PREFIX),
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
  const fail = (reply: FastifyReply, code: SignInError) =>
    reply.redirect(`${webBase}${WEB_ROUTES.LOGIN}?${SIGN_IN_ERROR_PARAM}=${code}`);

  // The browser goes straight to /auth/google, so a too-many-attempts answer would show as raw JSON.
  // Send it back to the sign-in screen with a code instead. Other routes keep the JSON answer.
  app.setErrorHandler((error: { statusCode?: number; message?: string }, request, reply) => {
    if (
      error.statusCode === HTTP_STATUS.TOO_MANY_REQUESTS &&
      request.method === "GET" &&
      request.url.startsWith(API_ROUTES.GOOGLE_SIGN_IN)
    ) {
      return fail(reply, SIGN_IN_ERROR.RATE_LIMITED);
    }
    return reply
      .code(error.statusCode ?? HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .send(
        error.statusCode && error.statusCode < HTTP_STATUS.INTERNAL_SERVER_ERROR
          ? error
          : { error: API_ERROR.INTERNAL_ERROR },
      );
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

  app.get(API_ROUTES.GOOGLE_CALLBACK, async (request, reply) => {
    // The person pressed Cancel on Google's screen: Google comes back with ?error=access_denied.
    if (callbackQuerySchema.safeParse(request.query).data?.error === SIGN_IN_ERROR.ACCESS_DENIED) {
      return fail(reply, SIGN_IN_ERROR.ACCESS_DENIED);
    }
    let profile;
    try {
      profile = await google.fetchProfile(request, reply);
    } catch (err) {
      request.log.warn({ errName: (err as Error).name }, "Google sign-in failed");
      return fail(reply, SIGN_IN_ERROR.OAUTH_FAILED);
    }
    // Only trust the email when Google says it is verified.
    if (!profile.emailVerified) return fail(reply, SIGN_IN_ERROR.UNVERIFIED_EMAIL);

    const email = normalizeEmail(profile.email);
    const user = await store.findUser({ googleId: profile.id, email });
    // Unknown people, and an email already linked to another Google account, are not let in.
    if (!user || (user.googleId && user.googleId !== profile.id)) return fail(reply, SIGN_IN_ERROR.NOT_INVITED);
    if (user.deactivatedAt) return fail(reply, SIGN_IN_ERROR.DEACTIVATED);

    await store.updateProfile(user.id, {
      googleId: profile.id,
      name: profile.name?.trim() || user.name,
      avatarUrl: profile.avatarUrl ?? null,
    });
    const expiresAt = new Date(now().getTime() + SESSION_TTL_MS);
    const session = await store.createSession(user.id, expiresAt);
    setSessionCookie(reply, session.id, expiresAt);
    return reply.redirect(`${webBase}${WEB_ROUTES.HOME}`);
  });

  app.post(API_ROUTES.LOGOUT, async (request, reply) => {
    const id = sessionIdFrom(request);
    if (id) await store.deleteSession(id);
    clearSessionCookie(reply);
    return reply.code(HTTP_STATUS.NO_CONTENT).send();
  });

  app.get(API_ROUTES.ME, async (request, reply): Promise<MeResponse | ApiError> => {
    const user = await currentUser(request, reply);
    if (!user) return reply.code(HTTP_STATUS.UNAUTHORIZED).send({ error: API_ERROR.UNAUTHORIZED });
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      isSuperAdmin: user.isSuperAdmin,
    };
  });
};
