import { describe, expect, it } from "vitest";
import { INVITATION_STATUS, MEMBERSHIP_ROLE } from "@board/shared";
import { InvitationStatus, MembershipRole } from "../generated/prisma/enums.js";

// The shared enums are written by hand for the web. This keeps them equal to the Prisma ones.
describe("shared enums match Prisma", () => {
  it("MEMBERSHIP_ROLE", () => expect(MEMBERSHIP_ROLE).toEqual(MembershipRole));
  it("INVITATION_STATUS", () => expect(INVITATION_STATUS).toEqual(InvitationStatus));
});
