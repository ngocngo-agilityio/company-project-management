import { describe, expect, it } from "vitest";
import { DEFAULT_LISTS, PROJECT_NAME_MAX } from "../../constants/index.js";
import { createProjectRequestSchema } from "../create-project-request.js";
import { projectArchiveResponseSchema } from "../project-archive-response.js";
import { projectIdParamSchema } from "../project-id-param.js";
import { projectListResponseSchema } from "../project-list-response.js";
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

describe("projectListResponseSchema", () => {
  const person = { id: ownerId, name: "Lan", avatarUrl: null };
  const item = {
    id: ownerId,
    name: "Site",
    archivedAt: null,
    createdAt: "2026-11-27T00:00:00.000Z",
    role: "OWNER",
    boardCount: 1,
    memberCount: 1,
    members: [person],
    openCardCount: 0,
    overdueCardCount: 0,
  };

  it("accepts a project with counts, a member preview and the card placeholders", () => {
    expect(projectListResponseSchema.safeParse({ projects: [item] }).success).toBe(true);
  });

  it("refuses a preview of more members than the card shows", () => {
    const members = Array.from({ length: 5 }, () => person);
    expect(projectListResponseSchema.safeParse({ projects: [{ ...item, members }] }).success).toBe(false);
  });

  it("refuses a negative count", () => {
    expect(projectListResponseSchema.safeParse({ projects: [{ ...item, boardCount: -1 }] }).success).toBe(false);
  });
});

describe("project archive schemas", () => {
  it("accepts a uuid and refuses anything else as the project id", () => {
    expect(projectIdParamSchema.safeParse({ id: ownerId }).success).toBe(true);
    expect(projectIdParamSchema.safeParse({ id: "not-a-uuid" }).success).toBe(false);
  });

  it("answers an archive date, or null after a restore", () => {
    expect(
      projectArchiveResponseSchema.safeParse({ id: ownerId, archivedAt: "2026-11-27T00:00:00.000Z" }).success,
    ).toBe(true);
    expect(projectArchiveResponseSchema.safeParse({ id: ownerId, archivedAt: null }).success).toBe(true);
    expect(projectArchiveResponseSchema.safeParse({ id: ownerId, archivedAt: "yesterday" }).success).toBe(false);
  });
});
