import { afterEach, describe, expect, it } from "vitest";
import { peopleListResponseSchema } from "@board/shared";
import { makeUser, setupApp } from "./test-helpers.js";

const apps: Array<{ close(): Promise<unknown> }> = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((a) => a.close()));
});

const admin = makeUser({ name: "Ada", isSuperAdmin: true, googleId: "g-secret-1" });
const bao = makeUser({ name: "Bao", googleId: "g-secret-2" });
const gone = makeUser({ name: "Cuc", deactivatedAt: new Date("2026-11-01T00:00:00Z") });

function setup() {
  const ctx = setupApp([gone, bao, admin]);
  apps.push(ctx.app);
  return ctx;
}

describe("GET /api/people", () => {
  it("lists everyone to the Super Admin, sorted by name, with no Google id", async () => {
    const { app, cookieFor } = setup();
    const res = await app.inject({ method: "GET", url: "/api/people", headers: { cookie: await cookieFor(admin) } });
    expect(res.statusCode).toBe(200);
    const { people } = peopleListResponseSchema.parse(res.json());
    expect(people.map((p) => p.name)).toEqual(["Ada", "Bao", "Cuc"]);
    expect(people[2]!.deactivatedAt).toBe("2026-11-01T00:00:00.000Z");
    expect(res.body).not.toContain("googleId");
    expect(res.body).not.toContain("g-secret");
  });

  it("leaves out deactivated people with ?status=active", async () => {
    const { app, cookieFor } = setup();
    const res = await app.inject({
      method: "GET",
      url: "/api/people?status=active",
      headers: { cookie: await cookieFor(admin) },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().people.map((p: { name: string }) => p.name)).toEqual(["Ada", "Bao"]);
  });

  it("answers 400 for a status it does not know", async () => {
    const { app, cookieFor } = setup();
    const res = await app.inject({
      method: "GET",
      url: "/api/people?status=banana",
      headers: { cookie: await cookieFor(admin) },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("validation_error");
  });

  it("answers 403 for a person who is not Super Admin", async () => {
    const { app, cookieFor } = setup();
    const res = await app.inject({ method: "GET", url: "/api/people", headers: { cookie: await cookieFor(bao) } });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({ error: "forbidden" });
  });

  it("answers 403 for an Owner, a Member and an Observer of a project", async () => {
    const callers = (["OWNER", "MEMBER", "OBSERVER"] as const).map((role) => makeUser({ name: role }));
    const ctx = setupApp([admin, ...callers]);
    apps.push(ctx.app);
    ctx.projects.push({ id: "p-1", name: "P", archivedAt: null, createdAt: new Date() });
    callers.forEach((user, i) =>
      ctx.memberships.push({ projectId: "p-1", userId: user.id, role: (["OWNER", "MEMBER", "OBSERVER"] as const)[i]! }),
    );
    for (const caller of callers) {
      const res = await ctx.app.inject({
        method: "GET",
        url: "/api/people",
        headers: { cookie: await ctx.cookieFor(caller) },
      });
      expect(res.statusCode).toBe(403);
    }
  });

  it("answers 401 for a deactivated person", async () => {
    const { app, cookieFor } = setup();
    const res = await app.inject({ method: "GET", url: "/api/people", headers: { cookie: await cookieFor(gone) } });
    expect(res.statusCode).toBe(401);
  });

  it("answers 401 without a session", async () => {
    const { app } = setup();
    const res = await app.inject({ method: "GET", url: "/api/people" });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ error: "unauthorized" });
  });
});
