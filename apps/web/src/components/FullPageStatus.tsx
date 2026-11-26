import { Button } from "@board/ui";

type FullPageStatusProps = { message: string; onRetry?: () => void };

/** Centered message for a whole-page wait or failure, outside the app shell. */
export function FullPageStatus({ message, onRetry }: FullPageStatusProps) {
  return (
    <main className="grid min-h-dvh place-items-center bg-bg p-4 text-ink">
      <div role={onRetry ? "alert" : "status"} className="flex flex-col items-center gap-3 text-center">
        <p className="text-body text-ink-muted">{message}</p>
        {onRetry ? (
          <Button variant="secondary" onClick={onRetry}>
            Try again
          </Button>
        ) : null}
      </div>
    </main>
  );
}
