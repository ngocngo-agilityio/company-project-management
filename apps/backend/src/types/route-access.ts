import type { Action } from "@board/shared";

/**
 * Who may call a route. Every route must declare it in `config.access`; the app refuses to start otherwise.
 * - `public`: no sign-in (health, public pages, the sign-in routes themselves).
 * - `authenticated`: any signed-in person, no role check (for example `/api/me`).
 * - an `Action` from `PERMISSIONS`: the signed-in person's role must be allowed that action.
 *
 * Non-public routes are enforced inside the auth plugin (`routes/auth.ts`): register them there or below it.
 */
export type RouteAccess = "public" | "authenticated" | Action;

/** One row of `app.routeAccessTable()`. */
export interface RouteAccessEntry {
  method: string;
  url: string;
  access: RouteAccess | undefined;
}

declare module "fastify" {
  interface FastifyContextConfig {
    access?: RouteAccess;
  }
  interface FastifyInstance {
    /** Every registered route with its declared access (HEAD twins left out). */
    routeAccessTable(): RouteAccessEntry[];
  }
}
