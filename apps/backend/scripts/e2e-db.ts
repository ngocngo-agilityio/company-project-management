import { spawnSync } from "node:child_process";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { assertLocalDatabase } from "../src/utils/index.js";

// The database browser end-to-end tests run against. Never the dev database and never Supabase.
// Same default as apps/web/playwright.config.ts (the local Docker database from docker-compose.yml).
const DEFAULT_URL = `postgresql://board:board_local_dev@127.0.0.1:${process.env.DB_PORT || 5432}/board_e2e`;
const url = process.env.E2E_DATABASE_URL || DEFAULT_URL;

// Always local, whatever ALLOW_REMOTE_DB says. This script also creates a database.
assertLocalDatabase(url, false);

const parsed = new URL(url);
const dbName = decodeURIComponent(parsed.pathname.slice(1));
if (!/^[a-z0-9_]+$/.test(dbName)) {
  console.error("E2E database name may only use a-z, 0-9 and _.");
  process.exit(1);
}

// Create the database when it does not exist yet (CI creates it with POSTGRES_DB, so this is a no-op there).
const admin = new URL(url);
admin.pathname = "/postgres";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: admin.toString() }) });
try {
  const found = await prisma.$queryRawUnsafe<unknown[]>("SELECT 1 FROM pg_database WHERE datname = $1", dbName);
  if (found.length === 0) {
    await prisma.$executeRawUnsafe(`CREATE DATABASE ${dbName}`);
    console.log(`Created database ${dbName}.`);
  }
} finally {
  await prisma.$disconnect();
}

// Only `migrate deploy` (apply existing migrations). Never `migrate reset` or `db push`.
const result = spawnSync("pnpm", ["exec", "prisma", "migrate", "deploy"], {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: url },
});
process.exit(result.status ?? 1);
