---
name: review-pr
description: Review a GitHub pull request against this project's rules and the Plan. Read-only; prints a report and never posts to GitHub. Use when the user says "review PR" or runs /review-pr.
---

# Review a pull request

Input: a PR number or URL. With none, review the current branch diff against `dev`.
Read-only: never checkout the PR branch, never post to GitHub.

## Steps

1. Read the PR: `gh pr view <n>`, `gh pr diff <n>`, `gh pr checks <n>`.
2. Delegate the code review to the `code-reviewer` agent. If the diff touches routes or
   screens, also run `permission-auditor`.
3. Check PR-level items (the agents do not cover these):
   - Scope matches one story in `docs/plan.md`, nothing unrelated mixed in
   - Title and commits are conventional with a scope; PR targets `dev`
   - Description follows `.github/pull_request_template.md` (story, verification, checklist)
   - Routes changed: `docs/api.md` and `docs/permissions.md` updated, role matrix tested
   - Migrations additive only; no secrets in the diff; dependencies added via `catalog:`
   - CI status from `gh pr checks`
4. Do not run lint, typecheck or test locally; rely on CI. Only suggest
   `pnpm lint && pnpm typecheck && pnpm test` if already on the PR branch.

## Report

- Findings as 🔴 blocker, 🟡 should fix, 🔵 nit, each with `file:line` and a one-line fix.
- One line for each area that is fine. No padding.
- End with a verdict: **Approve**, **Request changes** or **Comment**.

Post to GitHub (`gh pr review` or `gh pr comment`) only if the user explicitly asks.
