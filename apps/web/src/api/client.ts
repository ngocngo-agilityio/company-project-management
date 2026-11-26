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

/** Thrown by an API call the server refused with 401. The query client reacts by sending the person to sign-in. */
export class UnauthorizedError extends Error {
  constructor() {
    super("Not signed in");
    this.name = "UnauthorizedError";
  }
}

/** Ends the session on the server (row deleted, cookie cleared). Answers 204 even when there was no session. */
export async function logout(): Promise<void> {
  const res = await fetch(`${API_URL}${API_ROUTES.LOGOUT}`, { method: "POST", credentials: "include" });
  if (!res.ok) throw new Error(`API answered ${res.status}`);
}

/** The signed-in person, or null when there is no valid session (401). The cookie crosses addresses. */
export async function fetchMe(): Promise<MeResponse | null> {
  const res = await fetch(`${API_URL}${API_ROUTES.ME}`, { credentials: "include" });
  if (res.status === HTTP_STATUS.UNAUTHORIZED) return null;
  if (!res.ok) throw new Error(`API answered ${res.status}`);
  return meResponseSchema.parse(await res.json());
}
