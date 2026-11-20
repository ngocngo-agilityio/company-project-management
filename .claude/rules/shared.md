---
paths:
  - "packages/shared/**"
---

# Shared package rules

- `@board/shared` holds zod schemas and the types inferred from them (`z.infer`).
- One schema is the single source of truth for web and backend. Do not duplicate it.
- No runtime dependencies on Fastify, Prisma, React or the DOM.
- Export everything from `src/index.ts`. Run `pnpm build` after changes, because other
  packages consume `dist`.
- Changing a schema is a contract change: update both sides and their tests together.
