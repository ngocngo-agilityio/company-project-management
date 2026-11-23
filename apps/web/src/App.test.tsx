import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

function renderApp() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <App />
    </QueryClientProvider>,
  );
}

function mockFetch(impl: () => Promise<Response>) {
  vi.stubGlobal("fetch", vi.fn(impl));
}

describe("App", () => {
  beforeEach(() => mockFetch(() => Promise.resolve(Response.json({ ok: true }))));
  afterEach(() => vi.unstubAllGlobals());

  it("shows Hello Company Board", () => {
    renderApp();
    expect(screen.getByText("Hello Company Board")).toBeInTheDocument();
  });

  it("opens and closes the About dialog", () => {
    renderApp();
    expect(screen.queryByText("Walking skeleton.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("About"));
    expect(screen.getByText("Walking skeleton.")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Close"));
    expect(screen.queryByText("Walking skeleton.")).not.toBeInTheDocument();
  });
});

describe("API status", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("shows waking up while the request is pending", () => {
    mockFetch(() => new Promise(() => {}));
    renderApp();
    expect(screen.getByRole("status")).toHaveTextContent("API: waking up…");
  });

  it("shows ok when /health answers {ok:true}", async () => {
    mockFetch(() => Promise.resolve(Response.json({ ok: true })));
    renderApp();
    expect(await screen.findByText("API: ok")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith("/api/health", expect.anything());
  });

  it("shows unreachable on a network error", async () => {
    mockFetch(() => Promise.reject(new TypeError("Failed to fetch")));
    renderApp();
    expect(await screen.findByText("API: unreachable")).toBeInTheDocument();
  });

  it("shows unreachable on a bad answer", async () => {
    mockFetch(() => Promise.resolve(Response.json({ ok: false })));
    renderApp();
    expect(await screen.findByText("API: unreachable")).toBeInTheDocument();
  });
});
