import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { assertLocalDatabase } from "../src/utils/index.js";
import { loadEnv } from "../src/env.js";
import { databaseHost, parseSampleArgs, seedSampleUsers } from "../src/seed-sample.js";

// Usage: pnpm db:seed:sample -- "Name <email>" ["Name <email>" ...] [--fake] --yes
// Emails come from the command line only, so no real address is ever saved in the repository.
let args;
try {
  args = parseSampleArgs(process.argv.slice(2));
} catch (err) {
  console.error((err as Error).message);
  console.error('Usage: pnpm db:seed:sample -- "Name <email>" ["Name <email>" ...] [--fake] --yes');
  process.exit(1);
}

const env = loadEnv();
// Same guard as db:seed: a non-local database needs ALLOW_REMOTE_DB=1.
assertLocalDatabase(env.DATABASE_URL, env.ALLOW_REMOTE_DB === "1");
const url = env.DATABASE_URL!;

console.log(`Database host: ${databaseHost(url)}`);
console.log(`Will create ${args.users.length} people (existing emails are left as they are).`);
if (!args.yes) {
  console.error("Check the host above, then run again with --yes to write.");
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
try {
  const done = await seedSampleUsers(prisma, args.users);
  console.log(`Ready: ${done.length} people.`);
} finally {
  await prisma.$disconnect();
}
