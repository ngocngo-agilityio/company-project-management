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

## Playwright (not installed yet)

When the first e2e story arrives, add Playwright to the `catalog:`, put specs in
`apps/web/e2e/` as `<flow>.e2e.ts` (exclude `e2e/**` in the web Vitest config), and update this skill and `docs/technical-stack.md`. Run main flows at phone,
tablet and computer sizes. Google sign-in cannot run in CI: use a test-only login route
behind `E2E=1`, and add a check that it is off on Render.
