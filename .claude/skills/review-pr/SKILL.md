---
name: review-pr
description: Review a GitHub pull request against this project's rules and the Plan. Read-only; prints a report and never posts to GitHub. Use when the user says "review PR" or runs /review-pr.
---

# Review a pull request

Input: a PR number or URL. With none, review the current branch diff against `dev`
(`git diff dev...HEAD`) and skip the PR-only checks (title, description, CI).
Read-only: never checkout the PR branch, never post to GitHub.

## Steps

1. Read the PR: `gh pr view <n>`, `gh pr diff <n>`, `gh pr checks <n>`.
   Then `git fetch origin pull/<n>/head` (no checkout) so whole files can be read with
   `git show FETCH_HEAD:<path>`. Note the list of changed files.
2. Run the agents **in parallel**, giving each the PR number, the full diff and the changed-file list.
   The agents must review that diff, not the local tree.
   - `code-reviewer`: always.
   - `permission-auditor`: only if the diff touches routes (`apps/backend/src`) or screens (`apps/web/src`).
     Merge duplicate findings into one and note which agent reported it.
3. Check PR-level items (the agents do not cover these):
   - Scope matches the one Delivery Plan task named in the PR (e.g. S1-DEPLOY-01): the diff does what
     its "Done when" says, nothing unrelated mixed in. The task list lives in the Delivery Plan
     artifact (linked in `docs/plan.md`), which this skill cannot read, so take "Done when" from the
     PR description. No task ID or no "Done when" there is 🟡.
   - Title and commits are conventional with a scope; PR targets `dev`
   - Description follows `.github/pull_request_template.md` (task, done when, verification, checklist)
   - Routes changed: `docs/api.md` and `docs/permissions.md` updated, role matrix tested
   - Migrations additive only; no secrets in the diff; dependencies added via `catalog:`
   - CI status from `gh pr checks`
4. Do not run lint, typecheck or test locally; rely on CI. Only suggest
   `pnpm lint && pnpm typecheck && pnpm test` if already on the PR branch.

## Report

- Findings as 🔴 blocker, 🟡 should fix, 🔵 nit. Each has `file:line`, the quoted code, the rule it
  breaks, and a one-line fix. Drop any finding without these.
- Questions for the author: doubts the agents could not verify.
- One line for each area that is fine. No padding.
- End with a verdict, by this rule:

| Situation                      | Verdict                                    |
| ------------------------------ | ------------------------------------------ |
| Any 🔴 blocker                 | **Request changes**                        |
| Only 🟡 or 🔵 findings         | **Comment**                                |
| No findings                    | **Approve**                                |
| CI pending, failing or missing | never **Approve**; write "CI not verified" |

Post to GitHub (`gh pr review` or `gh pr comment`) only if the user explicitly asks.
