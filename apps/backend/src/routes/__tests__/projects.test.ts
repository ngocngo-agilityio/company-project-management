import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { createProjectResponseSchema, projectListResponseSchema } from "@board/shared";
import { makeUser, setupApp, WEB } from "./test-helpers.js";

const apps: Array<{ close(): Promise<unknown> }> = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((a) => a.close()));
});

const admin = makeUser({ name: "Admin", isSuperAdmin: true });
const owner = makeUser({ name: "Owner" });
const member = makeUser({ name: "Member" });
const observer = makeUser({ name: "Observer" });
const loner = makeUser({ name: "Loner" });
const gone = makeUser({ name: "Gone", deactivatedAt: new Date("2026-11-01T00:00:00Z") });

function setup(opts: { failWith?: Error } = {}) {
  const ctx = setupApp([admin, owner, member, observer, loner, gone], opts);
  apps.push(ctx.app);
  return ctx;
}

describe("POST /api/projects", () => {
  it("lets the Super Admin create a project with its board, lists and Owner", async () => {
    const { app, cookieFor, projects, memberships, created } = setup();
    const res = await app.inject({
      method: "POST",
      url: "/api/projects",
      headers: { cookie: await cookieFor(admin), origin: WEB },
      payload: { name: "  Website  ", ownerId: owner.id },
    });

    expect(res.statusCode).toBe(201);
    const body = createProjectResponseSchema.parse(res.json());
    expect(body.name).toBe("Website");
    expect(body.owner).toEqual({ userId: owner.id, role: "OWNER" });
    expect(body.board.name).toBe("Main board");
    expect(body.board.lists.map((l) => [l.name, l.position, l.isFinished])).toEqual([
      ["To do", 1, false],
      ["In progress", 2, false],
      ["Done", 3, true],
    ]);
    // Exactly one project and one membership: the chosen Owner. The Super Admin is not made a member.
    expect(projects).toHaveLength(1);
    expect(created).toHaveLength(1);
    expect(memberships).toEqual([{ projectId: body.id, userId: owner.id, role: "OWNER" }]);
  });

  it("lets the Super Admin pick themselves as Owner", async () => {
    const { app, cookieFor, memberships } = setup();
    const res = await app.inject({
      method: "POST",
      url: "/api/projects",
      headers: { cookie: await cookieFor(admin) },
      payload: { name: "Mine", ownerId: admin.id },
    });
    expect(res.statusCode).toBe(201);
    expect(memberships.map((m) => m.userId)).toEqual([admin.id]);
  });

  it("answers 403 for an Owner, a Member and an Observer of existing projects", async () => {
    const ctx = setup();
    const project = { id: randomUUID(), name: "Existing", archivedAt: null, createdAt: new Date() };
    ctx.projects.push(project);
    ctx.memberships.push(
      { projectId: project.id, userId: owner.id, role: "OWNER" },
      { projectId: project.id, userId: member.id, role: "MEMBER" },
      { projectId: project.id, userId: observer.id, role: "OBSERVER" },
    );
    for (const caller of [owner, member, observer]) {
      const res = await ctx.app.inject({
        method: "POST",
        url: "/api/projects",
        headers: { cookie: await ctx.cookieFor(caller) },
        payload: { name: "Sneaky", ownerId: caller.id },
      });
      expect(res.statusCode).toBe(403);
    }
    expect(ctx.projects).toHaveLength(1);
  });

  it("answers 401 for a deactivated person", async () => {
    const { app, cookieFor, projects } = setup();
    const res = await app.inject({
      method: "POST",
      url: "/api/projects",
      headers: { cookie: await cookieFor(gone) },
      payload: { name: "X", ownerId: owner.id },
    });
    expect(res.statusCode).toBe(401);
    expect(projects).toHaveLength(0);
  });

  it("answers 401 without a session", async () => {
    const { app, projects } = setup();
    const res = await app.inject({ method: "POST", url: "/api/projects", payload: { name: "X", ownerId: owner.id } });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ error: "unauthorized" });
    expect(projects).toHaveLength(0);
  });

  it.each([
    ["without a session", false],
    ["signed in", true],
  ])("answers a broken JSON body %s with the API error shape", async (_label, signedIn) => {
    const { app, cookieFor } = setup();
    const res = await app.inject({
      method: "POST",
      url: "/api/projects",
      headers: {
        "content-type": "application/json",
        origin: WEB,
        ...(signedIn ? { cookie: await cookieFor(admin) } : {}),
      },
      payload: "{bad",
    });
    // Fastify refuses an unreadable body before the access hook, so even without a session it is a 400.
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: "validation_error", message: expect.any(String) });
  });

  it("answers 403 for a Member, even with a body that would be refused", async () => {
    const { app, cookieFor, projects } = setup();
    const res = await app.inject({
      method: "POST",
      url: "/api/projects",
      headers: { cookie: await cookieFor(member) },
      payload: { name: "", ownerId: "nope" },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({ error: "forbidden" });
    expect(projects).toHaveLength(0);
  });

  it.each([
    ["an empty name", { name: "   ", ownerId: randomUUID() }],
    ["a name over 100 characters", { name: "a".repeat(101), ownerId: randomUUID() }],
    ["a missing owner", { name: "X" }],
    ["an owner that is not a uuid", { name: "X", ownerId: "not-a-uuid" }],
    ["no body", undefined],
  ])("answers 400 for %s", async (_label, payload) => {
    const { app, cookieFor, projects } = setup();
    const res = await app.inject({
      method: "POST",
      url: "/api/projects",
      headers: { cookie: await cookieFor(admin) },
      ...(payload === undefined ? {} : { payload }),
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("validation_error");
    expect(typeof res.json().message).toBe("string");
    expect(projects).toHaveLength(0);
  });

  it("accepts a name of exactly 100 characters", async () => {
    const { app, cookieFor } = setup();
    const res = await app.inject({
      method: "POST",
      url: "/api/projects",
      headers: { cookie: await cookieFor(admin) },
      payload: { name: "a".repeat(100), ownerId: owner.id },
    });
    expect(res.statusCode).toBe(201);
  });

  it.each([
    ["an owner that does not exist", randomUUID()],
    ["a deactivated owner", gone.id],
  ])("answers 400 for %s and writes nothing", async (_label, ownerId) => {
    const { app, cookieFor, projects, memberships } = setup();
    const res = await app.inject({
      method: "POST",
      url: "/api/projects",
      headers: { cookie: await cookieFor(admin) },
      payload: { name: "X", ownerId },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("validation_error");
    expect(projects).toHaveLength(0);
    expect(memberships).toHaveLength(0);
  });

  it("refuses a request from another origin", async () => {
    const { app, cookieFor, projects } = setup();
    const res = await app.inject({
      method: "POST",
      url: "/api/projects",
      headers: { cookie: await cookieFor(admin), origin: "https://evil.example.com" },
      payload: { name: "X", ownerId: owner.id },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({ error: "forbidden_origin" });
    expect(projects).toHaveLength(0);
  });

  it("answers 500 without details when the store fails", async () => {
    const { app, cookieFor } = setup({ failWith: new Error("connection string leaked") });
    const res = await app.inject({
      method: "POST",
      url: "/api/projects",
      headers: { cookie: await cookieFor(admin) },
      payload: { name: "X", ownerId: owner.id },
    });
    expect(res.statusCode).toBe(500);
    expect(res.json()).toEqual({ error: "internal_error" });
  });
});

describe("GET /api/projects", () => {
  async function seedTwoProjects(ctx: ReturnType<typeof setup>) {
    const post = async (name: string, ownerId: string) =>
      ctx.app.inject({
        method: "POST",
        url: "/api/projects",
        headers: { cookie: await ctx.cookieFor(admin) },
        payload: { name, ownerId },
      });
    await post("Zeta", owner.id);
    await post("Alpha", member.id);
  }

  it("shows the Super Admin every project, as SUPER_ADMIN, sorted by name", async () => {
    const ctx = setup();
    await seedTwoProjects(ctx);
    const res = await ctx.app.inject({
      method: "GET",
      url: "/api/projects",
      headers: { cookie: await ctx.cookieFor(admin) },
    });
    expect(res.statusCode).toBe(200);
    const { projects } = projectListResponseSchema.parse(res.json());
    expect(projects.map((p) => [p.name, p.role])).toEqual([
      ["Alpha", "SUPER_ADMIN"],
      ["Zeta", "SUPER_ADMIN"],
    ]);
    expect(projects[0]!.archivedAt).toBeNull();
  });

  it("shows a person only the projects they belong to, with their role", async () => {
    const ctx = setup();
    await seedTwoProjects(ctx);
    const res = await ctx.app.inject({
      method: "GET",
      url: "/api/projects",
      headers: { cookie: await ctx.cookieFor(owner) },
    });
    expect(res.statusCode).toBe(200);
    const { projects } = projectListResponseSchema.parse(res.json());
    expect(projects.map((p) => [p.name, p.role])).toEqual([["Zeta", "OWNER"]]);
  });

  it("answers an empty list for a person with no project", async () => {
    const ctx = setup();
    await seedTwoProjects(ctx);
    const res = await ctx.app.inject({
      method: "GET",
      url: "/api/projects",
      headers: { cookie: await ctx.cookieFor(loner) },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ projects: [] });
  });

  it("shows a Member and an Observer only their own project, with the right role, archived included", async () => {
    const ctx = setup();
    await seedTwoProjects(ctx);
    const shared = {
      id: randomUUID(),
      name: "Shared",
      archivedAt: new Date("2026-11-10T00:00:00Z"),
      createdAt: new Date(),
    };
    ctx.projects.push(shared);
    ctx.memberships.push(
      { projectId: shared.id, userId: member.id, role: "MEMBER" },
      { projectId: shared.id, userId: observer.id, role: "OBSERVER" },
    );
    const listFor = async (user: typeof member) => {
      const res = await ctx.app.inject({
        method: "GET",
        url: "/api/projects",
        headers: { cookie: await ctx.cookieFor(user) },
      });
      return projectListResponseSchema.parse(res.json()).projects.map((p) => [p.name, p.role, p.archivedAt]);
    };
    // `member` owns Alpha and is a Member of Shared; never sees Zeta, which belongs to `owner`.
    expect(await listFor(member)).toEqual([
      ["Alpha", "OWNER", null],
      ["Shared", "MEMBER", "2026-11-10T00:00:00.000Z"],
    ]);
    expect(await listFor(observer)).toEqual([["Shared", "OBSERVER", "2026-11-10T00:00:00.000Z"]]);
  });

  it("shows the Super Admin an archived project too", async () => {
    const ctx = setup();
    ctx.projects.push({
      id: randomUUID(),
      name: "Old",
      archivedAt: new Date("2026-11-10T00:00:00Z"),
      createdAt: new Date(),
    });
    const res = await ctx.app.inject({
      method: "GET",
      url: "/api/projects",
      headers: { cookie: await ctx.cookieFor(admin) },
    });
    expect(projectListResponseSchema.parse(res.json()).projects[0]!.archivedAt).toBe("2026-11-10T00:00:00.000Z");
  });

  it("answers 401 for a deactivated person", async () => {
    const { app, cookieFor } = setup();
    const res = await app.inject({ method: "GET", url: "/api/projects", headers: { cookie: await cookieFor(gone) } });
    expect(res.statusCode).toBe(401);
  });

  it("answers 401 without a session", async () => {
    const { app } = setup();
    const res = await app.inject({ method: "GET", url: "/api/projects" });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ error: "unauthorized" });
  });
});
