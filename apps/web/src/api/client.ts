import {
  API_ROUTES,
  HTTP_STATUS,
  healthResponseSchema,
  meResponseSchema,
  type HealthResponse,
  type MeResponse,
} from "@board/shared";
import { API_URL } from "../constants";
import { WAKE_UP_TIMEOUT_MS } from "../constants";

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
