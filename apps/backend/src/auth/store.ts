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

/** The database operations sign-in needs. Tests use an in-memory version; the server uses Prisma. */
export interface AuthStore {
  /** Finds a person by the Google account id first, then by lowercase email. */
  findUser(input: { googleId: string; email: string }): Promise<StoredUser | null>;
  updateProfile(
    userId: string,
    profile: { googleId: string; name: string; avatarUrl: string | null },
  ): Promise<StoredUser>;
  createSession(userId: string, expiresAt: Date): Promise<{ id: string }>;
  findSession(id: string): Promise<StoredSession | null>;
  touchSession(id: string, input: { expiresAt: Date; lastUsedAt: Date }): Promise<void>;
  deleteSession(id: string): Promise<void>;
}
