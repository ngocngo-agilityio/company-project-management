# company-project-management

Company Board is an internal app to manage company projects. It is a pnpm + Turborepo monorepo.

| Path              | What                                       |
| ----------------- | ------------------------------------------ |
| `apps/backend`    | Fastify, Prisma 7, zod                     |
| `apps/web`        | React 19, Vite, Tailwind 4, TanStack Query |
| `packages/shared` | zod schemas and types shared by both apps  |
| `packages/ui`     | Shared UI components (empty for now)       |

The target design is in [docs/plan.md](docs/plan.md).

## 📋 Prerequisites

| Tool | Version          | How                                                               |
| ---- | ---------------- | ----------------------------------------------------------------- |
| Node | `.nvmrc`         | Install [nvm](https://github.com/nvm-sh/nvm), then run `nvm use`. |
| pnpm | `packageManager` | Run `corepack enable`. Use pnpm only.                             |

Docker is not needed yet: `pnpm dev` uses the Supabase database from `DATABASE_URL`.

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
```

## 🔐 Environment variables

Real values live only in the local `.env` file and in Render's Environment settings. Do not commit `.env`, and do not put secrets in this README.

| Variable               | Example                                         | Description                                             | Secret |
| ---------------------- | ----------------------------------------------- | ------------------------------------------------------- | ------ |
| `PORT`                 | `3000`                                          | Backend port                                            | No     |
| `HOST`                 | `127.0.0.1`                                     | Backend bind address                                    | No     |
| `DATABASE_URL`         | `postgresql://USER:PASSWORD@HOST:5432/postgres` | Supabase connection string (use the Session pooler URL) | Yes    |
| `GOOGLE_CLIENT_ID`     | `xxxx.apps.googleusercontent.com`               | OAuth client ID from Google Cloud                       | No     |
| `GOOGLE_CLIENT_SECRET` | `your-client-secret`                            | OAuth client secret from Google Cloud                   | Yes    |
| `GOOGLE_REDIRECT_URI`  | `http://localhost:3000/auth/google/callback`    | Differs between local and Render                        | No     |
| `WEB_ORIGIN`           | `https://web-name.onrender.com`                 | Web app address the API allows through CORS (backend)   | No     |
| `VITE_API_URL`         | `https://api-name.onrender.com`                 | API address the web build calls (empty = `/api` proxy)  | No     |

## 🎨 Design

Screens follow the Design canvas: https://claude.ai/artifact/4RdpWWAP1kveEi7S5zBYHG

If the link does not open, ask the project owner for view access. Name the frame you built from in the pull request.

## ✅ Pull requests

- Branch from `dev` and open the pull request against `dev`.
- Use conventional commits with a scope, for example `feat(api): add project list`.
- The template in [.github/pull_request_template.md](.github/pull_request_template.md) is filled in for every pull request. Its definition-of-done checklist must be complete before review: tests pass, no secret, screen matches the Design canvas, README updated.

## 🤖 CI

- [.github/workflows/ci.yml](.github/workflows/ci.yml) runs job `ci` on every pull request to `dev` and `main`: `pnpm lint`, `pnpm typecheck`, `pnpm test`.
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
