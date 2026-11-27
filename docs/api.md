# API

**Proposed design.** Built so far: Google sign-in, `GET /api/me`, `POST /auth/logout`, `GET /health`, the public pages, `GET` and `POST /api/projects` and `GET /api/people`; the rest is still a plan. From the [System Design](https://claude.ai/artifact/QJwARPSBjU8pdppsMZSpS9) page. Keep routes and permissions in line with [permissions.md](permissions.md). Update this file in the same PR that adds or changes a route.

## Conventions

- All responses are JSON. Routes live under `/api`, except auth, `/health` and the public pages `/about` and `/privacy` (HTML, no sign-in; Google asks for them on the consent screen).
- Input is validated with Zod (schemas in `@board/shared`).
- Status codes: `400` Zod refusal, body `{ error: "validation_error", message }` (the message names the field and the rule, never the value sent); `401` not signed in (exception: an unreadable body, such as bad JSON or an unsupported Content-Type, is refused by Fastify with `400` before the access hook runs, even with no session); `403` role refuses; `404` item not visible, including a resource in a project the person is not in.
- `POST`, `PATCH`, `DELETE` check the `Origin` header. Sign-in and invitation routes are rate limited.
- Session: a row in `session` and an HttpOnly cookie `sid` holding its id. It lasts 7 days from the last use and is extended when used. An expired or unknown session answers 401 and its row is deleted; there is no cleanup job.
- Rate limit: `/auth/google` and `/auth/google/callback` allow 10 requests a minute per client address; past that the browser is sent to `WEB_ORIGIN/login?error=rate_limited` (not raw JSON). `/auth/logout` has its own counter (30 a minute) and answers `429` JSON. `TRUST_PROXY=1` (Render) reads the client address from `X-Forwarded-For`; `0` locally.
- Cookie flags depend on `COOKIE_CROSS_SITE`. `1` (Render: web and API on different addresses): `Secure; SameSite=None`. `0` (local, one origin through the Vite proxy): `SameSite=Lax`, not Secure.
- Risk: with two addresses the cookie is third party. Safari and strict browser settings may block it, and sign-in then looks like it works but `/api/me` answers 401. Fix: serve web and API from one address (see Technical Stack).
- Sign-in (`GET /auth/google` then `/auth/google/callback`): Google scopes `openid email profile`, `state` and PKCE (S256). The email is trusted only when Google says it is verified. Invitation gate (S1-AUTH-02): the email is lowercased, then a person who is Inactive (`deactivated_at` set) is refused first. Otherwise only these get a session: the first Super Admin (`SUPER_ADMIN_EMAIL`; the `user` row is created at first sign-in), an email with a Pending invitation that has not expired, or a member of at least one project that is not archived. Every unexpired Pending invitation of the email is then set to Accepted and its membership created, in one database transaction; the session is created only after it. An email already linked to another Google account is refused. Otherwise the browser goes to `WEB_ORIGIN/login?error=<code>` with `not_invited`, `unverified_email`, `deactivated`, `access_denied` (the person pressed Cancel on Google), `rate_limited` (too many attempts, see below) or `oauth_failed` (any other failure) (no personal data in the URL). Success goes to `WEB_ORIGIN/`.
- `GET /api/me` answers `{ id, email, name, avatarUrl, isSuperAdmin }`, or 401 `{ error: "unauthorized" }`. `POST /auth/logout` (S1-SESS-01) deletes the row, clears the cookie with the same attributes it was set with and answers 204, also when there is no session. The `/auth/*` and `/api/me` answers carry `Cache-Control: no-store`, so Back cannot show an old signed-in answer. The web app clears its cache and goes to `/login` (replacing the history entry) on sign-out, and on any 401.
- `/auth/*` is limited to 10 requests a minute per address (429).
- `POST /api/projects` (S1-PROJ-01, SA): body `{ name, ownerId }`. `name` is trimmed, 1 to 100 characters (code points: an emoji counts as 1), not unique. `ownerId` is the uuid of a person who exists and is not deactivated, otherwise `400`. In one database transaction it creates the project, its first board `Main board` with the lists `To do`, `In progress`, `Done` (positions 1, 2, 3; only `Done` is Finished) and the Owner membership of `ownerId`. The Super Admin is not made a member (they count as Owner everywhere); they can pick themselves. Answers `201 { id, name, createdAt, board: { id, name, lists: [{ id, name, position, isFinished }] }, owner: { userId, role: "OWNER" } }`. A non-Super Admin gets `403` before the body is read.
- `GET /api/projects` (S1-PROJ-01, S): answers `{ projects: [{ id, name, archivedAt, createdAt, role }] }` sorted by name, archived projects included (`archivedAt` set), no paging. A person sees only the projects they belong to, with their membership role; the Super Admin sees all, with `role: "SUPER_ADMIN"`. A person with no project gets `{ projects: [] }`.
- `GET /api/people` (SA): answers `{ people: [{ id, email, name, avatarUrl, isSuperAdmin, deactivatedAt }] }` sorted by name; never the Google account id. `?status=active` leaves out deactivated people (for the Owner picker); `status` is `active` or `all` (default `all`), anything else is `400`.
- `POST /api/test/login` (E2E only): exists only when the backend runs with `E2E=1`, for browser end-to-end tests; otherwise the path answers 404 and is not in the route table. Body `{ email, name?, isSuperAdmin? }`. Signs in an existing person and sets the session cookie, answers `200` with the same shape as `/api/me`. An email with no row is created only with `isSuperAdmin: true`; any other unknown email is `404`, a deactivated person `403`, invalid input `400`. It is not in the endpoints table because it is not part of the product. The server refuses to start with `E2E=1` when `NODE_ENV=production`, when `RENDER` is set, or when `DATABASE_URL` is not on this machine (`ALLOW_REMOTE_DB` does not lift this). Not under `/auth/*`, so the sign-in rate limit does not count it.
- Who: **S** signed in, **A** anyone, **AM** any member of the project, **M+** Member or above, **O+** Owner or Super Admin, **SA** Super Admin.

## Endpoints

| Group         | Route                                                                                            | Who                         |
| ------------- | ------------------------------------------------------------------------------------------------ | --------------------------- |
| Auth          | `GET /auth/google`, `GET /auth/google/callback`                                                  | A                           |
|               | `POST /auth/logout`, `GET /api/me`                                                               | S                           |
|               | `GET /health`                                                                                    | A                           |
|               | `GET /about`, `GET /privacy` (public HTML pages)                                                 | A                           |
| Projects      | `GET /api/projects`                                                                              | S                           |
|               | `POST /api/projects`, `PATCH /api/projects/:id`                                                  | SA                          |
|               | `GET /api/projects/:id/members`                                                                  | AM                          |
|               | `PATCH /api/projects/:id/members/:userId`                                                        | O+                          |
|               | `DELETE /api/projects/:id/members/:userId`                                                       | O+ or self (`member:leave`) |
| People        | `GET /api/people`, `POST /api/people/:id/deactivate`                                             | SA                          |
| Invitations   | `GET`, `POST /api/projects/:id/invitations`                                                      | O+                          |
|               | `POST /api/invitations/:id/resend`, `POST /api/invitations/:id/revoke`                           | O+                          |
|               | `POST /api/invitations/super-admin`                                                              | SA                          |
| Boards, lists | `GET /api/projects/:id/boards`                                                                   | AM                          |
|               | `POST /api/projects/:id/boards`, `POST /api/boards/:id/lists`                                    | O+                          |
|               | `GET /api/boards/:id` (the polling call)                                                         | AM                          |
|               | `PATCH /api/lists/:id`, `PATCH /api/boards/:id` (rename, reorder)                                | O+                          |
| Cards         | `POST /api/lists/:id/cards`, `PATCH /api/cards/:id`                                              | M+                          |
|               | `POST /api/cards/:id/move`, `POST /api/cards/:id/checklist`                                      | M+                          |
|               | `PATCH`, `DELETE /api/checklist-items/:id` (tick, edit, remove a step)                           | M+                          |
|               | `GET /api/cards/:id`, `GET /api/cards/:id/activity`, `GET /api/projects/:id/labels`              | AM                          |
|               | `PATCH /api/labels/:id`                                                                          | O+                          |
| Comments      | `POST /api/cards/:id/comments`                                                                   | M+                          |
|               | `PATCH`, `DELETE /api/comments/:id`                                                              | author; delete also O+      |
| Search        | `GET /api/boards/:id/cards?q=&assignee=&label=&priority=&due=`                                   | AM                          |
|               | `GET /api/me/cards`                                                                              | S                           |
| Notifications | `GET /api/notifications`, `POST /api/notifications/:id/read`, `POST /api/notifications/read-all` | S                           |
| Archive       | `POST /api/cards/:id/archive`, `POST /api/cards/:id/restore`                                     | M+                          |
|               | `POST /api/lists/:id/archive`, `POST /api/boards/:id/archive`, and `restore` for each            | O+                          |
|               | `POST /api/projects/:id/archive`, `POST /api/projects/:id/restore`                               | SA                          |
|               | `DELETE /api/cards/:id` (archived only)                                                          | O+                          |
|               | `DELETE /api/lists/:id`, `/api/boards/:id`, `/api/projects/:id` (archived only, asks the name)   | SA                          |
| System        | `GET /api/system-log`                                                                            | SA                          |

## Data model (summary)

- Tables: `user`, `session`, `project`, `membership`, `invitation`, `board`, `list`, `card`, `card_assignee`, `label`, `card_label`, `checklist_item`, `comment`, `activity`, `notification`, `deletion_log`, `company_setting`. Singular snake_case, uuid ids (except `company_setting`: one row, `id = 1`, holds install settings such as the company time zone).
- Timestamps: `created_at`, `archived_at`, `expires_at`, `read_at`, `edited_at`.
- `position` is a decimal on `board`, `list`, `card`, `checklist_item`. `list.is_finished` marks Finished lists.
- Archive is `archived_at`. Permanent delete only for archived items and writes a `deletion_log` row. Comments are hard-deleted. `activity` is append-only.
- `card.title` text(200). `invitation.status`: Pending, Accepted, Expired, Revoked. `notification.type`: assigned, mentioned, added.
