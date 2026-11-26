# API

**Proposed design, nothing built yet.** From the [System Design](https://claude.ai/artifact/QJwARPSBjU8pdppsMZSpS9) page. Keep routes and permissions in line with [permissions.md](permissions.md). Update this file in the same PR that adds or changes a route.

## Conventions

- All responses are JSON. Routes live under `/api`, except auth, `/health` and the public pages `/about` and `/privacy` (HTML, no sign-in; Google asks for them on the consent screen).
- Input is validated with Zod (schemas in `@board/shared`).
- Status codes: `400` Zod refusal with a clear message; `401` not signed in; `403` role refuses; `404` item not visible, including a resource in a project the person is not in.
- `POST`, `PATCH`, `DELETE` check the `Origin` header. Sign-in and invitation routes are rate limited.
- Session: a row in `session` and an HttpOnly cookie `sid` holding its id. It lasts 7 days from the last use and is extended when used. An expired or unknown session answers 401 and its row is deleted; there is no cleanup job.
- Cookie flags depend on `COOKIE_CROSS_SITE`. `1` (Render: web and API on different addresses): `Secure; SameSite=None`. `0` (local, one origin through the Vite proxy): `SameSite=Lax`, not Secure.
- Risk: with two addresses the cookie is third party. Safari and strict browser settings may block it, and sign-in then looks like it works but `/api/me` answers 401. Fix: serve web and API from one address (see Technical Stack).
- Sign-in (`GET /auth/google` then `/auth/google/callback`): Google scopes `openid email profile`, `state` and PKCE (S256). The email is trusted only when Google says it is verified. Only a person who already has a `user` row, or the same Google account id, gets a session. Otherwise the browser goes to `WEB_ORIGIN/login?error=<code>` with `not_invited`, `unverified_email`, `deactivated`, `access_denied` (the person pressed Cancel on Google) or `oauth_failed` (any other failure) (no personal data in the URL). Success goes to `WEB_ORIGIN/`.
- `GET /api/me` answers `{ id, email, name, avatarUrl, isSuperAdmin }`, or 401 `{ error: "unauthorized" }`. `POST /auth/logout` deletes the row, clears the cookie and answers 204.
- `/auth/*` is limited to 10 requests a minute per address (429).
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
