import { Alert, Button, Logo } from "@board/ui";
import { Loader2 } from "lucide-react";
import { useEffect, useState, type MouseEvent } from "react";
import { GOOGLE_SIGN_IN_URL } from "../constants";
import { SIGN_IN_FAILURE_MESSAGES, SIGN_IN_INVITE_ONLY_NOTE } from "../constants";
import { GoogleIcon } from "./GoogleIcon";

type SignInCardProps = {
  /** Set when the person came back from Google without signing in (not an invitation problem). */
  failure: keyof typeof SIGN_IN_FAILURE_MESSAGES | null;
};

/** Sign-in card from the Design canvas: logo, one Google button, and the invitation-only note. */
export function SignInCard({ failure }: SignInCardProps) {
  const [pending, setPending] = useState(false);

  // The browser Back button can restore this page from memory with the button still pending.
  useEffect(() => {
    const reset = (event: PageTransitionEvent) => {
      if (event.persisted) setPending(false);
    };
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);

  // A second press would start a second OAuth round trip: let the first one finish.
  const start = (event: MouseEvent<HTMLAnchorElement>) => {
    if (pending) event.preventDefault();
    else setPending(true);
  };

  return (
    <div className="flex w-full max-w-110 flex-col items-center gap-4.5 rounded-18 border border-line bg-surface px-8 py-9.5 text-center shadow-lg max-[440px]:px-5">
      <Logo size={56} />
      <div>
        <h1 className="font-display text-heading-auth">Sign in to Company Board</h1>
        <p className="mt-2 text-body text-ink-muted">
          Use the Google account you were invited with. Personal Google accounts work.
        </p>
      </div>
      {failure ? (
        <Alert
          title={SIGN_IN_FAILURE_MESSAGES[failure].TITLE}
          action={
            failure === "rateLimited" ? undefined : (
              <Button variant="danger" asChild>
                <a href={GOOGLE_SIGN_IN_URL}>Try again</a>
              </Button>
            )
          }
        >
          {SIGN_IN_FAILURE_MESSAGES[failure].TEXT}
        </Alert>
      ) : null}
      <Button variant="secondary" asChild className="min-h-11 w-full rounded-10 py-3 text-body">
        <a href={GOOGLE_SIGN_IN_URL} onClick={start} aria-busy={pending}>
          {pending ? <Loader2 aria-hidden="true" className="size-5 animate-spin" /> : <GoogleIcon />}
          {pending ? "Opening Google…" : "Continue with Google"}
        </a>
      </Button>
      <p className="w-full rounded-10 bg-surface-2 px-3.5 py-3 text-left text-body-small text-ink-muted">
        {SIGN_IN_INVITE_ONLY_NOTE}
      </p>
    </div>
  );
}
