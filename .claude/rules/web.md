---
paths:
  - "apps/web/**"
  - "packages/ui/**"
---

# Web and UI rules

- React 19 function components, TypeScript strict, English only. Server data through TanStack Query.
- Styling: Tailwind with Design System tokens by name (`accent`, `surface`, `ink`...), listed in
  `docs/technical-stack.md`. No hardcoded colors or spacing. Tokens are not in the repo yet:
  add the token first, then use it. Dark theme changes tokens, not layout.
- Reusable components go in `@board/ui`; screen-specific ones stay in `apps/web`.
- In `packages/ui/src/components`, one PascalCase folder per component: `<Name>/<Name>.tsx`,
  `<Name>.stories.tsx` (a11y-checked in light and dark) and `__tests__/<Name>.test.tsx`. Public exports
  go in `src/index.ts`; do not add an `index.ts` per component folder. Shared helpers go in `lib/`.
- In `apps/web/src`, organise by type: `pages/`, `components/`, `hooks/`, `api/`, `utils/`, `types/`.
  Folder layout and file naming: `.claude/rules/structure.md`.
- Every data screen handles loading, empty, error and success; Observers get a read-only screen.
- Responsive from 375px. Under 900px the sidebar becomes a drawer. Touch targets at least 44px.
  Drag has no touch support: provide Move to... instead.
- Never rely on colour alone for danger. Keyboard reachable, labelled, visible focus.
- Hiding a button is not authorization; the backend enforces permissions.
- Never import from `apps/backend` or `@board/backend`. Use `@board/shared`.
