import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { assertLocalDatabase } from "../src/utils/index.js";
import { loadEnv } from "../src/env.js";
import { seedCompanySetting, seedSuperAdmin } from "../src/seed.js";

const env = loadEnv();
if (!env.SUPER_ADMIN_EMAIL) {
  console.error("SUPER_ADMIN_EMAIL is required to seed the first Super Admin (set it in .env).");
  process.exit(1);
}
assertLocalDatabase(env.DATABASE_URL, env.ALLOW_REMOTE_DB === "1");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: env.DATABASE_URL }) });
try {
  const admin = await seedSuperAdmin(prisma, { email: env.SUPER_ADMIN_EMAIL, name: env.SUPER_ADMIN_NAME });
  console.log(`Super Admin ready: ${admin.email}`);
  const setting = await seedCompanySetting(prisma, { timezone: env.COMPANY_TIMEZONE });
  console.log(`Company time zone: ${setting.timezone}`);
} finally {
  await prisma.$disconnect();
}
