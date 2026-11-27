import type { InvitationStatus, MembershipRole } from "@board/shared";

/** An invitation row. `status` is what is stored: Pending stays Pending after `expiresAt`, the route reports Expired. */
export interface StoredInvitation {
  id: string;
  email: string;
  project: { id: string; name: string } | null;
  role: MembershipRole | null;
  status: InvitationStatus;
  invitedBy: { id: string; name: string };
  createdAt: Date;
  expiresAt: Date;
}

export type CreateAccountInvitationResult =
  | { result: "created" | "reactivated"; invitation: StoredInvitation }
  /** The email belongs to a person who is already active. */
  | { result: "active_user" }
  /** The email already has an account invitation that is Pending (Resend renews it). */
  | { result: "pending_exists" };

export type ResendInvitationResult =
  | { result: "ok"; invitation: StoredInvitation }
  | { result: "not_found" }
  /** Accepted or Revoked invitations cannot be resent. */
  | { result: "not_resendable" };

/** The database operations the invitation routes need. Tests use an in-memory version; the server uses Prisma. */
export interface InvitationStore {
  /** Newest first. */
  list(): Promise<StoredInvitation[]>;
  /**
   * Invites a lowercase email to the app with no project. An email whose person is deactivated is
   * reactivated at once and the invitation is Accepted from the start.
   */
  createAccountInvitation(input: {
    email: string;
    invitedById: string;
    now: Date;
    expiresAt: Date;
  }): Promise<CreateAccountInvitationResult>;
  /** Pending (even past its date) or Expired goes back to Pending with a fresh `expiresAt`. Accepted and Revoked are refused. */
  resend(input: { id: string; expiresAt: Date }): Promise<ResendInvitationResult>;
}
