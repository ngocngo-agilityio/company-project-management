## What and why

<!-- One or two sentences. Name the one Delivery Plan task, e.g. S1-DEPLOY-01. -->

Task:

Done when (copy it from the task in the Delivery Plan):

Design frame (see the Design section in the README; skip if no screen changed):

## How it was verified

<!-- Commands run, screens opened, tests added. -->

## Definition of done

- [ ] `pnpm lint`, `pnpm typecheck` and `pnpm test` pass
- [ ] Tests cover the change, including each role in `docs/permissions.md` for routes
- [ ] Routes and permissions match `docs/api.md` and `docs/permissions.md` (updated if changed)
- [ ] Migrations only add (no drop, rename or type change)
- [ ] Screens have loading, empty, error and read-only states, and work from 375px
- [ ] Screens match the Design canvas (skip if no screen changed)
- [ ] README updated if setup steps changed; env var changes are in `.env.example` and the README table
- [ ] No secrets, no `.env` content
- [ ] Commit messages are conventional with a scope; PR targets `dev`
