import { healthResponseSchema, meResponseSchema, type HealthResponse, type MeResponse } from "@board/shared";

// Production: absolute URL of the API service (VITE_API_URL). Local dev: empty, the Vite proxy forwards
// /health, /api and /auth to the backend.
const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

// A sleeping free-plan service needs about a minute to wake up.
const WAKE_UP_TIMEOUT_MS = 90_000;

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_URL}/health`, { signal: AbortSignal.timeout(WAKE_UP_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`API answered ${res.status}`);
  return healthResponseSchema.parse(await res.json());
}

/** The signed-in person, or null when there is no valid session (401). The cookie crosses addresses. */
export async function fetchMe(): Promise<MeResponse | null> {
  const res = await fetch(`${API_URL}/api/me`, { credentials: "include" });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`API answered ${res.status}`);
  return meResponseSchema.parse(await res.json());
}
