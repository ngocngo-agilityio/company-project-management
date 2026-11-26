import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { appRoutes } from "../../routes";

const me = {
  id: "6f1c2f9e-5b0e-4f3a-9a53-3f0c2d9d1a11",
  email: "a@example.com",
  name: "A",
  avatarUrl: null,
  isSuperAdmin: false,
};

function mockSession(signedIn: boolean) {
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve(signedIn ? Response.json(me) : Response.json({ error: "unauthorized" }, { status: 401 })),
    ),
  );
}

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

describe("Sign-in screen", () => {
  it("shows the logo text, one Google button and no error by default", async () => {
    mockSession(false);
    renderAt("/login");
    expect(await screen.findByRole("heading", { level: 1, name: "Sign in to Company Board" })).toBeInTheDocument();
    const button = screen.getByRole("link", { name: "Continue with Google" });
    expect(button).toHaveAttribute("href", "/auth/google");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText(/Access is by invitation only/)).toBeInTheDocument();
  });

  it.each(["oauth_failed", "unverified_email", "something_new"])(
    "shows the failure box with Try again for ?error=%s",
    async (code) => {
      mockSession(false);
      renderAt(`/login?error=${code}`);
      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent("Sign-in failed.");
      expect(alert).toHaveTextContent("Something went wrong with Google. Please try again.");
      expect(screen.getByRole("link", { name: "Try again" })).toHaveAttribute("href", "/auth/google");
      expect(screen.getByRole("link", { name: "Continue with Google" })).toBeInTheDocument();
    },
  );

  it("says it was cancelled for ?error=access_denied", async () => {
    mockSession(false);
    renderAt("/login?error=access_denied");
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Sign-in was cancelled.");
    expect(alert).not.toHaveTextContent("Something went wrong");
    expect(screen.getByRole("link", { name: "Try again" })).toHaveAttribute("href", "/auth/google");
  });

  it("shows the wait message without Try again for ?error=rate_limited", async () => {
    mockSession(false);
    renderAt("/login?error=rate_limited");
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Too many sign-in attempts.");
    expect(alert).toHaveTextContent("Please wait a minute, then try again.");
    expect(screen.queryByRole("link", { name: "Try again" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Continue with Google" })).toBeInTheDocument();
  });

  it("shows the card at once, without waiting for the session check", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => {})),
    );
    renderAt("/login");
    expect(screen.getByRole("heading", { level: 1, name: "Sign in to Company Board" })).toBeInTheDocument();
    expect(screen.queryByText("Checking your session…")).not.toBeInTheDocument();
  });

  it("shows the not-invited card for ?error=not_invited", async () => {
    mockSession(false);
    renderAt("/login?error=not_invited");
    expect(await screen.findByRole("heading", { level: 1, name: "You have not been invited" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to sign in" })).toHaveAttribute("href", "/login");
    expect(screen.queryByRole("link", { name: "Continue with Google" })).not.toBeInTheDocument();
  });

  it("shows the inactive card for ?error=deactivated", async () => {
    mockSession(false);
    renderAt("/login?error=deactivated");
    expect(await screen.findByRole("heading", { level: 1, name: "Your account is inactive" })).toBeInTheDocument();
  });

  it.each(["not_invited", "deactivated"])(
    "never shows an email on the refusal card for ?error=%s, even if the address carries one",
    async (code) => {
      mockSession(false);
      renderAt(`/login?error=${code}&email=stranger@example.com`);
      await screen.findByRole("heading", { level: 1 });
      expect(document.body).not.toHaveTextContent("stranger@example.com");
      expect(document.body).not.toHaveTextContent("@");
    },
  );

  it("keeps the refusal card on /login and starts no session", async () => {
    mockSession(false);
    const router = renderAt("/login?error=not_invited");
    expect(await screen.findByRole("heading", { level: 1, name: "You have not been invited" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/login");
    expect(screen.queryByRole("heading", { level: 1, name: "Projects" })).not.toBeInTheDocument();
  });

  it("Back to sign in returns to the plain sign-in card", async () => {
    mockSession(false);
    const router = renderAt("/login?error=not_invited");
    await userEvent.click(await screen.findByRole("link", { name: "Back to sign in" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Sign in to Company Board" })).toBeInTheDocument();
    expect(router.state.location.search).toBe("");
  });

  it("sends a signed-in person to Projects", async () => {
    mockSession(true);
    const router = renderAt("/login");
    expect(await screen.findByRole("heading", { level: 1, name: "Projects" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/projects");
  });
});
