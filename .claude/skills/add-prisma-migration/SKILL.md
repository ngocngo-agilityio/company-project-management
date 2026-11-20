---
name: add-prisma-migration
description: Change the Prisma schema with an additive-only migration. Use for any new model, column or index in apps/backend/prisma.
---

# Add a Prisma migration (additive only)

Follow `.claude/rules/database.md`. The database is the real Supabase instance.

## Checklist

1. Confirm the change is additive: new table, new nullable or defaulted column, new index.
2. If you need to remove, rename or retype something, stop. Split it into expand now and
   contract later (separate migrations, after the code no longer uses the old shape).
3. Edit `apps/backend/prisma/schema.prisma`. Models are PascalCase, mapped to singular
   snake_case tables and columns (`@@map`, `@map`), uuid ids, `created_at`. Archive with
   `archived_at`; use a decimal `position` for ordering. See `.claude/rules/database.md`.
4. Create the migration locally:
   ```bash
   pnpm --filter @board/backend exec prisma migrate dev --name <short_snake_name>
   ```
5. Read the generated SQL. It must contain no `DROP`, `RENAME` or `ALTER ... TYPE`.
6. Regenerate the client: `pnpm --filter @board/backend generate`.
7. Update zod schemas in `@board/shared` if the shape is exposed, and add or adjust tests.
8. Run `pnpm lint && pnpm typecheck && pnpm test`.

## Never

- `prisma migrate reset` or `prisma db push` (a hook blocks them).
- Edit a migration that has already been applied.
- Commit `.env` or connection strings. Render runs `prisma migrate deploy`.
