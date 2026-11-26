import { signInErrorSchema } from "@board/shared";
import type { ReactNode } from "react";
import { Navigate, useSearchParams } from "react-router";
import { useMe } from "../api/useMe";
import { FullPageStatus } from "../components/FullPageStatus";
import { NotInvitedCard } from "../components/NotInvitedCard";
import { SignInCard } from "../components/SignInCard";

/**
 * /login. The API sends people back here with `?error=<code>`:
 * not_invited and deactivated get the refusal card; any other code (even an unknown one) shows
 * the failure box on the sign-in card with a "Try again" button (access_denied says it was cancelled).
 */
export function SignIn() {
  const [params] = useSearchParams();
  const { data, isPending } = useMe();

  if (isPending) return <FullPageStatus message="Checking your session…" />;
  if (data) return <Navigate to="/projects" replace />;

  const raw = params.get("error");
  const error = signInErrorSchema.safeParse(raw).data ?? null;
  if (error === "not_invited" || error === "deactivated") return page(<NotInvitedCard reason={error} />);

  const failure = raw === null ? null : error === "access_denied" ? "cancelled" : "failed";
  return page(<SignInCard failure={failure} />);
}

function page(card: ReactNode) {
  return <main className="grid min-h-dvh place-items-center bg-bg p-4 text-ink">{card}</main>;
}
