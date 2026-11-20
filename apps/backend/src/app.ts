import Fastify from "fastify";
import type { HealthResponse } from "@board/shared";

export function buildApp({ logger = false }: { logger?: boolean } = {}) {
  const app = Fastify({ logger });

  app.get("/health", async (): Promise<HealthResponse> => ({ ok: true }));

  return app;
}
