import { Alert, Button } from "@board/ui";
import { Navigate, Outlet } from "react-router";
import { useMe } from "../api/useMe";
import { AppShellSkeleton } from "./AppShellSkeleton";

/** Guards private routes. Without a session the person goes to /login. This is only UX; the API checks too. */
export function RequireAuth() {
  const { data, isPending, isError, refetch } = useMe();
  if (isPending) return <AppShellSkeleton />;
  if (isError) {
    return (
      <main className="grid min-h-dvh place-items-center bg-bg p-4 text-ink">
        <div className="w-full max-w-110">
          <Alert
            title="We could not check your session."
            action={
              <Button variant="danger" onClick={() => void refetch()}>
                Try again
              </Button>
            }
          >
            The server did not answer. Check your connection and try again.
          </Alert>
        </div>
      </main>
    );
  }
  if (data === null) return <Navigate to="/login" replace />;
  return <Outlet />;
}
