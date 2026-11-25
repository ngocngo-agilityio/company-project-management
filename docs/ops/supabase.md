# Supabase database runbook (S1-BASE-03)

How the real database is set up and connected to Render. Done when migrations run on every
Render deploy and the first Super Admin row exists in Supabase.

Supabase free plan, region Mumbai. Supabase hosts PostgreSQL only: no Supabase Auth, Realtime or Data API.

## 1. Create the `prisma` role

In Supabase, open **SQL Editor** and run this once. Replace the password with a long random value
(letters and digits only, so it needs no URL encoding) and keep it in a password manager, never in the repository.

```sql
create user "prisma" with password '<strong-password>' bypassrls;
grant "prisma" to "postgres";

grant create on database postgres to prisma;
grant usage, create on schema public to prisma;
grant all on all tables in schema public to prisma;
grant all on all routines in schema public to prisma;
grant all on all sequences in schema public to prisma;
alter default privileges for role postgres in schema public grant all on tables to prisma;
alter default privileges for role postgres in schema public grant all on routines to prisma;
alter default privileges for role postgres in schema public grant all on sequences to prisma;
```

No `createdb`: it is only needed for the shadow database of `prisma migrate dev`, which never runs
against Supabase (`db:migrate` refuses a remote database).

`grant create on database postgres` is needed because the first migration starts with
`CREATE SCHEMA IF NOT EXISTS "public"`, and PostgreSQL checks the CREATE right on the database
before it sees that the schema exists. Without it `migrate deploy` fails with
`permission denied for database postgres` (42501).

### If a deploy already failed with that error

Run the grant above, then mark the failed migration as rolled back (nothing was applied: the
migration failed on its first statement), so the next deploy can retry it. In the SQL Editor:

```sql
update _prisma_migrations set rolled_back_at = now()
where finished_at is null and rolled_back_at is null;
```

This is what `prisma migrate resolve --rolled-back <migration>` does. Then redeploy on Render.

## 2. Turn the Data API off

**Project Settings → Data API** (in newer dashboards **Integrations → Data API**): turn it off.
The app only reaches the database through the backend, so the auto-generated REST API must not expose the tables.

## 3. Build the connection string (session pooler)

**Connect** button → **Session pooler** (port 5432). Copy it and swap the user for the `prisma` role:

```text
postgresql://prisma.<project-ref>:<strong-password>@aws-0-<region>.pooler.supabase.com:5432/postgres
```

- The user must be `prisma.<project-ref>` (the pooler needs the project ref after the dot).
- Use the session pooler, not the direct host (`db.<ref>.supabase.co` is IPv6 only and may not work from Render),
  and not the transaction pooler (port 6543), which breaks `migrate deploy`.
- If the password has special characters, URL-encode them.

## 4. Render settings

In the backend service, **Environment**:

| Name                | Value                                                       |
| ------------------- | ----------------------------------------------------------- |
| `DATABASE_URL`      | session pooler URL from step 3                              |
| `ALLOW_REMOTE_DB`   | `1` (lets `db:deploy` run against Supabase)                 |
| `SUPER_ADMIN_EMAIL` | first Super Admin's Google email                            |
| `COMPANY_TIMEZONE`  | IANA name, e.g. `Asia/Ho_Chi_Minh` (the default if not set) |

**Settings → Build Command**: keep the current command and append the migration:

```bash
<current build command> && pnpm db:deploy
```

`db:deploy` runs `prisma migrate deploy` through `tsx`, both devDependencies: do not set
`NODE_ENV=production` for the build or devDependencies are skipped. A failed migration fails the
build, so the old version keeps running.

## 5. Seed once from your machine

The seed creates the first Super Admin and the `company_setting` row. It is safe to repeat: existing rows are not changed.
Keep `.env` pointing at the local Docker database; give the Supabase values only to this shell.
Exported variables win over `.env`, and `read -s` keeps the password out of the shell history.

```bash
read -s "DATABASE_URL?Supabase session pooler URL: " && export DATABASE_URL
```

```bash
ALLOW_REMOTE_DB=1 SUPER_ADMIN_EMAIL=<admin-email> COMPANY_TIMEZONE=Asia/Ho_Chi_Minh pnpm db:seed
```

```bash
unset DATABASE_URL
```

Expected output: `Super Admin ready: …` and `Company time zone: Asia/Ho_Chi_Minh`.

## 6. Check

- Render build log: `prisma migrate deploy` lists the applied migrations, or "No pending migrations to apply".
- Supabase **Table Editor**: `user` has the Super Admin row with `is_super_admin = true`; `company_setting` has one row;
  `_prisma_migrations` lists every folder in `apps/backend/prisma/migrations`.
- `/health` on Render returns `{ "ok": true }`.

## Watch out

- The free project **pauses after a week without use** and has **no backups**. Restore it from the dashboard; export data by hand before risky changes.
- 500 MB storage limit on the free plan.
- Never run `prisma migrate reset`, `prisma db push` or `db:migrate` against Supabase.
