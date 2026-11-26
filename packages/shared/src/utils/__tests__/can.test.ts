import { describe, expect, it } from "vitest";
import { ACTIONS, ROLES, type Action, type Role } from "../../constants/index.js";
import { can } from "../can.js";

const [SA, OW, ME, OB] = ROLES;

/** Hand-typed from docs/permissions.md. Deliberately NOT derived from PERMISSIONS. */
const EXPECTED: Record<Action, readonly Role[]> = {
  "people:view": [SA],
  "person:deactivate": [SA],
  "superadmin:invite": [SA],
  "project:create": [SA],
  "project:update": [SA],
  "project:archive": [SA],
  "project:view": [SA, OW, ME, OB],
  "member:manage": [SA, OW],
  "member:leave": [SA, OW, ME, OB],
  "board:create": [SA, OW],
  "list:manage": [SA, OW],
  "label:manage": [SA, OW],
  "card:write": [SA, OW, ME],
  "card:archive": [SA, OW, ME],
  "comment:write": [SA, OW, ME],
  "comment:edit-own": [SA, OW, ME],
  "comment:delete-any": [SA, OW],
  "board:view": [SA, OW, ME, OB],
  "cards:mine": [SA, OW, ME, OB],
  "card:delete-archived": [SA, OW],
  "structure:delete-archived": [SA],
  "systemlog:view": [SA],
};

const CASES = Object.entries(EXPECTED).flatMap(([action, allowed]) =>
  ROLES.map((role) => ({ action: action as Action, role, expected: allowed.includes(role) })),
);

describe("can", () => {
  it.each(CASES)("$role / $action -> $expected", ({ role, action, expected }) => {
    expect(can(role, action)).toBe(expected);
  });

  it("tests every action in the table", () => {
    expect(Object.keys(EXPECTED).sort()).toEqual([...ACTIONS].sort());
  });

  it("gives Super Admin everything Owner has", () => {
    for (const action of ACTIONS) {
      if (can(OW, action)) expect(can(SA, action)).toBe(true);
    }
  });

  it("limits Observer to read and leave", () => {
    const allowed = ACTIONS.filter((action) => can(OB, action));
    expect(allowed.sort()).toEqual(["board:view", "cards:mine", "member:leave", "project:view"]);
  });

  it("refuses an unknown action", () => {
    expect(can(SA, "nope:nothing" as Action)).toBe(false);
  });
});
