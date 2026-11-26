import { WEB_ROUTES, type SignInError } from "@board/shared";
import { Button } from "@board/ui";
import { Lock } from "lucide-react";
import { Link } from "react-router";
import { REFUSAL_MESSAGES } from "../messages";

type NotInvitedCardProps = {
  /** `not_invited`: no invitation. `deactivated`: removed from its last project (Inactive). */
  reason: Extract<SignInError, "not_invited" | "deactivated">;
};

/** Refusal card from the Design canvas ("You have not been invited"). */
export function NotInvitedCard({ reason }: NotInvitedCardProps) {
  const { TITLE, TEXT, NOTE } = REFUSAL_MESSAGES[reason];
  return (
    <div className="flex w-full max-w-110 flex-col items-center gap-4.5 rounded-18 border border-line bg-surface px-8 py-9.5 text-center shadow-lg max-[440px]:px-5">
      <span className="grid size-14 place-items-center rounded-full bg-danger-soft text-danger">
        <Lock aria-hidden="true" className="size-6" />
      </span>
      <div>
        <h1 className="font-display text-heading-auth">{TITLE}</h1>
        <p className="mt-2 text-body text-ink-muted">{TEXT}</p>
      </div>
      <p className="w-full rounded-10 bg-surface-2 px-3.5 py-3 text-left text-body-small text-ink-muted">{NOTE}</p>
      <Button asChild className="min-h-11 w-full">
        <Link to={WEB_ROUTES.LOGIN}>Back to sign in</Link>
      </Button>
    </div>
  );
}
