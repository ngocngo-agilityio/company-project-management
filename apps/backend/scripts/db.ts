import { spawnSync } from "node:child_process";
import { assertLocalDatabase } from "../src/lib/db-guard.js";
import { loadEnv } from "../src/env.js";

const commands = { migrate: ["migrate", "dev"], deploy: ["migrate", "deploy"] } as const;
const name = process.argv[2] as keyof typeof commands | undefined;
if (!name || !Object.hasOwn(commands, name)) {
  console.error("Usage: tsx scripts/db.ts <migrate|deploy> [prisma args]");
  process.exit(1);
}

const env = loadEnv();
// `migrate dev` needs a shadow database and offers to reset on drift: never on a remote database,
// even with ALLOW_REMOTE_DB=1. Only `migrate deploy` (apply existing migrations) may go remote.
assertLocalDatabase(env.DATABASE_URL, name === "deploy" && env.ALLOW_REMOTE_DB === "1");

const result = spawnSync("pnpm", ["exec", "prisma", ...commands[name], ...process.argv.slice(3)], {
  stdio: "inherit",
});
process.exit(result.status ?? 1);
