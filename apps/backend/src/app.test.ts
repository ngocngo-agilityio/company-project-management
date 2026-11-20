import { describe, expect, it } from "vitest";
import { healthResponseSchema } from "@board/shared";
import { buildApp } from "./app.js";

describe("GET /health", () => {
  it("answers {ok:true}", async () => {
    const app = buildApp();
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(healthResponseSchema.parse(res.json())).toEqual({ ok: true });
    await app.close();
  });
});
