import { describe, expect, it } from "vitest";
import { normalizeEmail } from "../email.js";

describe("normalizeEmail", () => {
  it("lowercases and trims", () => {
    expect(normalizeEmail("  Admin@Example.COM ")).toBe("admin@example.com");
  });

  it("is idempotent", () => {
    const once = normalizeEmail("A@B.co");
    expect(normalizeEmail(once)).toBe(once);
  });
});
