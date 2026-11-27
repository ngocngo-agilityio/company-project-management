import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProjectBoard } from "../ProjectBoard";

const PROJECT_ID = "8b1c2f9e-5b0e-4f3a-9a53-3f0c2d9d1a33";
const MEMBER_ID = "6f1c2f9e-5b0e-4f3a-9a53-3f0c2d9d1a11";
const listed = {
  id: PROJECT_ID,
  name: "Launch",
  archivedAt: null as string | null,
  createdAt: "2026-11-20T10:00:00.000Z",
  role: "MEMBER",
  boardCount: 1,
  memberCount: 1,
  members: [{ id: MEMBER_ID, name: "Lan", avatarUrl: null }],
  openCardCount: 0,
  overdueCardCount: 0,
};

function renderAt(path: string, answer: () => Promise<Response>) {
  vi.stubGlobal("fetch", vi.fn(answer));
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/projects" element={<p>Projects list</p>} />
          <Route path="/projects/:projectId" element={<ProjectBoard />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("Project page (temporary)", () => {
  it("shows a loading state first", () => {
    renderAt(`/projects/${PROJECT_ID}`, () => new Promise(() => {}));
    expect(screen.getByRole("status", { name: "Loading project" })).toBeInTheDocument();
  });

  it("shows the project name, my role, the coming-soon line and a way back", async () => {
    renderAt(`/projects/${PROJECT_ID}`, () => Promise.resolve(Response.json({ projects: [listed] })));
    expect(await screen.findByRole("heading", { level: 1, name: "Launch" })).toBeInTheDocument();
    expect(screen.getByText("Your role: Member")).toBeInTheDocument();
    expect(screen.getByText("The board comes in a later sprint.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("link", { name: "Back to projects" }));
    expect(screen.getByText("Projects list")).toBeInTheDocument();
  });

  it("notes that an archived project is read-only", async () => {
    renderAt(`/projects/${PROJECT_ID}`, () =>
      Promise.resolve(Response.json({ projects: [{ ...listed, archivedAt: "2026-11-21T10:00:00.000Z" }] })),
    );
    expect(await screen.findByText("This project is archived and read-only.")).toBeInTheDocument();
  });

  it("says Page not found for a project that is not in the person's list", async () => {
    renderAt("/projects/9c1c2f9e-5b0e-4f3a-9a53-3f0c2d9d1a44", () =>
      Promise.resolve(Response.json({ projects: [listed] })),
    );
    expect(await screen.findByRole("heading", { level: 1, name: "Page not found" })).toBeInTheDocument();
  });

  it("shows an error with a retry when the list cannot be loaded", async () => {
    renderAt(`/projects/${PROJECT_ID}`, () => Promise.resolve(new Response(null, { status: 500 })));
    expect(await screen.findByRole("alert")).toHaveTextContent("We could not load your projects.");
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});
