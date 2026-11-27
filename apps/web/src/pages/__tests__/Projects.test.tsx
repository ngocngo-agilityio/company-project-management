import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Projects } from "../Projects";

const ME_ID = "6f1c2f9e-5b0e-4f3a-9a53-3f0c2d9d1a11";
const LAN_ID = "7a1c2f9e-5b0e-4f3a-9a53-3f0c2d9d1a22";
const PROJECT_ID = "8b1c2f9e-5b0e-4f3a-9a53-3f0c2d9d1a33";
const NOW = "2026-11-20T10:00:00.000Z";

const me = (isSuperAdmin: boolean) => ({
  id: ME_ID,
  email: "a@example.com",
  name: "Quang Tran",
  avatarUrl: null,
  isSuperAdmin,
});
const person = (id: string, name: string) => ({
  id,
  email: `${name.split(" ")[0]?.toLowerCase()}@example.com`,
  name,
  avatarUrl: null,
  isSuperAdmin: false,
  deactivatedAt: null,
});
let projectCounter = 0;
const project = (name: string, role: string, archivedAt: string | null = null, extra: object = {}) => ({
  id: `00000000-0000-4000-8000-${String(++projectCounter).padStart(12, "0")}`,
  name,
  archivedAt,
  createdAt: NOW,
  role,
  boardCount: 1,
  memberCount: 1,
  members: [{ id: ME_ID, name: "Quang Tran", avatarUrl: null }],
  openCardCount: 0,
  overdueCardCount: 0,
  ...extra,
});

type Routes = {
  projects?: () => Response;
  create?: (body: unknown) => Response;
  people?: () => Response;
  /** Answers `POST /api/projects/:id/archive` and `/restore`; gets the URL. */
  action?: (url: string) => Response;
};

