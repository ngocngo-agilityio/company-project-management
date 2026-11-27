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

  it("shows a not-found page for unknown paths", async () => {
    renderAt("/nope");
    expect(await screen.findByRole("heading", { level: 1, name: "Page not found" })).toBeInTheDocument();
  });

  it("marks the current nav item and links only to screens that exist", async () => {
    await renderPrivateAt("/projects");
    const nav = screen.getAllByRole("navigation", { name: "Main" })[0]!;
    expect(within(nav).getByRole("link", { name: "Projects" })).toHaveAttribute("aria-current", "page");
    expect(within(nav).getAllByRole("link")).toHaveLength(1);
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
    await user.click(within(drawer).getByRole("link", { name: "Projects" }));
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

describe("sidebar user card", () => {
  beforeEach(mockSignedIn);
  afterEach(() => vi.unstubAllGlobals());

  it("shows the signed-in person and a Sign out button in the sidebar only", async () => {
    await renderPrivateAt("/projects");
    const [sidebar] = await screen.findAllByRole("navigation", { name: "Main" });
    const card = sidebar!.parentElement!;
    expect(await within(card).findByText(me.email)).toBeInTheDocument();
    expect(within(card).getByRole("img", { name: me.name })).toBeInTheDocument();
    expect(within(card).getByRole("button", { name: "Sign out" })).toBeInTheDocument();
    expect(within(screen.getByRole("banner")).queryByRole("img")).not.toBeInTheDocument();
  });
});
