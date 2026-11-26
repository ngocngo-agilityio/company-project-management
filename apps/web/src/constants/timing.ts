/** After this long we tell the person the server may be starting up (free hosting sleeps when idle). */
export const WAKE_UP_HINT_DELAY_MS = 5_000;

// A sleeping free-plan service needs about a minute to wake up.
export const WAKE_UP_TIMEOUT_MS = 90_000;

/** How long the `/api/me` answer counts as fresh before it is fetched again. */
export const ME_STALE_TIME_MS = 30_000;
