import { describe, expect, it } from "vitest";

// Intentional failure: proves a failing `ci` check blocks the merge. Do not merge.
describe("ci failure check", () => {
  it("fails on purpose", () => {
    expect(1).toBe(2);
  });
});
