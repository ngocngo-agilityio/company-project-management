import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { People } from "../People";

const ME_ID = "6f1c2f9e-5b0e-4f3a-9a53-3f0c2d9d1a11";
const NOW = new Date().toISOString();
const IN_11_DAYS = new Date(Date.now() + 11 * 24 * 60 * 60 * 1000 - 60_000).toISOString();
const DAYS_AGO_12 = new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString();

const me = (isSuperAdmin: boolean) => ({
  id: ME_ID,
  email: "a@example.com",
  name: "Quang Tran",
  avatarUrl: null,
  isSuperAdmin,
});

let counter = 0;
const invitation = (email: string, status: string, over: object = {}) => ({
  id: `00000000-0000-4000-8000-${String(++counter).padStart(12, "0")}`,
  email,
  project: null,
  role: null,
  status,
  invitedBy: { id: ME_ID, name: "Quang Tran" },
  createdAt: DAYS_AGO_12,
  expiresAt: NOW,
  ...over,
});

type Routes = {
  list?: () => Response;
  create?: (body: unknown) => Response;
};

/** One fetch stub for the whole screen. */
function mockApi(isSuperAdmin: boolean, routes: Routes) {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    if (url.endsWith("/api/me")) return Promise.resolve(Response.json(me(isSuperAdmin)));
    if (url.endsWith("/api/invitations") && init?.method === "POST") {
      return Promise.resolve(routes.create?.(JSON.parse(String(init.body))) ?? Response.json({}, { status: 500 }));
    }
    if (url.endsWith("/api/invitations")) {
      return Promise.resolve(routes.list?.() ?? Response.json({ invitations: [] }));
    }
    return Promise.resolve(new Response(null, { status: 404 }));
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderScreen() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <People />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("People screen", () => {
  it("shows a loading state first", async () => {
    mockApi(true, { list: () => Response.json({ invitations: [] }) });
    renderScreen();
    expect(await screen.findByRole("status", { name: "Loading invitations" })).toBeInTheDocument();
  });

  it("tells the Super Admin there are no invitations yet, with the invite button", async () => {
    mockApi(true, {});
    renderScreen();
    expect(await screen.findByText("No invitations yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Invite a person" })).toBeInTheDocument();
  });

  it("shows an error with a retry that loads the list", async () => {
    let calls = 0;
    const listed = invitation("new@example.com", "PENDING");
    mockApi(true, {
      list: () => (++calls === 1 ? new Response(null, { status: 500 }) : Response.json({ invitations: [listed] })),
    });
    renderScreen();
    expect(await screen.findByRole("alert")).toHaveTextContent("We could not load the invitations.");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("new@example.com")).toBeInTheDocument();
  });

  it("lists each invitation with its project, status and age, and the right actions per status", async () => {
    mockApi(true, {
      list: () =>
        Response.json({
          invitations: [
            invitation("pending@example.com", "PENDING", { expiresAt: IN_11_DAYS }),
            invitation("hr@example.com", "PENDING", {
              project: { id: "00000000-0000-4000-8000-0000000000aa", name: "HR onboarding" },
              role: "MEMBER",
            }),
            invitation("expired@example.com", "EXPIRED"),
            invitation("accepted@example.com", "ACCEPTED"),
            invitation("revoked@example.com", "REVOKED"),
          ],
        }),
    });
    renderScreen();
    const table = await screen.findByRole("table", { name: "Invitations" });
    const row = (email: string) => within(table).getByText(email).closest("tr")!;

    expect(row("pending@example.com")).toHaveTextContent("App access only");
    expect(row("pending@example.com")).toHaveTextContent("expires in 11 d");
    expect(row("hr@example.com")).toHaveTextContent("HR onboarding · Member");
    expect(row("pending@example.com")).toHaveTextContent("Pending");
    expect(row("pending@example.com")).toHaveTextContent("12 d ago");
    expect(within(row("pending@example.com")).getByRole("button", { name: /Copy link/ })).toBeInTheDocument();
    expect(within(row("pending@example.com")).queryByRole("button", { name: /Resend/ })).not.toBeInTheDocument();

    for (const email of ["expired@example.com", "accepted@example.com", "revoked@example.com"]) {
      expect(within(row(email)).queryByRole("button")).not.toBeInTheDocument();
    }
  });

  it("copies the sign-in link from a Pending row", async () => {
    const user = userEvent.setup();
    const listed = invitation("pending@example.com", "PENDING");
    mockApi(true, { list: () => Response.json({ invitations: [listed] }) });
    renderScreen();
    await user.click(await screen.findByRole("button", { name: "Copy link: pending@example.com" }));
    expect(await navigator.clipboard.readText()).toBe(`${window.location.origin}/login`);
    expect(screen.getByRole("status", { name: "" })).toHaveTextContent("Link copied");
  });

  it("shows a person who is not the Super Admin a refusal and never asks for the list", async () => {
    const fetchMock = mockApi(false, {});
    renderScreen();
    expect(await screen.findByText("Only the Super Admin can see this page.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Invite a person" })).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith("/api/invitations"))).toBe(false);
  });
});

describe("Invite dialog", () => {
  async function openDialog() {
    renderScreen();
    await userEvent.click(await screen.findByRole("button", { name: "Invite a person" }));
    return screen.getByRole("dialog");
  }

  it("creates the invitation and then shows the link to copy", async () => {
    const created = invitation("new@example.com", "PENDING");
    let body: unknown;
    mockApi(true, {
      create: (sent) => {
        body = sent;
        return Response.json(created, { status: 201 });
      },
    });
    const dialog = await openDialog();
    await userEvent.type(within(dialog).getByLabelText("Email (Google account)"), "New@Example.com");
    await userEvent.click(within(dialog).getByRole("button", { name: "Create invitation" }));

    expect(await within(dialog).findByText("Invitation created")).toBeInTheDocument();
    expect(body).toEqual({ email: "new@example.com" });
    expect(within(dialog).getByLabelText("Invitation link")).toHaveValue(`${window.location.origin}/login`);
  });

  it("asks for an email before calling the server", async () => {
    const fetchMock = mockApi(true, {});
    const dialog = await openDialog();
    await userEvent.click(within(dialog).getByRole("button", { name: "Create invitation" }));
    expect(await within(dialog).findByText("Enter an email address.")).toBeInTheDocument();

    await userEvent.type(within(dialog).getByLabelText("Email (Google account)"), "not-an-email");
    expect(await within(dialog).findByText("Enter a valid email address.")).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
  });

  it("explains a 409: the email already has an account or a pending invitation", async () => {
    mockApi(true, { create: () => Response.json({ error: "conflict" }, { status: 409 }) });
    const dialog = await openDialog();
    await userEvent.type(within(dialog).getByLabelText("Email (Google account)"), "mai@example.com");
    await userEvent.click(within(dialog).getByRole("button", { name: "Create invitation" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "already has an account or a pending invitation",
    );
  });

  it("shows a generic error when the server fails", async () => {
    mockApi(true, { create: () => new Response(null, { status: 500 }) });
    const dialog = await openDialog();
    await userEvent.type(within(dialog).getByLabelText("Email (Google account)"), "x@example.com");
    await userEvent.click(within(dialog).getByRole("button", { name: "Create invitation" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("We could not create the invitation");
  });
});
