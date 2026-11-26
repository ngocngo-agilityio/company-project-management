/** A person as the sign-in code needs to see them. */
export interface StoredUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  googleId: string | null;
  isSuperAdmin: boolean;
  deactivatedAt: Date | null;
}

export interface StoredSession {
  id: string;
  expiresAt: Date;
  lastUsedAt: Date | null;
  user: StoredUser;
}

/** What `store.admit` needs to let a person in. `userId` is null for a person who has no row yet. */
export interface AdmitInput {
  userId: string | null;
  /** Lowercase. Used when the row is created. */
  email: string;
  googleId: string;
  name: string;
  avatarUrl: string | null;
  /** The configured first Super Admin: may enter with no invitation and no project. */
  isFirstSuperAdmin: boolean;
  now: Date;
}

/** The database operations sign-in needs. Tests use an in-memory version; the server uses Prisma. */
export interface AuthStore {
  /** Finds a person by the Google account id first, then by lowercase email. */
  findUser(input: { googleId: string; email: string }): Promise<StoredUser | null>;
  updateProfile(
    userId: string,
    profile: { googleId: string; name: string; avatarUrl: string | null },
  ): Promise<StoredUser>;
  /** true when the lowercase email has a Pending invitation that has not expired at `now`. */
  hasPendingInvitation(email: string, now: Date): Promise<boolean>;
  /** true when the person is a member of at least one project that is not archived. */
  hasActiveMembership(userId: string): Promise<boolean>;
  /**
   * One transaction: accepts every unexpired Pending invitation of the email, creates the memberships,
   * creates the person if needed, saves the Google profile. Returns null, having written nothing,
   * when the person is no longer allowed in (for example a parallel sign-in used the invitation first).
   */
  admit(input: AdmitInput): Promise<StoredUser | null>;
  createSession(userId: string, expiresAt: Date): Promise<{ id: string }>;
  findSession(id: string): Promise<StoredSession | null>;
  touchSession(id: string, input: { expiresAt: Date; lastUsedAt: Date }): Promise<void>;
  deleteSession(id: string): Promise<void>;
}
