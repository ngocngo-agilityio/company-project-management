import type { FastifyInstance, RouteOptions } from "fastify";
import type { RouteAccessEntry } from "../types/index.js";

/**
 * Refuses to start the app when a route has no `config.access` (see `RouteAccess`).
 * Register it before any route. The check runs in `onReady`, after every plugin has had the chance
 * to add its own declaration, so a route added later without one cannot go live by mistake.
 * `app.routeAccessTable()` returns every route with its access, for tests.
 */
export function registerAccessCheck(app: FastifyInstance): void {
  const routes: RouteOptions[] = [];
  app.addHook("onRoute", (route) => {
    routes.push(route);
  });
  const table = (): RouteAccessEntry[] =>
    routes.flatMap((route) =>
      [route.method]
        .flat()
        .filter((method) => method !== "HEAD")
        .map((method) => ({ method, url: route.url, access: route.config?.access })),
    );
  app.decorate("routeAccessTable", table);
  app.addHook("onReady", async () => {
    const missing = table()
      .filter((entry) => entry.access === undefined)
      .map((entry) => `${entry.method} ${entry.url}`);
    if (missing.length > 0) {
      throw new Error(`Routes without config.access: ${missing.join(", ")}`);
    }
  });
}
