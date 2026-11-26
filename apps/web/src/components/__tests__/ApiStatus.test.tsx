import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiStatus } from "../ApiStatus";

function renderStatus() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <ApiStatus />
    </QueryClientProvider>,
  );
}

function mockFetch(impl: () => Promise<Response>) {
  vi.stubGlobal("fetch", vi.fn(impl));
}

describe("API status", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("shows waking up while the request is pending", () => {
    mockFetch(() => new Promise(() => {}));
    renderStatus();
    expect(screen.getByRole("status")).toHaveTextContent("API: waking up…");
  });

  it("shows ok when /health answers {ok:true}", async () => {
    mockFetch(() => Promise.resolve(Response.json({ ok: true })));
    renderStatus();
    expect(await screen.findByText("API: ok")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith("/health", expect.anything());
  });

  it("shows unreachable on a network error", async () => {
    mockFetch(() => Promise.reject(new TypeError("Failed to fetch")));
    renderStatus();
    expect(await screen.findByText("API: unreachable")).toBeInTheDocument();
  });

  it("shows unreachable on a bad answer", async () => {
    mockFetch(() => Promise.resolve(Response.json({ ok: false })));
    renderStatus();
    expect(await screen.findByText("API: unreachable")).toBeInTheDocument();
  });
});
