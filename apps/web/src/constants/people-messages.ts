import type { InvitationStatus } from "@board/shared";

/** People screen (Super Admin only): texts of the page, the invitations table and its actions. */
export const PEOPLE_MESSAGES = {
  TITLE: "People",
  INVITE_BUTTON: "Invite a person",
  INVITATIONS_SECTION: "All invitations",
  LIST_LABEL: "Invitations",
  COL_EMAIL: "Email",
  COL_ACCESS: "Access",
  COL_INVITED_BY: "Invited by",
  COL_STATUS: "Status",
  COL_WHEN: "When",
  COL_ACTIONS: "Actions",
  APP_ACCESS_ONLY: "App access only",
  INVITATIONS_HINT:
    "An invitation to a project gives a role in it. An invitation with no project only lets the person into the app; add them to a project later from its Members screen.",
  EMPTY: "No invitations yet",
  EMPTY_HINT: "Invite a person by their Google email, then send them the link.",
  LOAD_FAILED_TITLE: "We could not load the invitations.",
  LOAD_FAILED_TEXT: "Check your connection and try again.",
  RETRY: "Try again",
  COPY_LINK: "Copy link",
  COPIED: "Link copied",
  COPY_FAILED: "We could not copy the link. Select it and copy it by hand.",
  FORBIDDEN_TITLE: "Only the Super Admin can see this page.",
  FORBIDDEN_TEXT: "Go back to the projects you belong to.",
  BACK: "Back to projects",
  /** "Copy link" with the person it acts on, for screen readers. */
  actionLabel: (action: string, email: string) => `${action}: ${email}`,
} as const;

/** InviteDialog: labels, hints and errors. */
export const INVITE_DIALOG_MESSAGES = {
  TITLE: "Invite a person",
  HINT: "They can sign in with this Google account straight away. No email is sent: copy the link and send it yourself.",
  EMAIL_LABEL: "Email (Google account)",
  EMAIL_PLACEHOLDER: "name@company.com",
  SUBMIT: "Create invitation",
  CANCEL: "Cancel",
  EMAIL_REQUIRED: "Enter an email address.",
  EMAIL_INVALID: "Enter a valid email address.",
  FAILED_CONFLICT: "This email already has an account or a pending invitation.",
  FAILED_FORBIDDEN: "Only the Super Admin can invite people.",
  FAILED_OTHER: "We could not create the invitation. Check your connection and try again.",
  /** Shown after creating: the link to send. */
  CREATED_TITLE: "Invitation created",
  CREATED_TEXT: "Send this link to the person. They sign in with that Google account.",
  LINK_LABEL: "Invitation link",
  DONE: "Done",
} as const;

export const INVITATION_STATUS_LABELS: Record<InvitationStatus, string> = {
  PENDING: "Pending",
  ACCEPTED: "Accepted",
  EXPIRED: "Expired",
  REVOKED: "Revoked",
};
