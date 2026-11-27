import {
  API_ROUTES,
  HTTP_STATUS,
  createProjectResponseSchema,
  invitationListResponseSchema,
  invitationResponseSchema,
  projectArchiveResponseSchema,
  healthResponseSchema,
  meResponseSchema,
  peopleListResponseSchema,
  projectListResponseSchema,
  type CreateInvitationRequest,
  type CreateProjectRequest,
  type CreateProjectResponse,
  type InvitationListResponse,
  type InvitationResponse,
  type ProjectArchiveResponse,
  type HealthResponse,
  type MeResponse,
  type PeopleListResponse,
  type ProjectListResponse,
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

/** An API call the server answered with an error status (other than 401, which is `UnauthorizedError`). */
export class ApiRequestError extends Error {
  readonly status: number;
  constructor(status: number) {
    super(`API answered ${status}`);
    this.name = "ApiRequestError";
    this.status = status;
  }
}

async function readJson<T>(res: Response, schema: { parse: (data: unknown) => T }): Promise<T> {
  if (res.status === HTTP_STATUS.UNAUTHORIZED) throw new UnauthorizedError();
  if (!res.ok) throw new ApiRequestError(res.status);
  return schema.parse(await res.json());
}

/** The projects the signed-in person belongs to (all of them for the Super Admin). */
export async function fetchProjects(): Promise<ProjectListResponse> {
  const res = await fetch(`${API_URL}${API_ROUTES.PROJECTS}`, { credentials: "include" });
  return readJson(res, projectListResponseSchema);
}

/** People who can be picked as Owner: the Super Admin only; deactivated people are left out. */
export async function fetchActivePeople(): Promise<PeopleListResponse> {
  const res = await fetch(`${API_URL}${API_ROUTES.PEOPLE}?status=active`, { credentials: "include" });
  return readJson(res, peopleListResponseSchema);
}

/** Creates a project with its first board. Super Admin only (the server answers 403 to anyone else). */
export async function createProject(body: CreateProjectRequest): Promise<CreateProjectResponse> {
  const res = await fetch(`${API_URL}${API_ROUTES.PROJECTS}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return readJson(res, createProjectResponseSchema);
}

async function postProjectAction(route: string, projectId: string): Promise<ProjectArchiveResponse> {
  const res = await fetch(`${API_URL}${route.replace(":id", encodeURIComponent(projectId))}`, {
    method: "POST",
    credentials: "include",
  });
  return readJson(res, projectArchiveResponseSchema);
}

/** Marks a project archived (read-only for everyone). Super Admin only. */
export function archiveProject(projectId: string): Promise<ProjectArchiveResponse> {
  return postProjectAction(API_ROUTES.PROJECT_ARCHIVE, projectId);
}

/** Brings an archived project back. Super Admin only. */
export function restoreProject(projectId: string): Promise<ProjectArchiveResponse> {
  return postProjectAction(API_ROUTES.PROJECT_RESTORE, projectId);
}

/** Every invitation, newest first. Super Admin only. */
export async function fetchInvitations(): Promise<InvitationListResponse> {
  const res = await fetch(`${API_URL}${API_ROUTES.INVITATIONS}`, { credentials: "include" });
  return readJson(res, invitationListResponseSchema);
}

/** Invites a person to the app with no project. Super Admin only. 409: already an account, or already Pending. */
export async function createInvitation(body: CreateInvitationRequest): Promise<InvitationResponse> {
  const res = await fetch(`${API_URL}${API_ROUTES.INVITATIONS}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return readJson(res, invitationResponseSchema);
}

/** Starts 14 more days for a Pending or Expired invitation. 409 for Accepted or Revoked. */
export async function resendInvitation(invitationId: string): Promise<InvitationResponse> {
  const res = await fetch(
    `${API_URL}${API_ROUTES.INVITATION_RESEND.replace(":id", encodeURIComponent(invitationId))}`,
    { method: "POST", credentials: "include" },
  );
  return readJson(res, invitationResponseSchema);
}
