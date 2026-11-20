# Security rules

- Never read, print, log or commit `.env` or any secret value. `.env.example` has names only.
- Authorization is enforced on the server for every route, from `docs/permissions.md`.
- Validate all external input with zod before using it.
- Do not return stack traces or internal errors to clients.
- Do not log tokens, passwords or personal data.
- Add dependencies only when needed, through the `catalog:` in `pnpm-workspace.yaml`.
- Never disable husky, lint or type checks (`--no-verify`) to get a change through.
