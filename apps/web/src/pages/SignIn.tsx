import { signInErrorSchema } from "@board/shared";
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

  if (data) return <Navigate to="/projects" replace />;

  const raw = params.get("error");
  const error = signInErrorSchema.safeParse(raw).data ?? null;
  if (error === "not_invited" || error === "deactivated") return page(<NotInvitedCard reason={error} />);

  const failure =
    raw === null ? null : error === "access_denied" ? "cancelled" : error === "rate_limited" ? "rateLimited" : "failed";
  return page(<SignInCard failure={failure} />);
}

function page(card: ReactNode) {
  return <main className="grid min-h-dvh place-items-center bg-bg p-4 text-ink">{card}</main>;
}
