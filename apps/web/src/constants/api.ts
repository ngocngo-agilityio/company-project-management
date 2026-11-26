import { API_ROUTES } from "@board/shared";

// Production: absolute URL of the API service (VITE_API_URL). Local dev: empty, the Vite proxy forwards
// /health, /api and /auth to the backend.
export const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

/** Full-page redirect target that starts Google sign-in. A link, not a fetch: the browser follows the redirects. */
export const GOOGLE_SIGN_IN_URL = `${API_URL}${API_ROUTES.GOOGLE_SIGN_IN}`;
