# Company Project Management (Company Board)

Internal app to manage company projects. pnpm + Turborepo monorepo.

| Path                                | What                                            |
| ----------------------------------- | ----------------------------------------------- |
| `apps/backend` (`@board/backend`)   | Fastify, Prisma 7, zod                          |
| `apps/web` (`@board/web`)           | React 19, Vite, Tailwind 4, TanStack Query      |
| `packages/shared` (`@board/shared`) | zod schemas and types shared by web and backend |
| `packages/ui` (`@board/ui`)         | Shared UI components and Storybook              |

## Read first

- Plan: [docs/plan.md](docs/plan.md)
- Technical Stack: [docs/technical-stack.md](docs/technical-stack.md)
- Roles and permissions table: [docs/permissions.md](docs/permissions.md)
- API conventions and proposed endpoints: [docs/api.md](docs/api.md)
- `docs/` describes the target; the Status column in the Technical Stack shows what exists.
- Conventions per area: `.claude/rules/`. Procedures: `.claude/skills/`.

## Commands

```bash
pnpm install              # install (Node from .nvmrc, pnpm only)
cp .env.example .env      # then fill real values locally
pnpm dev                  # web http://localhost:5173, backend http://127.0.0.1:3000
pnpm preview              # build, then serve production output (web :4173, backend :3000)
pnpm lint && pnpm typecheck && pnpm test
pnpm test:coverage        # unit-test coverage per package (report in <package>/coverage)
pnpm format               # prettier
```

## Skills (use them for these tasks)

- `add-api-route`: new API endpoint
- `add-prisma-migration`: any schema change
- `add-screen`: new web screen
- `write-tests`: unit, integration and e2e tests
- `review-pr`: review a pull request (read-only, never posts to GitHub)

## Rules

- Follow the Plan. If a request conflicts with it, say so before coding.
- web and backend never import each other; share code through `@board/shared`.
- Every route checks permissions on the server, using `docs/permissions.md`.
  Status codes: 401 not signed in, 403 role refuses, 404 for a project the person is not in.
- Migrations are additive only. Never run `prisma migrate reset` or `db push` (real Supabase DB).
- Use pnpm only. Dependency versions live in the `catalog:` of `pnpm-workspace.yaml`.
- Conventional commits with scope, e.g. `feat(api): add project list`.
- **Never commit or push unless the user asks.** Draft the commit message instead.

## Secrets

- Never read, print or commit `.env`. Variable names only: `PORT`, `HOST`, `DATABASE_URL`,
  `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`.
- Never put secret values in code, docs, tests or this file.
