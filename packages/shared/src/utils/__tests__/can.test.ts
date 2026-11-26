import { describe, expect, it } from "vitest";
import { ACTIONS, PERMISSIONS, ROLES, type Action, type Role } from "../../constants/index.js";
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

/** One entry per row of the table: the action and what each role is expected to get. */
const ROWS = (Object.entries(EXPECTED) as Array<[Action, readonly Role[]]>).map(([action, allowed]) => ({
  action,
  results: ROLES.map((role) => ({ role, expected: allowed.includes(role) })),
}));

/**
 * The table in docs/permissions.md, copied by hand: columns are Super Admin, Owner, Member, Observer.
 * Marks: "✓" and "all"/"own" mean the role may do it at role level, "-" means refused.
 * Source of the copy: docs/permissions.md. Change the doc and this fixture together.
 * `board:view, cards:mine` is one doc row for two keys.
 */
const DOC_MATRIX: Record<string, readonly [string, string, string, string]> = {
  "people:view": ["✓", "-", "-", "-"],
  "person:deactivate": ["✓", "-", "-", "-"],
  "superadmin:invite": ["✓", "-", "-", "-"],
  "project:create": ["✓", "-", "-", "-"],
  "project:update": ["✓", "-", "-", "-"],
  "project:archive": ["✓", "-", "-", "-"],
  "project:view": ["all", "own", "own", "own"],
  "member:manage": ["✓", "✓", "-", "-"],
  "member:leave": ["✓", "✓", "✓", "✓"],
  "board:create": ["✓", "✓", "-", "-"],
  "list:manage": ["✓", "✓", "-", "-"],
  "label:manage": ["✓", "✓", "-", "-"],
  "card:write": ["✓", "✓", "✓", "-"],
  "card:archive": ["✓", "✓", "✓", "-"],
  "comment:write": ["✓", "✓", "✓", "-"],
  "comment:edit-own": ["✓", "✓", "✓", "-"],
  "comment:delete-any": ["✓", "✓", "-", "-"],
  "board:view": ["✓", "✓", "✓", "✓"],
  "cards:mine": ["✓", "✓", "✓", "✓"],
  "card:delete-archived": ["✓", "✓", "-", "-"],
  "structure:delete-archived": ["✓", "-", "-", "-"],
  "systemlog:view": ["✓", "-", "-", "-"],
};

describe("can: one test per row of the permissions table", () => {
  describe.each(ROWS)("$action", ({ action, results }) => {
    it.each(results)("$role -> $expected", ({ role, expected }) => {
      expect(can(role, action)).toBe(expected);
    });
  });
});

describe("permissions table matches docs/permissions.md", () => {
  it("has the same actions as the doc", () => {
    expect(Object.keys(DOC_MATRIX).sort()).toEqual([...ACTIONS].sort());
  });

  it.each(Object.entries(DOC_MATRIX))("%s gives the roles the doc gives", (action, marks) => {
    const fromDoc = ROLES.filter((_, i) => marks[i] !== "-");
    expect([...PERMISSIONS[action as Action]].sort()).toEqual([...fromDoc].sort());
  });
});

describe("can", () => {
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
