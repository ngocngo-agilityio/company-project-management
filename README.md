# company-project-management

Company Board is an internal app to manage company projects. It is a pnpm + Turborepo monorepo.

| Path              | What                                       |
| ----------------- | ------------------------------------------ |
| `apps/backend`    | Fastify, Prisma 7, zod                     |
| `apps/web`        | React 19, Vite, Tailwind 4, TanStack Query |
| `packages/shared` | zod schemas and types shared by both apps  |
| `packages/ui`     | Shared UI components (empty for now)       |

The target design is in [docs/plan.md](docs/plan.md). More docs:

- [docs/technical-stack.md](docs/technical-stack.md): stack and what exists today (Status column)
- [docs/permissions.md](docs/permissions.md): roles and permissions
- [docs/api.md](docs/api.md): API conventions and proposed endpoints
- [CLAUDE.md](CLAUDE.md): rules for working with Claude Code in this repo

## 📋 Prerequisites

| Tool | Version          | How                                                               |
| ---- | ---------------- | ----------------------------------------------------------------- |
| Node | `.nvmrc`         | Install [nvm](https://github.com/nvm-sh/nvm), then run `nvm use`. |
| pnpm | `packageManager` | Run `corepack enable`. Use pnpm only.                             |

Docker is needed only for the local database (`docker compose up -d --wait`). `pnpm dev` itself uses whatever `DATABASE_URL` points at.

Git hooks (husky) are installed automatically by `pnpm install`. On commit, `lint-staged` formats and lints staged files, and `commitlint` rejects messages that are not conventional commits. Do not bypass them with `--no-verify`.

## 🔧 Run locally

```bash
nvm use
corepack enable
pnpm install
cp .env.example .env   # then fill in real values in .env
pnpm dev
```

- The web app runs at `http://localhost:5173`. Requests to `/api` are proxied to the backend.
- The backend runs at `http://127.0.0.1:3000` by default. Its health check is at `/health`.

Other commands:

```bash
pnpm lint && pnpm typecheck && pnpm test   # all checks
pnpm format                                # prettier
pnpm build                                 # build all packages
pnpm preview                               # build, then serve production output
```

`pnpm preview` serves the web build at `http://localhost:4173` and the backend at `http://127.0.0.1:3000`. The preview server has no `/api` proxy, so for the web app to reach the backend set `VITE_API_URL=http://127.0.0.1:3000` (before the build) and `WEB_ORIGIN=http://localhost:4173` in `.env`.

Database (local Postgres in Docker):

```bash
docker compose up -d --wait   # start Postgres on 127.0.0.1:5432 (set DB_PORT to change)
# in .env: DATABASE_URL=postgresql://board:board_local_dev@127.0.0.1:5432/board  and  SUPER_ADMIN_EMAIL=you@example.com
pnpm db:migrate               # prisma migrate dev (create and apply migrations)
pnpm db:deploy                # prisma migrate deploy (apply existing migrations only)
pnpm db:seed                  # create the first Super Admin (safe to repeat)
```

`db:*` scripts refuse a non-local `DATABASE_URL`; `ALLOW_REMOTE_DB=1` lifts this for `db:deploy` and `db:seed` only, never `db:migrate`. Migrations are additive only. Never run `prisma migrate reset` or `db push`; a hook blocks them, and Supabase is the real database.

## 🔐 Environment variables

Real values live only in the local `.env` file and in Render's Environment settings. Do not commit `.env`, and do not put secrets in this README.

| Variable               | Example                                         | Description                                                            | Secret |
| ---------------------- | ----------------------------------------------- | ---------------------------------------------------------------------- | ------ |
| `PORT`                 | `3000`                                          | Backend port                                                           | No     |
| `HOST`                 | `127.0.0.1`                                     | Backend bind address                                                   | No     |
| `DATABASE_URL`         | `postgresql://USER:PASSWORD@HOST:5432/postgres` | Supabase connection string (use the Session pooler URL)                | Yes    |
| `GOOGLE_CLIENT_ID`     | `xxxx.apps.googleusercontent.com`               | OAuth client ID from Google Cloud                                      | No     |
| `GOOGLE_CLIENT_SECRET` | `your-client-secret`                            | OAuth client secret from Google Cloud                                  | Yes    |
| `GOOGLE_REDIRECT_URI`  | `http://localhost:3000/auth/google/callback`    | Differs between local and Render                                       | No     |
| `WEB_ORIGIN`           | `https://web-name.onrender.com`                 | Web app address the API allows through CORS (backend). Empty = no CORS | No     |
| `SUPER_ADMIN_EMAIL`    | `you@example.com`                               | Email of the first Super Admin created by `pnpm db:seed` (lowercased)  | No     |
| `SUPER_ADMIN_NAME`     | `Ada Admin`                                     | Optional display name for that user (default: part before `@`)         | No     |
| `ALLOW_REMOTE_DB`      | `1`                                             | Lets `db:deploy`/`db:seed` run on a non-local database. Leave empty    | No     |
| `VITE_API_URL`         | `https://api-name.onrender.com`                 | API address the web build calls (empty = `/api` proxy)                 | No     |

`DATABASE_URL` is optional for now (validated only when set). The backend does not read the `GOOGLE_*` variables yet; sign-in arrives in S1-AUTH-01.

## 🔑 Google sign-in on Render

Redirect URI on Render: `https://company-project-management-mmqg.onrender.com/auth/google/callback` (the backend serves the callback; keep the localhost URI too). The consent screen is External with only the `openid`, `email` and `profile` scopes and no logo. Google needs a homepage and a privacy policy to publish it; the backend serves them at `/about` and `/privacy`.

Result of the second-account check: pending (see the Result table). If Google refuses, keep Testing mode and add test users by hand (**Audience → Test users**; only listed users can sign in, refresh tokens expire after 7 days). Steps and fallback: [docs/ops/google-oauth.md](docs/ops/google-oauth.md).

## 🎨 Design

Screens follow the Design canvas: https://claude.ai/artifact/4RdpWWAP1kveEi7S5zBYHG

If the link does not open, ask the project owner for view access. Name the frame you built from in the pull request.

## ✅ Pull requests

- Branch from `dev` and open the pull request against `dev`.
- Use conventional commits with a scope, for example `feat(api): add project list`.
- The template in [.github/pull_request_template.md](.github/pull_request_template.md) is filled in for every pull request. Its definition-of-done checklist must be complete before review: tests pass, no secret, screen matches the Design canvas, README updated.

## 🤖 CI

- [.github/workflows/ci.yml](.github/workflows/ci.yml) runs job `ci` on every pull request to `dev` and `main`: `pnpm lint`, `pnpm typecheck`, `pnpm test`. Browser (Playwright) tests are not part of CI yet.
- `ci` is a required check on `dev` and `main` (repository ruleset). A failing check blocks the merge. Keep the job name `ci`, or update the ruleset when renaming it.
- [.github/dependabot.yml](.github/dependabot.yml) opens weekly pull requests for npm and GitHub Actions updates.

## 🏗️ Infrastructure

| Service               | Region              | Project name                 | Owner    |
| --------------------- | ------------------- | ---------------------------- | -------- |
| Render                | Singapore           | `company-project-management` | Personal |
| Supabase (PostgreSQL) | South Asia (Mumbai) | `company-project-management` | Personal |
| Google Cloud (OAuth)  | —                   | `company-project-management` | Personal |

## 🌐 URLs

| Component | URL                                                  |
| --------- | ---------------------------------------------------- |
| Backend   | https://company-project-management-mmqg.onrender.com |
| Web       | https://company-project-management-web.onrender.com  |

Quick check after a deploy: open `<backend URL>/health`; it should return `{"ok":true}`. Render's free plan sleeps after 15 minutes idle, so the first request can take a while.
