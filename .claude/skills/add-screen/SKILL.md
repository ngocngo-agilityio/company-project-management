---
name: add-screen
description: Add a new web screen using Design System tokens, responsive layout and loading, empty and error states. Use for any new page or view in apps/web.
---

# Add a screen

Follow `.claude/rules/web.md`.

## Checklist

1. Read the story in `docs/plan.md`. Check `docs/permissions.md`: which roles may see it?
2. Use Design System tokens by name (Tailwind `@theme`, list in `docs/technical-stack.md`).
   No hardcoded colors, spacing or font sizes. Tokens are not in the repo yet: add the
   missing token first, then use it.
3. Put reusable pieces in `packages/ui`; keep screen-only code in `apps/web/src`.
4. Fetch data with TanStack Query and render all four states
   (Observers also get a read-only screen with no edit controls):
   - loading (skeleton or spinner)
   - empty (message and next action)
   - error (message and retry)
   - success
5. Make it responsive from 375px wide up (drawer under 900px, touch targets at least 44px,
   Move to... instead of drag on touch). Check at 375, 768 and 1280.
6. Make it accessible: semantic elements, labels, keyboard focus, visible focus ring.
7. Hiding controls by role is only UX; the backend must enforce the permission.
8. Write tests (see `write-tests`): loading, empty, error and success.
9. Run `pnpm lint && pnpm typecheck && pnpm test`. Open the screen in the browser.

Storybook is not used yet. Add a story only after it is set up for `@board/ui`.
