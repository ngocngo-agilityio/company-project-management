import cors from "@fastify/cors";
import Fastify from "fastify";
import type { HealthResponse } from "@board/shared";

export function buildApp({ logger = false, webOrigin }: { logger?: boolean; webOrigin?: string } = {}) {
  const app = Fastify({ logger });

  // Web and API live on different addresses in production, so allow exactly one web origin.
  if (webOrigin) {
    void app.register(cors, { origin: new URL(webOrigin).origin, credentials: true });
  }

  app.get("/health", async (): Promise<HealthResponse> => ({ ok: true }));

  return app;
}
