import { describe, expect, it } from "vitest";
import { healthResponseSchema } from "@board/shared";
import { buildApp } from "../app.js";

describe("GET /health", () => {
  it("answers {ok:true}", async () => {
    const app = buildApp();
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(healthResponseSchema.parse(res.json())).toEqual({ ok: true });
    await app.close();
  });
});

describe("public pages", () => {
  it.each([
    ["/about", "Company Board"],
    ["/privacy", "Privacy policy"],
  ])("GET %s answers HTML without sign-in", async (url, text) => {
    const app = buildApp();
    const res = await app.inject({ method: "GET", url });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toMatch(/^text\/html/);
    expect(res.body).toContain(text);
    expect(res.headers["set-cookie"]).toBeUndefined();
    await app.close();
  });

  it("the privacy page shows a contact address", async () => {
    const app = buildApp();
    const res = await app.inject({ method: "GET", url: "/privacy" });
    expect(res.body).toMatch(/mailto:[^"\s]+@[^"\s]+/);
    await app.close();
  });
});

describe("CORS", () => {
  const WEB = "https://web.example.com";

  it("allows the configured web origin", async () => {
    const app = buildApp({ webOrigin: `${WEB}/` });
    const res = await app.inject({ method: "GET", url: "/health", headers: { origin: WEB } });
    expect(res.headers["access-control-allow-origin"]).toBe(WEB);
    await app.close();
  });

  it("never echoes another origin (the browser blocks it)", async () => {
    const app = buildApp({ webOrigin: WEB });
    const res = await app.inject({ method: "GET", url: "/health", headers: { origin: "https://evil.example.com" } });
    expect(res.headers["access-control-allow-origin"]).toBe(WEB);
    await app.close();
  });

  it("sends no CORS headers when WEB_ORIGIN is unset", async () => {
    const app = buildApp();
    const res = await app.inject({ method: "GET", url: "/health", headers: { origin: WEB } });
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
    await app.close();
  });
});
