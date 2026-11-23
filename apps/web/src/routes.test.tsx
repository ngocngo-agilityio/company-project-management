import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { appRoutes } from "./routes";

function renderAt(path: string) {
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] });
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

function mockFetch(impl: () => Promise<Response>) {
  vi.stubGlobal("fetch", vi.fn(impl));
}

describe("routing", () => {
  beforeEach(() => mockFetch(() => Promise.resolve(Response.json({ ok: true }))));
  afterEach(() => vi.unstubAllGlobals());

  it("redirects / to Projects", async () => {
    const router = renderAt("/");
    expect(await screen.findByRole("heading", { level: 1, name: "Projects" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/projects");
  });

  it.each([
    ["/my-cards", "My cards"],
    ["/people", "People"],
  ])("renders %s with its title", async (path, title) => {
    renderAt(path);
    expect(await screen.findByRole("heading", { level: 1, name: title })).toBeInTheDocument();
  });

  it("shows a not-found page for unknown paths", async () => {
    renderAt("/nope");
    expect(await screen.findByRole("heading", { level: 1, name: "Page not found" })).toBeInTheDocument();
  });

  it("marks the current nav item and navigates", async () => {
    const user = userEvent.setup();
    renderAt("/projects");
    const nav = screen.getAllByRole("navigation", { name: "Main" })[0]!;
    expect(within(nav).getByRole("link", { name: "Projects" })).toHaveAttribute("aria-current", "page");
    await user.click(within(nav).getByRole("link", { name: "People" }));
    expect(await screen.findByRole("heading", { level: 1, name: "People" })).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: "People" })).toHaveAttribute("aria-current", "page");
  });
});

describe("drawer", () => {
  beforeEach(() => mockFetch(() => Promise.resolve(Response.json({ ok: true }))));
  afterEach(() => vi.unstubAllGlobals());

  it("opens from the menu button, navigates and closes", async () => {
    const user = userEvent.setup();
    renderAt("/projects");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Open menu" }));
    const drawer = await screen.findByRole("dialog", { name: "Menu" });
    await user.click(within(drawer).getByRole("link", { name: "My cards" }));
    expect(await screen.findByRole("heading", { level: 1, name: "My cards" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes with Escape", async () => {
    const user = userEvent.setup();
    renderAt("/projects");
    await user.click(screen.getByRole("button", { name: "Open menu" }));
    await screen.findByRole("dialog", { name: "Menu" });
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("About dialog", () => {
  beforeEach(() => mockFetch(() => Promise.resolve(Response.json({ ok: true }))));
  afterEach(() => vi.unstubAllGlobals());

  it("opens and closes", async () => {
    const user = userEvent.setup();
    renderAt("/projects");
    await user.click(screen.getAllByRole("button", { name: "About" })[0]!);
    expect(await screen.findByRole("dialog", { name: "Company Board" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
