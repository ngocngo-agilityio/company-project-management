---
paths:
  - "apps/backend/**"
---

# Backend rules

- Fastify. Keep `buildApp()` in `src/app.ts` testable without listening on a port.
- Routes and permissions follow `docs/api.md` and `docs/permissions.md`. Update both when a route changes.
- Validate every input (body, params, query) with a zod schema from `@board/shared`. Refuse with 400.
- Status codes: 401 not signed in, 403 role refuses, 404 when the project is not the person's (never reveal it exists).
- POST, PATCH, DELETE check `Origin`. Sign-in and invitation routes are rate limited.
- Read env only through `src/env.ts`, never `process.env` elsewhere.
- Keep route handlers thin: parse input, check permission, call a service, return JSON.
- Organise `src/` by layer: `routes/`, `services/`, `plugins/`, `lib/`. See `.claude/rules/structure.md`.
- An archived project is read-only. Respect the invariants: last Owner, last Super Admin.
- Never import from `apps/web` or `@board/web`.
- Do not log secrets, tokens or personal data.
