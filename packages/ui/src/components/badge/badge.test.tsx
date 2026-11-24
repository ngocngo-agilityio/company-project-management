import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "./badge";

describe("Badge", () => {
  it("shows its text with the neutral tone by default", () => {
    render(<Badge>Owner</Badge>);
    expect(screen.getByText("Owner")).toHaveClass("bg-surface-2");
  });

  it("applies the chosen tone", () => {
    render(<Badge tone="danger">Overdue</Badge>);
    expect(screen.getByText("Overdue")).toHaveClass("bg-danger-soft", "text-danger");
  });
});
