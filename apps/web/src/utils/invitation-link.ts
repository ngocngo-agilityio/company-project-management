import { WEB_ROUTES } from "@board/shared";

/** The link to send: the sign-in page of this app. It holds no secret; the person signs in with the invited Google email. */
export function invitationLink(): string {
  return `${window.location.origin}${WEB_ROUTES.LOGIN}`;
}
