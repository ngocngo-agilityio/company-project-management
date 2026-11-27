const DAY_MS = 24 * 60 * 60 * 1000;

/** "today", "1 d ago", "12 d ago". Whole days, rounded down. */
export function daysAgo(iso: string, now = new Date()): string {
  const days = Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / DAY_MS));
  return days === 0 ? "today" : `${days} d ago`;
}

/** "expires in 14 d". Whole days, rounded up, never below 0. */
export function expiresIn(iso: string, now = new Date()): string {
  const days = Math.max(0, Math.ceil((new Date(iso).getTime() - now.getTime()) / DAY_MS));
  return `expires in ${days} d`;
}
