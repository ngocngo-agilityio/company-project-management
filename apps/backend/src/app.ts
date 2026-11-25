import cors from "@fastify/cors";
import Fastify from "fastify";
import type { HealthResponse } from "@board/shared";
import { aboutPage, privacyPage } from "./pages.js";

export function buildApp({ logger = false, webOrigin }: { logger?: boolean; webOrigin?: string } = {}) {
  const app = Fastify({ logger });

  // Web and API live on different addresses in production, so allow exactly one web origin.
  if (webOrigin) {
    void app.register(cors, { origin: new URL(webOrigin).origin, credentials: true });
  }

  app.get("/health", async (): Promise<HealthResponse> => ({ ok: true }));

  // Public pages (no sign-in): Google requires a homepage and a privacy policy on the consent screen.
  app.get("/about", async (_req, reply) => reply.type("text/html; charset=utf-8").send(aboutPage()));
  app.get("/privacy", async (_req, reply) => reply.type("text/html; charset=utf-8").send(privacyPage()));

  return app;
}
