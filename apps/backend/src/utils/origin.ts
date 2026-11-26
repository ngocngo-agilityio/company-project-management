import { API_ERROR, HTTP_STATUS } from "@board/shared";
import type { FastifyInstance } from "fastify";

const UNSAFE_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

/**
 * The session cookie is SameSite=None in production, so another site could make the browser send it.
 * Refuse any unsafe request whose `Origin` is not the web app (or, without WEB_ORIGIN, this same host).
 * Requests with no `Origin` header (curl, server to server) are not browser form posts and pass.
 */
export function registerOriginCheck(app: FastifyInstance, webOrigin?: string): void {
  const allowed = webOrigin ? new URL(webOrigin).origin : undefined;

  app.addHook("onRequest", async (request, reply) => {
    if (!UNSAFE_METHODS.has(request.method)) return;
    const origin = request.headers.origin;
    if (!origin) return;
    if (!isAllowed(origin, allowed, request.headers.host)) {
      return reply.code(HTTP_STATUS.FORBIDDEN).send({ error: API_ERROR.FORBIDDEN_ORIGIN });
    }
  });
}

function isAllowed(origin: string, allowed: string | undefined, host: string | undefined): boolean {
  if (allowed) return origin === allowed;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
