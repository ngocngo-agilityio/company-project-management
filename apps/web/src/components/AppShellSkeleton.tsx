import { Skeleton } from "@board/ui";
import { useEffect, useState } from "react";

/** After this long we tell the person the server may be starting up (free hosting sleeps when idle). */
export const WAKE_UP_HINT_DELAY_MS = 5_000;

/** App-shaped placeholder (sidebar, top bar, content) shown while we check the session. */
export function AppShellSkeleton() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), WAKE_UP_HINT_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div role="status" className="min-h-dvh bg-bg text-ink min-[900px]:flex">
      <span className="sr-only">Loading</span>
      <div className="hidden h-dvh w-sidebar shrink-0 flex-col gap-3 border-r border-line bg-surface p-4 min-[900px]:flex">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="mt-4 h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-line bg-surface px-4 py-3">
          <Skeleton className="size-11 min-[900px]:hidden" />
          <Skeleton className="h-6 w-40" />
        </div>
        <div className="mx-auto flex w-full max-w-page flex-1 flex-col gap-4 px-4 pt-5.5 pb-8">
          <Skeleton className="h-8 w-60 max-w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          {slow ? (
            <p className="text-body-small text-ink-muted">Waking up the server, this can take up to a minute.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
