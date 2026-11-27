// Runs the Playwright e2e suite before a push, but only when the push changes code the e2e tests cover.
// Called by .husky/pre-push. There is no way to skip it from here: the only softening is that the
// real-backend specs (@real) are left out, with a warning, when the local Postgres is not running.
import { spawnSync } from "node:child_process";
import net from "node:net";

const BASE = "origin/dev";
/** A change under one of these paths can break a browser flow. Docs, workflows and so on cannot. */
const WATCHED = [
  /^apps\/web\//,
  /^apps\/backend\//,
  /^packages\/(shared|ui)\//,
  /^package\.json$/,
  /^pnpm-(lock|workspace)\.ya?ml$/,
];

const run = (cmd, args) => spawnSync(cmd, args, { encoding: "utf8" });

/** Files changed against origin/dev, or null when origin/dev is not known here (then run everything). */
function changedFiles() {
  const diff = run("git", ["diff", "--name-only", `${BASE}...HEAD`]);
  return diff.status === 0 ? diff.stdout.split("\n").filter(Boolean) : null;
}

/** true when something listens where the e2e database should be (default: the Docker one on 5432). */
function databaseIsUp() {
  const url = new URL(process.env.E2E_DATABASE_URL || `postgresql://x@127.0.0.1:${process.env.DB_PORT || 5432}/x`);
  return new Promise((resolve) => {
    const socket = net.connect({ host: url.hostname, port: Number(url.port) || 5432 });
    const done = (up) => {
      socket.destroy();
      resolve(up);
    };
    socket.setTimeout(1000, () => done(false));
    socket.once("connect", () => done(true));
    socket.once("error", () => done(false));
  });
}

function exit(result) {
  process.exit(result.status ?? 1);
}

const files = changedFiles();
if (files !== null && !files.some((file) => WATCHED.some((pattern) => pattern.test(file)))) {
  console.log("pre-push: no web, backend or shared code changed, skipping e2e.");
  process.exit(0);
}
if (files === null) console.warn(`pre-push: ${BASE} not found (run git fetch), running e2e anyway.`);

if (await databaseIsUp()) {
  console.log("pre-push: running e2e (pnpm e2e)...");
  exit(spawnSync("pnpm", ["e2e"], { stdio: "inherit" }));
}

console.warn(
  "pre-push: Postgres is not running (docker compose up -d --wait), so the real-backend specs are SKIPPED.\n" +
    "Running only the mocked specs. CI runs everything.",
);
exit(spawnSync("pnpm", ["--filter", "@board/web", "test:e2e", "--grep-invert", "@real"], { stdio: "inherit" }));
