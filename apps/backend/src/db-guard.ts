const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
// libpq and pg-connection-string let these query parameters override the host in the URL.
const HOST_PARAMS = ["host", "hostaddr"];

/**
 * Refuses to run a db:* script against a database that is not on this machine,
 * so a wrong DATABASE_URL cannot touch the real Supabase database by accident.
 */
export function assertLocalDatabase(url: string | undefined, allowRemote: boolean): void {
  if (!url)
    throw new Error("DATABASE_URL is not set. Start the local database (docker compose up -d --wait) and set it.");
  if (allowRemote) return;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    // Never include the URL itself: it holds the password.
    throw new Error("DATABASE_URL is not a valid URL (check that special characters in the password are encoded).");
  }

  const hosts = [parsed.hostname, ...HOST_PARAMS.flatMap((p) => parsed.searchParams.getAll(p))];
  const remote = hosts.find((h) => !LOCAL_HOSTS.has(h));
  if (remote !== undefined) {
    throw new Error(
      `Refusing to run against a non-local database (host "${remote}"). ` +
        "Point DATABASE_URL at the local Docker database, or set ALLOW_REMOTE_DB=1 if you really mean it.",
    );
  }
}
