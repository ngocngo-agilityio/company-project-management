import { afterEach, describe, expect, it } from "vitest";
import { invitationListResponseSchema, invitationResponseSchema } from "@board/shared";
import { INVITATION_TTL_MS } from "../../constants/index.js";
import { makeUser, NOW, setupApp, WEB } from "./test-helpers.js";

const apps: Array<{ close(): Promise<unknown> }> = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((a) => a.close()));
});

const admin = makeUser({ name: "Ada", email: "ada@example.com", isSuperAdmin: true });
const otherAdmin = makeUser({ name: "Bob", email: "bob@example.com", isSuperAdmin: true });
const member = makeUser({ name: "Mai", email: "mai@example.com" });
const gone = makeUser({ name: "Gia", email: "gia@example.com", deactivatedAt: new Date("2026-11-01T00:00:00Z") });

function setup() {
  const ctx = setupApp([admin, otherAdmin, member, gone]);
  apps.push(ctx.app);
  const post = async (url: string, caller = admin, body?: unknown) =>
    ctx.app.inject({
      method: "POST",
      url,
      headers: { cookie: await ctx.cookieFor(caller), origin: WEB },
      ...(body === undefined ? {} : { payload: body as object }),
    });
  const invite = (email: unknown, caller = admin) => post("/api/invitations", caller, { email });
  return { ...ctx, post, invite };
}

