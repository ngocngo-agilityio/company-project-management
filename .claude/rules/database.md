---
paths:
  - "apps/backend/prisma/**"
  - "packages/db/**"
---

# Database rules

- Prisma 7, PostgreSQL on Supabase. The database is real, not disposable.
- Migrations are additive only: new tables, new nullable or defaulted columns, new indexes.
- Never DROP, RENAME or change a column type in one step. Use expand, then contract, in
  separate migrations after the code stops using the old column.
- Never run `prisma migrate reset` or `prisma db push`.
- Local: Docker Postgres (`docker compose up -d --wait`), then `pnpm db:migrate`, `pnpm db:seed`.
  Render: `prisma migrate deploy`. `db:*` scripts refuse a non-local `DATABASE_URL`; `ALLOW_REMOTE_DB=1` lifts this for `db:deploy`/`db:seed`, never `db:migrate`.
- A partial unique index (e.g. one Pending invitation per project and email) is written by hand
  in the migration SQL before it is applied, and listed in `src/migrations.test.ts`. `migrate dev` will add
  a `DROP INDEX` for it to the next migration: delete that line by hand.
- Models are PascalCase in Prisma, mapped to singular snake_case tables and columns
  (`@@map`, `@map`). Ids are uuid. Timestamps: `created_at`, `archived_at`, `expires_at`.
- Order with a decimal `position` (a card between 1 and 2 gets 1.5; a move updates one row).
- Archive with `archived_at`. Permanent delete only for archived items and write a
  `deletion_log` row. `activity` is append-only; comments are hard-deleted.
- The generated client in `src/generated` is gitignored. Run `pnpm --filter @board/backend generate`.
- Data model summary: `docs/api.md`. Prisma moves to `packages/db` later.
