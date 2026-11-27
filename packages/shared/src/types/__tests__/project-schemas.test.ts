import { describe, expect, it } from "vitest";
import { DEFAULT_LISTS, PROJECT_NAME_MAX } from "../../constants/index.js";
import { createProjectRequestSchema } from "../create-project-request.js";
import { peopleListQuerySchema } from "../people-list-query.js";

const ownerId = "5f1c3b0e-8a6e-4c43-9b53-0d2f6a1b7c11";

describe("createProjectRequestSchema", () => {
  it("trims the name", () => {
    expect(createProjectRequestSchema.parse({ name: "  Site  ", ownerId }).name).toBe("Site");
  });

  it("refuses an empty or too long name and a bad owner id", () => {
    expect(createProjectRequestSchema.safeParse({ name: "   ", ownerId }).success).toBe(false);
    expect(createProjectRequestSchema.safeParse({ name: "a".repeat(PROJECT_NAME_MAX + 1), ownerId }).success).toBe(
      false,
    );
    expect(createProjectRequestSchema.safeParse({ name: "a".repeat(PROJECT_NAME_MAX), ownerId }).success).toBe(true);
    expect(createProjectRequestSchema.safeParse({ name: "Site", ownerId: "nope" }).success).toBe(false);
  });
});

describe("peopleListQuerySchema", () => {
  it("defaults to all and accepts only active or all", () => {
    expect(peopleListQuerySchema.parse({}).status).toBe("all");
    expect(peopleListQuerySchema.parse({ status: "active" }).status).toBe("active");
    expect(peopleListQuerySchema.safeParse({ status: "x" }).success).toBe(false);
  });
});

describe("DEFAULT_LISTS", () => {
  it("starts with To do, In progress, Done, and only Done is Finished", () => {
    expect(DEFAULT_LISTS.map((l) => [l.name, l.isFinished])).toEqual([
      ["To do", false],
      ["In progress", false],
      ["Done", true],
    ]);
  });
});
