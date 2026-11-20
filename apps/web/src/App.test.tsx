import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { App } from "./App";

function renderApp() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <App />
    </QueryClientProvider>,
  );
}

describe("App", () => {
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
