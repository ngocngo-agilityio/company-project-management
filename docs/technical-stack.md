# Technical Stack

Target architecture from the [Technical Stack](https://claude.ai/artifact/HxR9o25LPiEY2WKcAxfhCV) page. Status shows what the repository has today: **Done** (in the repo), **Planned** (not yet, with the story that adds it). Versions are pinned in the `catalog:` of `pnpm-workspace.yaml`.

## Stack

| Area            | Choice                                                                                           | Status                                                                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Language        | TypeScript (strict)                                                                              | Done                                                                                                                                   |
| Monorepo        | pnpm workspaces + Turborepo, Node 22 LTS                                                         | Done                                                                                                                                   |
| Web app         | React 19, Vite, Tailwind 4, Radix UI, TanStack Query                                             | Done (skeleton)                                                                                                                        |
| Routing         | React Router                                                                                     | Done (`/login`, private routes behind `RequireAuth`)                                                                                   |
| Backend         | Fastify; serves the built web app and the REST API                                               | Done (health, Google sign-in and session, projects, people)                                                                            |
| Database        | PostgreSQL on Supabase via Prisma 7 (session pooler, `prisma` role, Data API off)                | Core schema + `company_setting`; Render runs `db:deploy` on every deploy; runbook [docs/ops/supabase.md](ops/supabase.md) (S1-BASE-03) |
| Local database  | Docker Compose Postgres, scripts `db:migrate`, `db:seed`                                         | Compose, schema, migration, seed written (S1-BASE-02)                                                                                  |
| Sign-in         | `@fastify/oauth2` + Google; session rows; same-origin HttpOnly cookie                            | Built (S1-AUTH-01, S1-AUTH-02, S1-AUTH-03): Google sign-in, invitation gate, `session` rows, `GET /api/me`, logout, sign-in screen     |
| Validation      | Zod, one schema shared by forms and API                                                          | Done (`@board/shared`)                                                                                                                 |
| Drag and drop   | dnd-kit (mouse, pen); Move to... on touch                                                        | Planned (S3)                                                                                                                           |
| Unit tests      | Vitest (+ jsdom, Testing Library on web)                                                         | Done                                                                                                                                   |
| Browser tests   | Playwright at phone and computer sizes, API mocked with `page.route`                             | Done in `apps/web/e2e` (sign-in); not in CI yet                                                                                        |
| Components      | Storybook with the accessibility add-on                                                          | Done (S1-STORY-01)                                                                                                                     |
| Lint and format | ESLint 10, Prettier, husky, lint-staged, commitlint                                              | Done                                                                                                                                   |
| CI/CD           | GitHub Actions (lint, typecheck, unit, Storybook build and a11y, Playwright), Render auto-deploy | CI Done (no Playwright yet); Render Done                                                                                               |
| Dependencies    | Dependabot, weekly                                                                               | Done                                                                                                                                   |
| Hosting         | Render free web service (Singapore), Supabase free (Mumbai)                                      | Done                                                                                                                                   |
| Background jobs | `apps/worker` with pg-boss                                                                       | Later (not in M1-M4)                                                                                                                   |

## Monorepo

| Package           | Holds                                                         | Rule                                      | Status                                                       |
| ----------------- | ------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------ |
| `apps/web`        | Screens and feature components                                | Talks to the backend only through the API | Done                                                         |
| `apps/backend`    | Fastify API, sign-in, sessions, permission checks, serves web | Only place that talks to the database     | Done                                                         |
| `packages/shared` | Zod schemas, roles and permissions, card ordering             | No framework inside                       | Done (health and sign-in schemas)                            |
| `packages/ui`     | Design tokens and basic components, one story each            | Mirrors the Company Board Design System   | Tokens, 9 components (incl. Alert, Skeleton), one story each |
| `packages/db`     | Prisma schema, migrations, client                             | Only `apps/backend` imports it            | Planned. Today Prisma lives in `apps/backend/prisma`         |
| `packages/config` | Shared TypeScript and ESLint settings                         | One place to change the rules             | Planned                                                      |

## Design tokens

Source: the design canvas (`project/ds/company-board/tokens.json`). In the repo: `packages/ui/src/tokens.css` (CSS variables and Tailwind `@theme`). Use tokens by name, never raw values.

- **Colour** (light and dark values): `bg`, `surface`, `surface-2`, `tile`, `board`, `ink`, `ink-muted`, `line`, `accent`, `on-accent`, `accent-soft`, `danger`, `warning`, `success` (each with `-soft`), `inverse`, `scrim`, `label-{red,orange,yellow,green,blue,purple}`, `avatar-1..6`. Light `accent` #4338ca, dark #8e9bff. Dark theme changes tokens, not layout.
- **Type:** Figtree (body), Sora (display). Styles: heading-auth 25/31 (sign-in card), heading-1 24/30, heading-2 18, heading-3 15, body 15/22.5, card-title 14.5, button 14, body-small 13, caption 12.
- **Sizes:** `control-h` 44 (36 from 900px up), `sidebar-w` 252, `drawer-w` 272, `list-w` 296, `page-max` 1280, `dialog-max` 760, `dialog-sm` 460. Drawer breakpoint 900px. Touch targets at least 44px.
- Colour is never the only signal for danger.

## Security and operations

- HTTPS; same-origin HttpOnly, Secure, SameSite cookie; no CORS. Today web and API run as two Render services, so the API allows exactly one web origin through CORS (`WEB_ORIGIN`, `credentials: true`) until they share one address.
- Every route checks the role on the server. Observer writes are refused.
- Rate limit on sign-in and invitation routes; `Origin` checked on POST, PATCH, DELETE.
- Secrets only in Render and GitHub settings, never in the repository. See `.env.example` for names.
- Migration runs on every deploy (`prisma migrate deploy`). `/health` is checked by Render.
- Free-plan limits: Render sleeps after 15 minutes idle; Supabase pauses after a week, has no backups, 500 MB.
- Storybook: in `packages/ui` (`pnpm --filter @board/ui storybook`). Run `pnpm --filter @board/ui exec playwright install chromium` once before `pnpm test:a11y`. Playwright e2e: `pnpm --filter @board/web test:e2e` (run `pnpm --filter @board/web exec playwright install chromium` once; the API is mocked, not run in CI yet).
