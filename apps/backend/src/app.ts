import cors from "@fastify/cors";
import Fastify from "fastify";
import { API_ROUTES, type HealthResponse } from "@board/shared";
import { registerOriginCheck } from "./utils/index.js";
import { authPlugin, type AuthOptions } from "./routes/auth.js";
import { aboutPage, privacyPage } from "./routes/pages.js";

const HTML_CONTENT_TYPE = "text/html; charset=utf-8";

export interface BuildAppOptions {
  logger?: boolean;
  /** true: trust X-Forwarded-For (API behind a proxy), so the rate limit sees the real client address. */
  trustProxy?: boolean;
  webOrigin?: string;
  /** Contact address on the public pages (CONTACT_EMAIL). */
  contactEmail?: string;
  /** Google sign-in, session and `/api/me`. Left out in tests that do not need it. */
  auth?: Omit<AuthOptions, "webOrigin">;
}

export function buildApp({ logger = false, trustProxy = false, webOrigin, contactEmail, auth }: BuildAppOptions = {}) {
  const app = Fastify({ logger, trustProxy });

  // Web and API live on different addresses in production, so allow exactly one web origin.
  if (webOrigin) {
    void app.register(cors, { origin: new URL(webOrigin).origin, credentials: true });
  }
  registerOriginCheck(app, webOrigin);

  app.get(API_ROUTES.HEALTH, async (): Promise<HealthResponse> => ({ ok: true }));

  // Public pages (no sign-in): Google requires a homepage and a privacy policy on the consent screen.
  app.get(API_ROUTES.ABOUT, async (_req, reply) => reply.type(HTML_CONTENT_TYPE).send(aboutPage(contactEmail)));
  app.get(API_ROUTES.PRIVACY, async (_req, reply) => reply.type(HTML_CONTENT_TYPE).send(privacyPage(contactEmail)));

  if (auth) void app.register(authPlugin, { ...auth, webOrigin });

  return app;
}
