---
name: write-tests
description: Write tests for new or changed code with Vitest (unit, integration) and Playwright (end-to-end). Use whenever code is added or changed.
---

# Write tests

Follow `.claude/rules/testing.md`.

## Checklist

1. Pick the level:
   - Pure logic, schemas, services: Vitest unit test.
   - Backend route: Vitest with `buildApp()` and `app.inject()`.
   - React component or screen: Vitest with jsdom and Testing Library.
   - A user flow across web and backend: Playwright (see below).
2. Put the file in the `__tests__/` folder beside the code as `<unit>.test.ts(x)`
   (see `.claude/rules/structure.md`). Run it:
   ```bash
   pnpm --filter @board/backend test
   pnpm --filter @board/web test
   ```
3. Cover the happy path, invalid input, permission failure (401/403/404) and empty or error
   states. For a route, test each role in `docs/permissions.md`; an Observer write is refused.
   Unit-test the rules in `docs/plan.md` (invitation states, card order, Finished lists).
4. Query the UI by role or label, not by CSS class.
5. Mock only boundaries (network, database). Never mock zod or `@board/shared`.
6. Never use real secrets or the real Supabase database in tests.
7. Run `pnpm test` for the whole repo before finishing. Run `pnpm test:coverage` to check that the new code is exercised.

## Playwright

Installed in `apps/web`. Run everything with `pnpm e2e` (needs `docker compose up -d --wait`; it prepares the `board_e2e`
database and starts the backend and Vite). Specs live in `apps/web/e2e/` as `<flow>.e2e.ts`.

- **Mocked spec** (default): mock the API with `page.route`; see `sign-in.e2e.ts`. It runs at 360, 768 and 1024 px wide.
- **Real spec**: put `@real` in the test title; see `projects.e2e.ts`. It runs once at 1024 px against the real backend.
  Sign in with `page.request.post("/api/test/login", { data: { email, isSuperAdmin: true } })` (the route exists only with
  `E2E=1`; the server refuses `E2E=1` in production, on Render and with a database that is not local). Give each test its
  own random email and names, and only assert on data it created, so tests can run in parallel.
- Use a mocked spec for states the real backend cannot produce easily (errors, slow answers, empty lists).
- Under 900 px the sidebar is a drawer: open "Open menu" before using it.
- Both run in CI (job `e2e`) and in the pre-push hook.
