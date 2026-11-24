import { defineConfig } from "prisma/config";

// Standalone on purpose: the Prisma CLI config must not depend on application source.
try {
  process.loadEnvFile(new URL("../../.env", import.meta.url));
} catch (err) {
  if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { seed: "tsx scripts/seed.ts" },
  datasource: {
    // `prisma generate` does not connect, so a missing URL must not break it.
    // The placeholder points nowhere real: migrate/studio fail instead of hitting a wrong DB.
    url: process.env.DATABASE_URL || "postgresql://placeholder:placeholder@127.0.0.1:1/unset",
  },
});
