import { SIGN_IN_ERROR, SIGN_IN_ERROR_PARAM, signInErrorSchema, WEB_ROUTES } from "@board/shared";
import type { ReactNode } from "react";
import { Navigate, useSearchParams } from "react-router";
import { useMe } from "../api";
import { AppShellSkeleton, NotInvitedCard, SignInCard } from "../components";
import { readReturnTo, readSessionHint } from "../utils";

/**
 * /login. The API sends people back here with `?error=<code>`:
 * not_invited and deactivated get the refusal card; any other code (even an unknown one) shows
 * the failure box on the sign-in card with a "Try again" button (access_denied says it was cancelled).
 * rate_limited shows a wait message without "Try again": pressing again would be refused too.
 *
 * Without an error the card shows at once, without waiting for the session check. Exception: when this
 * browser had a session last time (the hint), the person most likely is signed in, so we show the app
 * skeleton while we check instead of a card that would flash and vanish.
 */
export function SignIn() {
  const [params] = useSearchParams();
  const { data, isPending } = useMe();

  // Back to the private page they asked for (if any), else Projects.
  if (data) return <Navigate to={readReturnTo() ?? WEB_ROUTES.PROJECTS} replace />;

  const raw = params.get(SIGN_IN_ERROR_PARAM);
  if (raw === null && isPending && readSessionHint()) return <AppShellSkeleton />;

  const error = signInErrorSchema.safeParse(raw).data ?? null;
  if (error === SIGN_IN_ERROR.NOT_INVITED || error === SIGN_IN_ERROR.DEACTIVATED)
    return page(<NotInvitedCard reason={error} />);

  const failure =
    raw === null
      ? null
      : error === SIGN_IN_ERROR.ACCESS_DENIED
        ? "cancelled"
        : error === SIGN_IN_ERROR.RATE_LIMITED
          ? "rateLimited"
          : "failed";
  return page(<SignInCard failure={failure} />);
}

function page(card: ReactNode) {
  return <main className="grid min-h-dvh place-items-center bg-bg p-4 text-ink">{card}</main>;
}
