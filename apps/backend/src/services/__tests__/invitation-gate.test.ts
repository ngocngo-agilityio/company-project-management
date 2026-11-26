import { describe, expect, it } from "vitest";
import { SIGN_IN_ERROR } from "@board/shared";
import { evaluateGate } from "../invitation-gate.js";
import type { AuthStore, StoredUser } from "../../types/index.js";

const NOW = new Date("2026-11-26T08:00:00.000Z");
const SUPER_ADMIN_EMAIL = "boss@example.com";

const user = (over: Partial<StoredUser> = {}): StoredUser => ({
  id: "user-1",
  email: "person@example.com",
  name: "Person",
  avatarUrl: null,
  googleId: "google-1",
  isSuperAdmin: false,
  deactivatedAt: null,
  ...over,
});

/**
 * Only the two reads the gate uses. `pending` is what the database answers for "an unexpired Pending
 * invitation": an expired invitation is `false` here, because the store filters on `expiresAt > now`.
 */
const store = ({ pending = false, member = false } = {}) =>
  ({
    hasPendingInvitation: async () => pending,
    hasActiveMembership: async () => member,
  }) as unknown as AuthStore;

interface Setup {
  user?: StoredUser | null;
  googleId?: string;
  email?: string;
  superAdminEmail?: string | undefined;
  pending?: boolean;
  member?: boolean;
}

const run = (setup: Setup) =>
  evaluateGate({
    store: store({ pending: setup.pending, member: setup.member }),
    user: setup.user ?? null,
    googleId: setup.googleId ?? "google-1",
    email: setup.email ?? "person@example.com",
    // `undefined` is a real value here (none configured), so test for the key, not for the value.
    superAdminEmail: "superAdminEmail" in setup ? setup.superAdminEmail : SUPER_ADMIN_EMAIL,
    now: NOW,
  });

describe("evaluateGate: who gets in", () => {
  it("lets the first Super Admin in with no invitation and no project", async () => {
    expect(await run({ email: SUPER_ADMIN_EMAIL })).toEqual({ allowed: true, isFirstSuperAdmin: true });
  });

  it("lets in a person with a valid Pending invitation", async () => {
    expect(await run({ pending: true })).toEqual({ allowed: true, isFirstSuperAdmin: false });
  });

  it("lets in a member of an active project", async () => {
    expect(await run({ user: user(), member: true })).toEqual({ allowed: true, isFirstSuperAdmin: false });
  });
});

describe("evaluateGate: who is refused", () => {
  it("refuses a person whose invitation has expired", async () => {
    expect(await run({ pending: false })).toEqual({ allowed: false, code: SIGN_IN_ERROR.NOT_INVITED });
  });

  it("refuses a stranger: no invitation, no row, no project", async () => {
    expect(await run({})).toEqual({ allowed: false, code: SIGN_IN_ERROR.NOT_INVITED });
  });

  it("refuses a known person who is in no active project and has no invitation", async () => {
    expect(await run({ user: user() })).toEqual({ allowed: false, code: SIGN_IN_ERROR.NOT_INVITED });
  });

  it("refuses a deactivated person, even the Super Admin email and a Pending invitation", async () => {
    const gone = user({ email: SUPER_ADMIN_EMAIL, deactivatedAt: new Date("2026-11-01T00:00:00.000Z") });
    expect(await run({ user: gone, email: SUPER_ADMIN_EMAIL, pending: true, member: true })).toEqual({
      allowed: false,
      code: SIGN_IN_ERROR.DEACTIVATED,
    });
  });

  it("refuses an email already linked to another Google account", async () => {
    const linked = user({ googleId: "google-other" });
    expect(await run({ user: linked, googleId: "google-1", pending: true, member: true })).toEqual({
      allowed: false,
      code: SIGN_IN_ERROR.NOT_INVITED,
    });
  });

  it("lets nobody in on the Super Admin rule when none is configured", async () => {
    expect(await run({ email: SUPER_ADMIN_EMAIL, superAdminEmail: undefined })).toEqual({
      allowed: false,
      code: SIGN_IN_ERROR.NOT_INVITED,
    });
  });
});