describe("POST /api/invitations", () => {
  it("creates a Pending invitation with no project, valid for 14 days, email in lowercase", async () => {
    const { invite } = setup();
    const res = await invite("  New.Person@Example.com ");
    expect(res.statusCode).toBe(201);
    const body = invitationResponseSchema.parse(res.json());
    expect(body).toMatchObject({
      email: "new.person@example.com",
      status: "PENDING",
      project: null,
      role: null,
      invitedBy: { id: admin.id, name: "Ada" },
      expiresAt: new Date(NOW.getTime() + INVITATION_TTL_MS).toISOString(),
    });
  });

  it("answers 409 for a person who already has an active account", async () => {
    const { invite } = setup();
    const res = await invite("MAI@example.com");
    expect(res.statusCode).toBe(409);
    expect(res.json().error).toBe("conflict");
  });

  it("answers 409 and points to Resend when the email already has a Pending invitation", async () => {
    const { invite } = setup();
    await invite("new@example.com");
    const res = await invite("new@example.com");
    expect(res.statusCode).toBe(409);
    expect(res.json().message).toContain("Resend");
  });

  it("reactivates a deactivated person at once: invitation Accepted, person active again", async () => {
    const { invite } = setup();
    const res = await invite("gia@example.com");
    expect(res.statusCode).toBe(201);
    expect(res.json().status).toBe("ACCEPTED");
    expect(gone.deactivatedAt).toBeNull();
  });

  it.each([[{}], [{ email: "not-an-email" }], [{ email: "" }], [{ email: `${"a".repeat(250)}@example.com` }]])(
    "answers 400 for the body %j",
    async (body) => {
      const { post } = setup();
      const res = await post("/api/invitations", admin, body);
      expect(res.statusCode).toBe(400);
      expect(res.json().error).toBe("validation_error");
    },
  );

  it("answers 403 for anyone who is not Super Admin", async () => {
    const { invite, invitationRows } = setup();
    const res = await invite("new@example.com", member);
    expect(res.statusCode).toBe(403);
    expect(invitationRows).toEqual([]);
  });

  it("answers 403 for an Owner, a Member and an Observer of a project", async () => {
    const callers = (["OWNER", "MEMBER", "OBSERVER"] as const).map((role) => makeUser({ name: role }));
    const ctx = setupApp([admin, ...callers]);
    apps.push(ctx.app);
    for (const caller of callers) {
      const res = await ctx.app.inject({
        method: "POST",
        url: "/api/invitations",
        headers: { cookie: await ctx.cookieFor(caller), origin: WEB },
        payload: { email: "new@example.com" },
      });
      expect(res.statusCode).toBe(403);
    }
    expect(ctx.invitationRows).toEqual([]);
  });

  it("answers 401 without a session", async () => {
    const { app } = setup();
    const res = await app.inject({
      method: "POST",
      url: "/api/invitations",
      headers: { origin: WEB },
      payload: { email: "new@example.com" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("refuses a request from another origin", async () => {
    const { app, cookieFor } = setup();
    const res = await app.inject({
      method: "POST",
      url: "/api/invitations",
      headers: { cookie: await cookieFor(admin), origin: "https://evil.example.com" },
      payload: { email: "new@example.com" },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error).toBe("forbidden_origin");
  });
});

describe("GET /api/invitations", () => {
  it("lists invitations newest first and reports a Pending one past its date as Expired", async () => {
    const ctx = setup();
    await ctx.invite("first@example.com");
    ctx.invitationRows[0]!.expiresAt = new Date(NOW.getTime() - 1);
    ctx.invitationRows[0]!.createdAt = new Date(NOW.getTime() - 1000);
    await ctx.invite("second@example.com");

    const res = await ctx.app.inject({
      method: "GET",
      url: "/api/invitations",
      headers: { cookie: await ctx.cookieFor(admin) },
    });
    expect(res.statusCode).toBe(200);
    const { invitations } = invitationListResponseSchema.parse(res.json());
    expect(invitations.map((i) => [i.email, i.status])).toEqual([
      ["second@example.com", "PENDING"],
      ["first@example.com", "EXPIRED"],
    ]);
  });

  it("answers 403 for a person who is not Super Admin and 401 without a session", async () => {
    const { app, cookieFor } = setup();
    const forbidden = await app.inject({
      method: "GET",
      url: "/api/invitations",
      headers: { cookie: await cookieFor(member) },
    });
    expect(forbidden.statusCode).toBe(403);
    const anonymous = await app.inject({ method: "GET", url: "/api/invitations" });
    expect(anonymous.statusCode).toBe(401);
  });
});

describe("POST /api/invitations/:id/resend", () => {
  it("starts 14 more days for a Pending invitation, by any Super Admin", async () => {
    const ctx = setup();
    await ctx.invite("new@example.com");
    const row = ctx.invitationRows[0]!;
    row.expiresAt = new Date(NOW.getTime() + 1000);

    const res = await ctx.post(`/api/invitations/${row.id}/resend`, otherAdmin);
    expect(res.statusCode).toBe(200);
    expect(invitationResponseSchema.parse(res.json())).toMatchObject({
      status: "PENDING",
      expiresAt: new Date(NOW.getTime() + INVITATION_TTL_MS).toISOString(),
      // The inviter stays the person who created it.
      invitedBy: { id: admin.id },
    });
  });

  it("makes an Expired invitation Pending again", async () => {
    const ctx = setup();
    await ctx.invite("new@example.com");
    const row = ctx.invitationRows[0]!;
    row.expiresAt = new Date(NOW.getTime() - 1);

    const res = await ctx.post(`/api/invitations/${row.id}/resend`);
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe("PENDING");
  });

  it("answers 409 for an Accepted or Revoked invitation", async () => {
    const ctx = setup();
    await ctx.invite("a@example.com");
    await ctx.invite("b@example.com");
    ctx.invitationRows[0]!.status = "ACCEPTED";
    ctx.invitationRows[1]!.status = "REVOKED";
    for (const row of ctx.invitationRows) {
      const res = await ctx.post(`/api/invitations/${row.id}/resend`);
      expect(res.statusCode).toBe(409);
    }
  });

  it("answers 404 for an unknown id and 400 for an id that is not a uuid", async () => {
    const { post } = setup();
    expect((await post("/api/invitations/6f1c1f0e-1c0a-4c53-8f6b-3a1f4f0d9a11/resend")).statusCode).toBe(404);
    const bad = await post("/api/invitations/nope/resend");
    expect(bad.statusCode).toBe(400);
    expect(bad.json().error).toBe("validation_error");
  });

  it("answers 403 for anyone who is not Super Admin and 401 without a session", async () => {
    const ctx = setup();
    await ctx.invite("new@example.com");
    const url = `/api/invitations/${ctx.invitationRows[0]!.id}/resend`;
    expect((await ctx.post(url, member)).statusCode).toBe(403);
    const anonymous = await ctx.app.inject({ method: "POST", url, headers: { origin: WEB } });
    expect(anonymous.statusCode).toBe(401);
  });
});
