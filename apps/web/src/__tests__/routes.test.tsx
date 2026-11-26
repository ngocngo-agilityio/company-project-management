import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { appRoutes } from "../routes";

function renderAt(path: string) {
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] });
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

/** Renders a private route and waits until the session check has let the screen through. */
async function renderPrivateAt(path: string) {
  const router = renderAt(path);
  await screen.findByRole("banner");
  return router;
}

const me = {
  id: "6f1c2f9e-5b0e-4f3a-9a53-3f0c2d9d1a11",
  email: "a@example.com",
  name: "A",
  avatarUrl: null,
  isSuperAdmin: false,
};

/** Signed in: /api/me answers the person, everything else answers {ok:true}. */
function mockSignedIn() {
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => Promise.resolve(Response.json(url.endsWith("/api/me") ? me : { ok: true }))),
  );
}

describe("routing", () => {
  beforeEach(mockSignedIn);
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
    await renderPrivateAt("/projects");
    const nav = screen.getAllByRole("navigation", { name: "Main" })[0]!;
    expect(within(nav).getByRole("link", { name: "Projects" })).toHaveAttribute("aria-current", "page");
    await user.click(within(nav).getByRole("link", { name: "People" }));
    expect(await screen.findByRole("heading", { level: 1, name: "People" })).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: "People" })).toHaveAttribute("aria-current", "page");
  });
});

describe("drawer", () => {
  beforeEach(mockSignedIn);
  afterEach(() => vi.unstubAllGlobals());

  it("opens from the menu button, navigates and closes", async () => {
    const user = userEvent.setup();
    await renderPrivateAt("/projects");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Open menu" }));
    const drawer = await screen.findByRole("dialog", { name: "Menu" });
    await user.click(within(drawer).getByRole("link", { name: "My cards" }));
    expect(await screen.findByRole("heading", { level: 1, name: "My cards" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes with Escape", async () => {
    const user = userEvent.setup();
    await renderPrivateAt("/projects");
    await user.click(screen.getByRole("button", { name: "Open menu" }));
    await screen.findByRole("dialog", { name: "Menu" });
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("About dialog", () => {
  beforeEach(mockSignedIn);
  afterEach(() => vi.unstubAllGlobals());

  it("opens and closes", async () => {
    const user = userEvent.setup();
    await renderPrivateAt("/projects");
    await user.click(screen.getAllByRole("button", { name: "About" })[0]!);
    expect(await screen.findByRole("dialog", { name: "Company Board" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("sidebar user card", () => {
  beforeEach(mockSignedIn);
  afterEach(() => vi.unstubAllGlobals());

  it("shows the guest avatar and status in the sidebar only", async () => {
    await renderPrivateAt("/projects");
    const [sidebar] = await screen.findAllByRole("navigation", { name: "Main" });
    const card = sidebar!.parentElement!;
    expect(within(card).getByRole("img", { name: "Guest" })).toBeInTheDocument();
    expect(within(card).getByText("Not signed in")).toBeInTheDocument();
    expect(within(screen.getByRole("banner")).queryByRole("img")).not.toBeInTheDocument();
  });
});
