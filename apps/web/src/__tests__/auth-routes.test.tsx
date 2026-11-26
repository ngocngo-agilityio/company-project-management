import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WAKE_UP_HINT_DELAY_MS } from "../constants/timing";
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

afterEach(() => vi.unstubAllGlobals());

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

  it("stores nothing about the session in the browser", async () => {
    signedIn();
    renderAt("/projects");
    await screen.findByRole("heading", { level: 1, name: "Projects" });
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });
});
