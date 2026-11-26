import { SIGN_IN_ERROR, SIGN_IN_ERROR_PARAM, signInErrorSchema, WEB_ROUTES } from "@board/shared";
import type { ReactNode } from "react";
import { Navigate, useSearchParams } from "react-router";
import { useMe } from "../api/useMe";
import { NotInvitedCard } from "../components/NotInvitedCard";
import { SignInCard } from "../components/SignInCard";

/**
 * /login. The API sends people back here with `?error=<code>`:
 * not_invited and deactivated get the refusal card; any other code (even an unknown one) shows
 * the failure box on the sign-in card with a "Try again" button (access_denied says it was cancelled).
 * rate_limited shows a wait message without "Try again": pressing again would be refused too.
 */
export function SignIn() {
  const [params] = useSearchParams();
  // Do not wait for the answer: show the card at once, and move on if a session turns out to exist.
  const { data } = useMe();

  if (data) return <Navigate to={WEB_ROUTES.PROJECTS} replace />;

  const raw = params.get(SIGN_IN_ERROR_PARAM);
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
