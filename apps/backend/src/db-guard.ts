const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/**
 * Refuses to run a db:* script against a database that is not on this machine,
 * so a wrong DATABASE_URL cannot touch the real Supabase database by accident.
 */
export function assertLocalDatabase(url: string | undefined, allowRemote: boolean): void {
  if (!url)
    throw new Error("DATABASE_URL is not set. Start the local database (docker compose up -d --wait) and set it.");
  if (allowRemote) return;
  const host = new URL(url).hostname;
  if (!LOCAL_HOSTS.has(host)) {
    throw new Error(
      `Refusing to run against a non-local database (host "${host}"). ` +
        "Point DATABASE_URL at the local Docker database, or set ALLOW_REMOTE_DB=1 if you really mean it.",
    );
  }
}
