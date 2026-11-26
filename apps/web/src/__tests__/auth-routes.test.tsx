import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SESSION_HINT_STORAGE_KEY, WAKE_UP_HINT_DELAY_MS } from "../constants";
import { appRoutes } from "../routes";

const me = {
  id: "6f1c2f9e-5b0e-4f3a-9a53-3f0c2d9d1a11",
  email: "a@example.com",
  name: "A",
  avatarUrl: null,
  isSuperAdmin: false,
};

function mockMe(answer: () => Promise<Response>) {
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => (url.endsWith("/api/me") ? answer() : Promise.resolve(Response.json({ ok: true })))),
  );
}
const signedOut = () => mockMe(() => Promise.resolve(Response.json({ error: "unauthorized" }, { status: 401 })));
const signedIn = () => mockMe(() => Promise.resolve(Response.json(me)));

function renderAt(path: string) {
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] });
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
  sessionStorage.clear();
});

describe("route guard", () => {
  it.each(["/", "/projects", "/my-cards", "/people", "/nope"])("sends %s to /login without a session", async (path) => {
    signedOut();
    const router = renderAt(path);
    expect(await screen.findByRole("heading", { level: 1, name: "Sign in to Company Board" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/login");
  });

  it("shows an app-shaped placeholder, not bare text, while the session is checked", () => {
    mockMe(() => new Promise(() => {}));
    renderAt("/projects");
    expect(screen.getByRole("status")).toHaveTextContent("Loading");
    expect(screen.queryByText("Checking your session…")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Projects" })).not.toBeInTheDocument();
  });

  it("says the server may be waking up when the check is slow", () => {
    vi.useFakeTimers();
    try {
      mockMe(() => new Promise(() => {}));
      renderAt("/projects");
      expect(screen.queryByText(/Waking up the server/)).not.toBeInTheDocument();
      act(() => void vi.advanceTimersByTime(WAKE_UP_HINT_DELAY_MS));
      expect(screen.getByText(/Waking up the server/)).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("lets a signed-in person reach Projects", async () => {
    signedIn();
    renderAt("/projects");
    expect(await screen.findByRole("heading", { level: 1, name: "Projects" })).toBeInTheDocument();
  });

  it("shows an error with Try again when the session check fails, and recovers", async () => {
    let fail = true;
    mockMe(() => (fail ? Promise.resolve(new Response("boom", { status: 500 })) : Promise.resolve(Response.json(me))));
    renderAt("/projects");
    expect(await screen.findByRole("alert")).toHaveTextContent("We could not check your session.");
    fail = false;
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Projects" })).toBeInTheDocument();
  });

  it("Sign out ends the session, goes to /login and keeps private pages out of Back history", async () => {
    let signedInNow = true;
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (url.endsWith("/auth/logout")) {
        signedInNow = false;
        return Promise.resolve(new Response(null, { status: 204 }));
      }
      if (url.endsWith("/api/me")) {
        return Promise.resolve(
          signedInNow ? Response.json(me) : Response.json({ error: "unauthorized" }, { status: 401 }),
        );
      }
      return Promise.resolve(Response.json({ ok: true }, init));
    });
    vi.stubGlobal("fetch", fetchMock);
    const router = renderAt("/projects");
    await screen.findByRole("heading", { level: 1, name: "Projects" });

    await userEvent.click(screen.getAllByRole("button", { name: "Sign out" })[0]!);

    expect(await screen.findByRole("heading", { level: 1, name: "Sign in to Company Board" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/login");
    expect(fetchMock).toHaveBeenCalledWith("/auth/logout", { method: "POST", credentials: "include" });
    expect(localStorage.getItem(SESSION_HINT_STORAGE_KEY)).toBeNull();
    // `replace`: going back does not return to the private page.
    await act(() => router.navigate(-1));
    expect(screen.queryByRole("heading", { level: 1, name: "Projects" })).not.toBeInTheDocument();
  });

  it("stays signed in and says so when the sign-out request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) =>
        url.endsWith("/auth/logout")
          ? Promise.reject(new Error("offline"))
          : Promise.resolve(url.endsWith("/api/me") ? Response.json(me) : Response.json({ ok: true })),
      ),
    );
    const router = renderAt("/projects");
    await screen.findByRole("heading", { level: 1, name: "Projects" });
    await userEvent.click(screen.getAllByRole("button", { name: "Sign out" })[0]!);
    expect(await screen.findByRole("alert")).toHaveTextContent("We could not sign you out");
    expect(router.state.location.pathname).toBe("/projects");
  });

  it("stores no token or personal data in the browser, only the two UX hints", async () => {
    signedIn();
    renderAt("/projects");
    await screen.findByRole("heading", { level: 1, name: "Projects" });
    // The only allowed entries: a "1" flag and (while signed out) an internal path. Never the person or a token.
    expect(Object.keys(localStorage)).toEqual([SESSION_HINT_STORAGE_KEY]);
    expect(localStorage.getItem(SESSION_HINT_STORAGE_KEY)).toBe("1");
    expect(sessionStorage.length).toBe(0);
    const everything = JSON.stringify({ ...localStorage, ...sessionStorage });
    expect(everything).not.toContain(me.email);
    expect(everything).not.toContain(me.id);
  });
});
