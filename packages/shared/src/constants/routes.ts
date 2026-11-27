/** Screens of the web app. */
export const WEB_ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  PROJECTS: "/projects",
  MY_CARDS: "/my-cards",
  PEOPLE: "/people",
} as const;

/** Paths the API answers. The web proxy (`vite.config.ts`) forwards `/health`, `/api` and `/auth`. */
export const API_ROUTES = {
  HEALTH: "/health",
  ME: "/api/me",
  PROJECTS: "/api/projects",
  PEOPLE: "/api/people",
  /** Exists only when the backend runs with `E2E=1`. Never on Render. */
  TEST_LOGIN: "/api/test/login",
  GOOGLE_SIGN_IN: "/auth/google",
  GOOGLE_CALLBACK: "/auth/google/callback",
  LOGOUT: "/auth/logout",
  ABOUT: "/about",
  PRIVACY: "/privacy",
} as const;

/** Every `/auth/...` path starts with this. */
export const AUTH_ROUTE_PREFIX = "/auth/";
