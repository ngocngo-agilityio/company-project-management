import { buildApp } from "./app.js";
import { loadEnv, type Env } from "./env.js";

let env: Env;
try {
  env = loadEnv();
} catch (err) {
  console.error((err as Error).message);
  process.exit(1);
}
const app = buildApp({ logger: true, webOrigin: env.WEB_ORIGIN });

let shuttingDown = false;

async function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  // Force-exit if close() hangs (e.g. stuck keep-alive connections).
  setTimeout(() => process.exit(1), 10_000).unref();
  try {
    await app.close();
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
