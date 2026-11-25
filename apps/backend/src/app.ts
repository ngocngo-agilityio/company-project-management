import cors from "@fastify/cors";
import Fastify from "fastify";
import type { HealthResponse } from "@board/shared";
import { registerOriginCheck } from "./auth/origin.js";
import { authPlugin, type AuthOptions } from "./auth/routes.js";
import { aboutPage, privacyPage } from "./pages.js";

export interface BuildAppOptions {
  logger?: boolean;
  webOrigin?: string;
  /** Google sign-in, session and `/api/me`. Left out in tests that do not need it. */
  auth?: Omit<AuthOptions, "webOrigin">;
}

export function buildApp({ logger = false, webOrigin, auth }: BuildAppOptions = {}) {
  const app = Fastify({ logger });

  // Web and API live on different addresses in production, so allow exactly one web origin.
  if (webOrigin) {
    void app.register(cors, { origin: new URL(webOrigin).origin, credentials: true });
  }
  registerOriginCheck(app, webOrigin);

  app.get("/health", async (): Promise<HealthResponse> => ({ ok: true }));

  // Public pages (no sign-in): Google requires a homepage and a privacy policy on the consent screen.
  app.get("/about", async (_req, reply) => reply.type("text/html; charset=utf-8").send(aboutPage()));
  app.get("/privacy", async (_req, reply) => reply.type("text/html; charset=utf-8").send(privacyPage()));

  if (auth) void app.register(authPlugin, { ...auth, webOrigin });

  return app;
}
