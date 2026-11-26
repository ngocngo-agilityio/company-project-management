import {
  API_ROUTES,
  HTTP_STATUS,
  healthResponseSchema,
  meResponseSchema,
  type HealthResponse,
  type MeResponse,
} from "@board/shared";

// Production: absolute URL of the API service (VITE_API_URL). Local dev: empty, the Vite proxy forwards
// /health, /api and /auth to the backend.
const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

/** Full-page redirect target that starts Google sign-in. A link, not a fetch: the browser follows the redirects. */
export const GOOGLE_SIGN_IN_URL = `${API_URL}${API_ROUTES.GOOGLE_SIGN_IN}`;

// A sleeping free-plan service needs about a minute to wake up.
const WAKE_UP_TIMEOUT_MS = 90_000;

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_URL}${API_ROUTES.HEALTH}`, { signal: AbortSignal.timeout(WAKE_UP_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`API answered ${res.status}`);
  return healthResponseSchema.parse(await res.json());
}

/** The signed-in person, or null when there is no valid session (401). The cookie crosses addresses. */
export async function fetchMe(): Promise<MeResponse | null> {
  const res = await fetch(`${API_URL}${API_ROUTES.ME}`, { credentials: "include" });
  if (res.status === HTTP_STATUS.UNAUTHORIZED) return null;
  if (!res.ok) throw new Error(`API answered ${res.status}`);
  return meResponseSchema.parse(await res.json());
}
