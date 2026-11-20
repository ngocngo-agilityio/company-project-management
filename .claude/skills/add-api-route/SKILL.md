---
name: add-api-route
description: Add a new backend API route with zod input validation, a server-side permission check and tests. Use for any new or changed endpoint in apps/backend.
---

# Add an API route

Follow `.claude/rules/backend.md` and `.claude/rules/security.md`.

## Checklist

1. Read the story in `docs/plan.md`, find the route in `docs/api.md` and the permission
   in `docs/permissions.md`. If either is missing, add it there and tell the user.
2. Define zod schemas (input and response) in `packages/shared/src`, export them from
   `index.ts`, then run `pnpm --filter @board/shared build`.
3. Add the route in `apps/backend/src`. Keep the handler thin:
   parse with the schema, check the permission, call a service, return the typed response.
4. Check the permission on the server: 401 not signed in, 403 role refuses, 404 when the
   project is not the person's. Never rely on the UI to hide the action.
5. Write tests with `buildApp()` and `app.inject()`, one case per caller:
   Super Admin, Owner, Member, Observer (each as the permissions table says), a person
   outside the project (404), not signed in (401), plus invalid input (400).
   An Observer's write must be refused.
6. Run `pnpm lint && pnpm typecheck && pnpm test`. Fix everything before finishing.

## Do not

- Read `process.env` directly (use `src/env.ts`).
- Duplicate a schema in web or backend.
- Skip the role matrix tests.

Auth code does not exist yet: until it does, write the permission check against the
planned interface and note it in the PR description.