/** One fetch stub for the whole screen. `projects` can answer differently each time it is asked. */
function mockApi(isSuperAdmin: boolean, routes: Routes) {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    if (url.endsWith("/api/me")) return Promise.resolve(Response.json(me(isSuperAdmin)));
    if (url.includes("/api/people")) {
      return Promise.resolve(
        routes.people?.() ?? Response.json({ people: [person(ME_ID, "Quang Tran"), person(LAN_ID, "Lan Nguyen")] }),
      );
    }
    if (/\/api\/projects\/[^/]+\/(archive|restore)$/.test(url) && init?.method === "POST") {
      return Promise.resolve(routes.action?.(url) ?? Response.json({}, { status: 500 }));
    }
    if (url.endsWith("/api/projects") && init?.method === "POST") {
      return Promise.resolve(routes.create?.(JSON.parse(String(init.body))) ?? Response.json({}, { status: 500 }));
    }
    if (url.endsWith("/api/projects")) return Promise.resolve(routes.projects?.() ?? Response.json({ projects: [] }));
    return Promise.resolve(new Response(null, { status: 404 }));
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderScreen() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <Projects />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("Projects screen", () => {
  it("shows a loading state first", () => {
    mockApi(false, { projects: () => Response.json({ projects: [] }) });
    renderScreen();
    expect(screen.getByRole("status", { name: "Loading projects" })).toBeInTheDocument();
  });

  it("tells a member with no project that nobody added them yet, with no create button", async () => {
    mockApi(false, {});
    renderScreen();
    expect(await screen.findByText("You have not been added to a project yet")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create project" })).not.toBeInTheDocument();
  });

  it("tells the Super Admin with no project to create the first one", async () => {
    mockApi(true, {});
    renderScreen();
    expect(await screen.findByText("No projects yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create project" })).toBeInTheDocument();
  });

  it("shows an error with a retry that loads the list", async () => {
    let calls = 0;
    mockApi(false, {
      projects: () =>
        ++calls === 1
          ? new Response(null, { status: 500 })
          : Response.json({ projects: [project("Launch", "MEMBER")] }),
    });
    renderScreen();
    expect(await screen.findByRole("alert")).toHaveTextContent("We could not load your projects.");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Launch")).toBeInTheDocument();
  });

  it("shows one card per active project with my role and an Open board link", async () => {
    const launch = project("Launch", "OWNER");
    mockApi(false, { projects: () => Response.json({ projects: [launch, project("Site", "OBSERVER")] }) });
    renderScreen();
    const list = await screen.findByRole("list", { name: "Your projects" });
    const cards = within(list).getAllByRole("listitem");
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveTextContent("Launch");
    expect(cards[0]).toHaveTextContent("Your role: Project Owner");
    expect(cards[1]).toHaveTextContent("Your role: Observer");
    expect(within(cards[0]!).getByRole("link", { name: /Open board/ })).toHaveAttribute(
      "href",
      `/projects/${launch.id}`,
    );
  });

  it("never shows a member an archived project, the Archive button or the archived section", async () => {
    mockApi(false, {
      projects: () => Response.json({ projects: [project("Launch", "MEMBER"), project("Old", "MEMBER", NOW)] }),
    });
    renderScreen();
    const list = await screen.findByRole("list", { name: "Your projects" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(1);
    expect(screen.queryByText("Old")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Archive project/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Archived projects" })).not.toBeInTheDocument();
  });

  it("shows the counts and the member avatars on a card, with +N for the rest", async () => {
    mockApi(false, {
      projects: () =>
        Response.json({
          projects: [
            project("Launch", "OWNER", null, {
              boardCount: 2,
              memberCount: 6,
              members: [
                { id: ME_ID, name: "Quang Tran", avatarUrl: null },
                { id: LAN_ID, name: "Lan Nguyen", avatarUrl: null },
              ],
              openCardCount: 10,
              overdueCardCount: 1,
            }),
          ],
        }),
    });
    renderScreen();
    const card = (await screen.findAllByRole("listitem"))[0]!;
    expect(card).toHaveTextContent("10open cards");
    expect(card).toHaveTextContent("1overdue");
    expect(card).toHaveTextContent("2boards");
    const group = within(card).getByRole("group", { name: "Members" });
    expect(within(group).getByRole("img", { name: "Quang Tran" })).toBeInTheDocument();
    expect(within(group).getByRole("img", { name: "Lan Nguyen" })).toBeInTheDocument();
    expect(within(group).getByLabelText("4 more members")).toHaveTextContent("+4");
  });

  it("says 1 board in the singular and shows no +N when everyone has an avatar", async () => {
    mockApi(false, { projects: () => Response.json({ projects: [project("Solo", "MEMBER")] }) });
    renderScreen();
    const card = (await screen.findAllByRole("listitem"))[0]!;
    expect(card).toHaveTextContent("1board");
    expect(within(card).queryByText(/^\+\d/)).not.toBeInTheDocument();
  });

  it("puts the page title and the create button of a Super Admin in one header", async () => {
    mockApi(true, {});
    renderScreen();
    const title = await screen.findByRole("heading", { level: 1, name: "Projects" });
    const create = await screen.findByRole("button", { name: "Create project" });
    expect(title.parentElement).toContainElement(create);
  });

  it("hides the create button from a member who has projects", async () => {
    mockApi(false, { projects: () => Response.json({ projects: [project("Launch", "MEMBER")] }) });
    renderScreen();
    await screen.findByText("Launch");
    expect(screen.queryByRole("button", { name: "Create project" })).not.toBeInTheDocument();
  });
});

describe("Create project dialog", () => {
  async function openDialog() {
    renderScreen();
    await userEvent.click(await screen.findByRole("button", { name: "Create project" }));
    return screen.findByRole("dialog", { name: "New project" });
  }

  it("preselects the Super Admin as owner and checks the name before sending", async () => {
    const fetchMock = mockApi(true, {});
    const dialog = await openDialog();
    await waitFor(() =>
      expect(within(dialog).getByRole("combobox", { name: "Owner" })).toHaveTextContent("Quang Tran"),
    );
    await userEvent.click(within(dialog).getByRole("button", { name: "Create project" }));
    expect(within(dialog).getByText("Enter a project name.")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Project name")).toHaveAttribute("aria-invalid", "true");
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
  });

  it("flags nothing before the first attempt, then puts focus on the name and clears the error as you type", async () => {
    mockApi(true, {});
    const dialog = await openDialog();
    const name = within(dialog).getByLabelText("Project name");
    expect(name).not.toHaveAttribute("aria-invalid");
    expect(within(dialog).getByRole("button", { name: "Create project" })).toBeEnabled();

    await userEvent.click(within(dialog).getByRole("button", { name: "Create project" }));
    expect(within(dialog).getByText("Enter a project name.")).toBeInTheDocument();
    expect(name).toHaveFocus();

    await userEvent.type(name, "Q");
    expect(within(dialog).queryByText("Enter a project name.")).not.toBeInTheDocument();
    expect(name).not.toHaveAttribute("aria-invalid");
  });

  it("creates the project with the picked owner, closes and refetches the list", async () => {
    let created = false;
    let sent: unknown;
    const create = vi.fn((body: unknown) => {
      sent = body;
      created = true;
      return Response.json(
        {
          id: PROJECT_ID,
          name: "Q1 planning",
          createdAt: NOW,
          board: { id: LAN_ID, name: "Main board", lists: [] },
          owner: { userId: LAN_ID, role: "OWNER" },
        },
        { status: 201 },
      );
    });
    mockApi(true, {
      create,
      projects: () => Response.json({ projects: created ? [project("Q1 planning", "SUPER_ADMIN")] : [] }),
    });
    const dialog = await openDialog();
    await userEvent.type(within(dialog).getByLabelText("Project name"), "  Q1 planning ");
    await waitFor(() =>
      expect(within(dialog).getByRole("combobox", { name: "Owner" })).toHaveTextContent("Quang Tran"),
    );
    await userEvent.click(within(dialog).getByRole("combobox", { name: "Owner" }));
    await userEvent.click(await screen.findByRole("option", { name: "Lan Nguyen" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Create project" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(create).toHaveBeenCalledOnce();
    expect(sent).toEqual({ name: "Q1 planning", ownerId: LAN_ID });
    expect(await screen.findByText("Q1 planning")).toBeInTheDocument();
  });

  it("keeps the dialog and the typed name open when the server refuses", async () => {
    mockApi(true, { create: () => Response.json({ error: "validation_error" }, { status: 400 }) });
    const dialog = await openDialog();
    await userEvent.type(within(dialog).getByLabelText("Project name"), "Site");
    await waitFor(() =>
      expect(within(dialog).getByRole("combobox", { name: "Owner" })).toHaveTextContent("Quang Tran"),
    );
    await userEvent.click(within(dialog).getByRole("button", { name: "Create project" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("did not accept");
    expect(within(dialog).getByLabelText("Project name")).toHaveValue("Site");
  });

  it("offers a retry when the people list fails to load", async () => {
    mockApi(true, { people: () => new Response(null, { status: 500 }) });
    const dialog = await openDialog();
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("We could not load the people list.");
    expect(within(dialog).getByRole("button", { name: "Create project" })).toBeDisabled();
  });
});

describe("Archive and restore", () => {
  /** Server state in a variable: the list answers what the last archive or restore left behind. */
  function setupArchiveApi(opts: { action?: (url: string) => Response } = {}) {
    let archivedAt: string | null = null;
    const launch = project("Launch", "SUPER_ADMIN");
    const fetchMock = mockApi(true, {
      projects: () => Response.json({ projects: [{ ...launch, archivedAt }] }),
      action: (url) => {
        if (opts.action) return opts.action(url);
        archivedAt = url.endsWith("/archive") ? NOW : null;
        return Response.json({ id: launch.id, archivedAt });
      },
    });
    const posts = () => fetchMock.mock.calls.filter(([, init]) => init?.method === "POST").map(([url]) => url);
    return { launch, posts };
  }

  it("shows the Super Admin an empty archived section and an Archive button on each card", async () => {
    setupArchiveApi();
    renderScreen();
    expect(await screen.findByRole("heading", { name: "Archived projects" })).toBeInTheDocument();
    expect(screen.getByText("No archived projects.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Archive project: Launch" })).toBeInTheDocument();
  });

  it("archives after a confirm, moves the project to the archived section, and restores it", async () => {
    const { launch, posts } = setupArchiveApi();
    renderScreen();
    await userEvent.click(await screen.findByRole("button", { name: "Archive project: Launch" }));
    const dialog = await screen.findByRole("dialog", { name: 'Archive "Launch"?' });
    expect(posts()).toEqual([]);
    await userEvent.click(within(dialog).getByRole("button", { name: "Archive project" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(posts()).toEqual([`/api/projects/${launch.id}/archive`]);
    const section = await screen.findByRole("region", { name: "Archived projects" });
    expect(within(section).getByText("Launch")).toBeInTheDocument();
    expect(within(section).getByText("Archived · read-only")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Your projects" })).not.toBeInTheDocument();

    await userEvent.click(within(section).getByRole("button", { name: "Restore: Launch" }));
    expect(await screen.findByRole("list", { name: "Your projects" })).toBeInTheDocument();
    expect(posts()).toEqual([`/api/projects/${launch.id}/archive`, `/api/projects/${launch.id}/restore`]);
    expect(await screen.findByText("No archived projects.")).toBeInTheDocument();
  });

  it("sends nothing when the confirm is cancelled", async () => {
    const { posts } = setupArchiveApi();
    renderScreen();
    await userEvent.click(await screen.findByRole("button", { name: "Archive project: Launch" }));
    const dialog = await screen.findByRole("dialog", { name: 'Archive "Launch"?' });
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(posts()).toEqual([]);
  });

  it("keeps the dialog open and says why when the server answers 409", async () => {
    setupArchiveApi({ action: () => Response.json({ error: "conflict" }, { status: 409 }) });
    renderScreen();
    await userEvent.click(await screen.findByRole("button", { name: "Archive project: Launch" }));
    const dialog = await screen.findByRole("dialog", { name: 'Archive "Launch"?' });
    await userEvent.click(within(dialog).getByRole("button", { name: "Archive project" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("already archived");
  });

  it("shows an alert when a restore fails", async () => {
    let archived = true;
    const launch = project("Launch", "SUPER_ADMIN", NOW);
    mockApi(true, {
      projects: () => Response.json({ projects: [{ ...launch, archivedAt: archived ? NOW : null }] }),
      action: () => {
        archived = true;
        return new Response(null, { status: 500 });
      },
    });
    renderScreen();
    await userEvent.click(await screen.findByRole("button", { name: "Restore: Launch" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("We could not restore the project.");
  });
});
