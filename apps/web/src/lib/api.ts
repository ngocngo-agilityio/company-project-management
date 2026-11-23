import { healthResponseSchema, type HealthResponse } from "@board/shared";

// Production: absolute URL of the API service (VITE_API_URL). Local dev: the Vite proxy at /api.
const API_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "");

// A sleeping free-plan service needs about a minute to wake up.
const WAKE_UP_TIMEOUT_MS = 90_000;

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_URL}/health`, { signal: AbortSignal.timeout(WAKE_UP_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`API answered ${res.status}`);
  return healthResponseSchema.parse(await res.json());
}
