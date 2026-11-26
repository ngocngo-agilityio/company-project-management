import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchMe, logout } from "../client";

const me = {
  id: "6f1c2f9e-5b0e-4f3a-9a53-3f0c2d9d1a11",
  email: "a@example.com",
  name: "A",
  avatarUrl: null,
  isSuperAdmin: false,
};

afterEach(() => vi.unstubAllGlobals());

describe("fetchMe", () => {
  it("sends the cookie and returns the person", async () => {
    const fetchMock = vi.fn(() => Promise.resolve(Response.json(me)));
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchMe()).resolves.toEqual(me);
    expect(fetchMock).toHaveBeenCalledWith("/api/me", { credentials: "include" });
  });

  it("returns null when not signed in (401)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(Response.json({ error: "unauthorized" }, { status: 401 }))),
    );
    await expect(fetchMe()).resolves.toBeNull();
  });

  it("throws on any other error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response("x", { status: 500 }))),
    );
    await expect(fetchMe()).rejects.toThrow(/500/);
  });
});

describe("logout", () => {
  it("posts with the cookie", async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response(null, { status: 204 })));
    vi.stubGlobal("fetch", fetchMock);
    await expect(logout()).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith("/auth/logout", { method: "POST", credentials: "include" });
  });

  it("throws when the server refuses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response("x", { status: 500 }))),
    );
    await expect(logout()).rejects.toThrow(/500/);
  });
});
