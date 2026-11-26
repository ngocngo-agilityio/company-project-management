---
paths:
  - "**/*.test.ts"
  - "**/*.test.tsx"
  - "**/e2e/**"
---

# Testing rules

- Vitest for unit and integration; Playwright for end-to-end (not installed yet).
- Name files `<unit>.test.ts(x)` in a `__tests__/` folder beside the code, or `<flow>.e2e.ts` under
  `apps/web/e2e/` for Playwright. Layout and naming: `.claude/rules/structure.md`.
- Test behavior, not implementation. One clear assertion focus per test.
- Backend routes: build the app with `buildApp()` and use `app.inject()`. Cover success,
  invalid input, 401 and 403.
- Web: Testing Library, query by role or label. Cover loading, empty and error states.
- Do not mock `@board/shared` or zod. Mock only network and database boundaries.
- Tests never use real secrets or touch the real Supabase database.
