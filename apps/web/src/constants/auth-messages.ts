import { APP_NAME, SIGN_IN_ERROR } from "@board/shared";
import { INVITATION_CONTACT, INVITATION_VALID_DAYS } from "./common-messages";

/** SignInCard: the alert shown when the person came back from Google without signing in. */
export const SIGN_IN_FAILURE_MESSAGES = {
  cancelled: {
    TITLE: "Sign-in was cancelled.",
    TEXT: "You closed Google before finishing. Try again when you are ready.",
  },
  rateLimited: { TITLE: "Too many sign-in attempts.", TEXT: "Please wait a minute, then try again." },
  failed: { TITLE: "Sign-in failed.", TEXT: "Something went wrong with Google. Please try again." },
} as const;

/** SignInCard: the invitation-only rule, shown under the Google button. */
export const SIGN_IN_INVITE_ONLY_NOTE = `Access is by invitation only. If you cannot sign in, ask ${INVITATION_CONTACT} to invite your email address.`;

/** NotInvitedCard: one entry per refusal code. */
export const REFUSAL_MESSAGES = {
  [SIGN_IN_ERROR.NOT_INVITED]: {
    TITLE: "You have not been invited",
    TEXT: `${APP_NAME} is open by invitation only, and this Google account has no invitation.`,
    NOTE: `Ask ${INVITATION_CONTACT} to send an invitation to your Google email address. Invitations expire after ${INVITATION_VALID_DAYS} days.`,
  },
  [SIGN_IN_ERROR.DEACTIVATED]: {
    TITLE: "Your account is inactive",
    TEXT: "This Google account has been removed from all projects, so it cannot sign in.",
    NOTE: `Ask ${INVITATION_CONTACT} to invite your Google email address again.`,
  },
} as const;

/** RequireAuth and AppShellSkeleton: the session check failed or is slow. */
export const SESSION_CHECK_MESSAGES = {
  ALERT_TITLE: "We could not check your session.",
  ALERT_TEXT: "The server did not answer. Check your connection and try again.",
  HINT_WAKING_UP: "Waking up the server, this can take up to a minute.",
} as const;
