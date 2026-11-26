---
paths:
  - "apps/**"
  - "packages/**"
---

# Structure and naming rules

One source of truth for folder layout, test placement and file names. Other rules point here.

## File and folder names

| What                                                    | Convention                                  | Example                              |
| ------------------------------------------------------- | ------------------------------------------- | ------------------------------------ |
| Component file and its folder                           | PascalCase                                  | `Button/Button.tsx`, `AppLayout.tsx` |
| Hook                                                    | camelCase, starts with `use`                | `useAuth.ts`                         |
| Everything else (utils, api, routes, services, plugins) | kebab-case                                  | `db-guard.ts`, `prisma-store.ts`     |
| Group folder                                            | kebab-case                                  | `routes/`, `user-settings/`          |
| Unit or integration test                                | `<source name>.test.ts(x)` in `__tests__/`  | `__tests__/db-guard.test.ts`         |
| Story (`packages/ui` only)                              | `<Component>.stories.tsx`, beside component | `Button/Button.stories.tsx`          |
| End-to-end test                                         | `apps/web/e2e/<flow>.e2e.ts`                | `e2e/sign-in.e2e.ts`                 |

Rule of thumb: a file that exports a component or a hook is named after its export; the rest is kebab-case.

## Tests

- Each folder that has source files gets its own `__tests__/` beside them. Imports go up one level
  (`../db-guard.js`). Never put tests in a shared top-level test folder.
- Stories are not tests: they stay beside the component, outside `__tests__/`.
- e2e files end in `.e2e.ts` so Vitest never picks them up. Exclude `e2e/**` in the web Vitest config
  and match `**/*.e2e.ts` in Playwright when it is installed.

## Layout

- `apps/web/src`: `pages/` (screens, one PascalCase file each), `components/`, `hooks/` (shared UI hooks),
  `api/` (fetch functions and TanStack Query hooks per resource), `lib/`. `main.tsx` and `routes.tsx` stay in `src/`.
  Create a folder when its first file arrives.
- `apps/backend/src`: `routes/` (thin: validate, check permission, call a service), `services/` (logic and
  Prisma, no separate repository layer), `plugins/` (cross-cutting Fastify plugins), `lib/` (helpers).
  `app.ts`, `env.ts`, `server.ts`, `seed.ts` stay in `src/`. Zod schemas come from `@board/shared`.
- `packages/ui/src/components/<Name>/`: `<Name>.tsx`, `<Name>.stories.tsx`, `__tests__/<Name>.test.tsx`.
  Shared helpers in `lib/`.
- `packages/shared/src`: one file per topic, exported from `src/index.ts`.

## Barrels

No `index.ts` per folder. The only barrels are `packages/ui/src/index.ts` and `packages/shared/src/index.ts`.
Inside an app, import the file directly (`components/Sidebar`).
