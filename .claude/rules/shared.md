---
paths:
  - "packages/shared/**"
---

# Shared package rules

- `@board/shared` holds zod schemas and the types inferred from them (`z.infer`).
- One schema is the single source of truth for web and backend. Do not duplicate it.
- No runtime dependencies on Fastify, Prisma, React or the DOM.
- `utils/` is for pure helpers shared by web and backend; `types/` is for zod schemas and the types inferred from them (`auth.ts`, `health.ts`) and plain shared types; `constants/` is for constant values.
- Export everything from `src/index.ts`. Run `pnpm build` after changes, because other
  packages consume `dist`.
- Changing a schema is a contract change: update both sides and their tests together.
