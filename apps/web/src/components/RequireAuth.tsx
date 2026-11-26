import { WEB_ROUTES } from "@board/shared";
import { Alert, Button } from "@board/ui";
import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { useMe } from "../api";
import { SESSION_CHECK_MESSAGES } from "../constants";
import { clearReturnTo, saveReturnTo } from "../utils";
import { AppShellSkeleton } from "./AppShellSkeleton";

/** Guards private routes. Without a session the person goes to /login. This is only UX; the API checks too. */
export function RequireAuth() {
  const { data, isPending, isError, refetch } = useMe();
  const signedIn = Boolean(data);
  // Inside now: the remembered page has done its job.
  useEffect(() => {
    if (signedIn) clearReturnTo();
  }, [signedIn]);
  if (isPending) return <AppShellSkeleton />;
  if (isError) {
    return (
      <main className="grid min-h-dvh place-items-center bg-bg p-4 text-ink">
        <div className="w-full max-w-110">
          <Alert
            title={SESSION_CHECK_MESSAGES.ALERT_TITLE}
            action={
              <Button variant="danger" onClick={() => void refetch()}>
                Try again
              </Button>
            }
          >
            {SESSION_CHECK_MESSAGES.ALERT_TEXT}
          </Alert>
        </div>
      </main>
    );
  }
  if (data === null) return <SendToSignIn />;
  return <Outlet />;
}

/** Remember the page that was asked for, then go to /login (Google sign-in reloads the page, so router state would be lost). */
function SendToSignIn() {
  const { pathname, search } = useLocation();
  useEffect(() => saveReturnTo(`${pathname}${search}`), [pathname, search]);
  return <Navigate to={WEB_ROUTES.LOGIN} replace />;
}
