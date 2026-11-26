import { PrismaPg } from "@prisma/adapter-pg";
import { buildApp } from "./app.js";
import { createGoogleAuth } from "./services/google.js";
import { createPrismaAuthStore } from "./services/prisma-store.js";
import { loadEnv, type Env } from "./env.js";
import { PrismaClient } from "./generated/prisma/client.js";

/** Force-exit after this long if `close()` hangs. */
const SHUTDOWN_TIMEOUT_MS = 10_000;

let env: Env;
try {
  env = loadEnv();
} catch (err) {
  console.error((err as Error).message);
  process.exit(1);
}
const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, DATABASE_URL, WEB_ORIGIN } = env;
const missing = Object.entries({
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
  DATABASE_URL,
  WEB_ORIGIN,
})
  .filter(([, value]) => !value)
  .map(([name]) => name);
if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI || !DATABASE_URL || !WEB_ORIGIN) {
  console.error(`Sign-in needs these variables: ${missing.join(", ")}`);
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: DATABASE_URL }) });
const crossSite = env.COOKIE_CROSS_SITE === "1";
const app = buildApp({
  logger: true,
  trustProxy: env.TRUST_PROXY === "1",
  webOrigin: WEB_ORIGIN,
  contactEmail: env.CONTACT_EMAIL,
  auth: {
    store: createPrismaAuthStore(prisma),
    google: createGoogleAuth({
      clientId: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      redirectUri: GOOGLE_REDIRECT_URI,
      secureCookies: crossSite,
    }),
    crossSite,
    superAdminEmail: env.SUPER_ADMIN_EMAIL,
  },
});

let shuttingDown = false;

async function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  // Force-exit if close() hangs (e.g. stuck keep-alive connections).
  setTimeout(() => process.exit(1), SHUTDOWN_TIMEOUT_MS).unref();
  try {
    await app.close();
    await prisma.$disconnect();
    process.exit(code);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}
process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
// Close cleanly (and exit non-zero) instead of dropping in-flight work on a crash.
process.on("unhandledRejection", (err) => {
  app.log.error(err);
  void shutdown(1);
});
process.on("uncaughtException", (err) => {
  app.log.error(err);
  void shutdown(1);
});

app.listen({ port: env.PORT, host: env.HOST }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
