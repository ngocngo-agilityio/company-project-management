import fastifyCookie from "@fastify/cookie";
import fastifyRateLimit from "@fastify/rate-limit";
import {
  API_ERROR,
  API_ROUTES,
  AUTH_ROUTE_PREFIX,
  can,
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
import { SESSION_TTL_MS } from "../constants/index.js";
import type { GoogleAuth } from "../services/google.js";
import { evaluateGate } from "../services/invitation-gate.js";
import type { AuthStore, PeopleStore, ProjectStore, StoredUser } from "../types/index.js";
import { peoplePlugin } from "./people.js";
import { projectsPlugin } from "./projects.js";

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
  /** Project routes. Left out in tests that do not need them. */
  projects?: ProjectStore;
  /** People route. Left out in tests that do not need it. */
  people?: PeopleStore;
  google: GoogleAuth;
  /** Where the browser goes after sign-in. Unset: relative links (same origin). */
  webOrigin?: string | undefined;
  /** true: cookie is Secure + SameSite=None (web and API on different addresses). false: Lax, not Secure. */
  crossSite: boolean;
  /** Lowercase email of the first Super Admin (SUPER_ADMIN_EMAIL). Unset: nobody gets in on that rule. */
  superAdminEmail?: string | undefined;
  now?: () => Date;
}

export const authPlugin: FastifyPluginAsync<AuthOptions> = async (app, opts) => {
  const { store, google, crossSite } = opts;
  const now = opts.now ?? (() => new Date());
  const webBase = opts.webOrigin ? new URL(opts.webOrigin).origin : "";

  await app.register(fastifyCookie);
  // Answers here depend on who is signed in: keep browsers (and Back / bfcache) from storing them.
  app.addHook("onRequest", async (_request, reply) => {
    reply.header("Cache-Control", "no-store");
  });
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
  app.setErrorHandler((error: { statusCode?: number; message?: string; code?: string }, request, reply) => {
    // Unreadable body (bad JSON, unsupported Content-Type): same shape as a zod refusal, not Fastify's own object.
    // Only a 400 refusal: a body that is too large keeps its own status (413) and Fastify's answer.
    if (error.code?.startsWith("FST_ERR_CTP_") && error.statusCode === HTTP_STATUS.BAD_REQUEST) {
      return reply
        .code(error.statusCode)
        .send({ error: API_ERROR.VALIDATION_ERROR, message: error.message ?? "request: unreadable body" });
    }
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

  // One lookup per request: the access check and the handler both ask who is signed in.
  const resolved = new WeakMap<FastifyRequest, StoredUser | null>();

  /** The signed-in person, or null (no cookie, unknown, expired or deactivated session). */
  async function currentUser(request: FastifyRequest, reply: FastifyReply): Promise<StoredUser | null> {
    if (resolved.has(request)) return resolved.get(request)!;
    const user = await lookupUser(request, reply);
    resolved.set(request, user);
    return user;
  }

  async function lookupUser(request: FastifyRequest, reply: FastifyReply): Promise<StoredUser | null> {
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

  // Enforces `config.access` for every route in this plugin and below (see `RouteAccess`). Runs before
  // body and query validation, so an unsigned caller gets 401 or 403, never 400.
  // `public` passes. Otherwise 401 without a session; for an Action, 403 unless the role may do it.
  // Only the Super Admin flag is known here. Routes that depend on a project role (and answer 404 for a
  // project that is not the person's) need their own membership lookup; `GET /api/projects` therefore
  // uses `authenticated` and splits "all versus own" in its handler.
  // Note: an unreadable body (bad JSON, unsupported Content-Type) is refused by Fastify before this hook runs.
  app.addHook("preValidation", async (request, reply) => {
    const access = request.routeOptions.config.access;
    if (access === undefined || access === "public") return;
    const user = await currentUser(request, reply);
    if (!user) return reply.code(HTTP_STATUS.UNAUTHORIZED).send({ error: API_ERROR.UNAUTHORIZED });
    if (access === "authenticated") return;
    if (!user.isSuperAdmin || !can("SUPER_ADMIN", access)) {
      return reply.code(HTTP_STATUS.FORBIDDEN).send({ error: API_ERROR.FORBIDDEN });
    }
  });

  app.get(API_ROUTES.GOOGLE_CALLBACK, { config: { access: "public" } }, async (request, reply) => {
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
    const at = now();
    const decision = await evaluateGate({
      store,
      user,
      googleId: profile.id,
      email,
      superAdminEmail: opts.superAdminEmail,
      now: at,
    });
    if (!decision.allowed) return fail(reply, decision.code);

    // Accept invitations, create the person and the memberships in one transaction. No session before it.
    const admitted = await store.admit({
      userId: user?.id ?? null,
      email,
      googleId: profile.id,
      name: profile.name?.trim() || user?.name || email.split("@")[0]!,
      avatarUrl: profile.avatarUrl ?? null,
      isFirstSuperAdmin: decision.isFirstSuperAdmin,
      now: at,
    });
    // Lost a race (the invitation was used a moment ago): same answer as for an uninvited person.
    if (!admitted) return fail(reply, SIGN_IN_ERROR.NOT_INVITED);
    const expiresAt = new Date(at.getTime() + SESSION_TTL_MS);
    const session = await store.createSession(admitted.id, expiresAt);
    setSessionCookie(reply, session.id, expiresAt);
    return reply.redirect(`${webBase}${WEB_ROUTES.HOME}`);
  });

  app.post(API_ROUTES.LOGOUT, { config: { access: "public" } }, async (request, reply) => {
    const id = sessionIdFrom(request);
    if (id) await store.deleteSession(id);
    clearSessionCookie(reply);
    return reply.code(HTTP_STATUS.NO_CONTENT).send();
  });

  app.get(
    API_ROUTES.ME,
    { config: { access: "authenticated" } },
    async (request, reply): Promise<MeResponse | ApiError> => {
      const user = await currentUser(request, reply);
      if (!user) return reply.code(HTTP_STATUS.UNAUTHORIZED).send({ error: API_ERROR.UNAUTHORIZED });
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        isSuperAdmin: user.isSuperAdmin,
      };
    },
  );

  // Registered here, not at the app root, so the access hook above covers them.
  if (opts.projects) await app.register(projectsPlugin, { store: opts.projects, currentUser });
  if (opts.people) await app.register(peoplePlugin, { store: opts.people, currentUser });
};
