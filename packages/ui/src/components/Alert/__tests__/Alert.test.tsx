import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Alert } from "../Alert";

describe("Alert", () => {
  it("is announced as an alert with its title and text", () => {
    render(<Alert title="Sign-in failed">Please try again.</Alert>);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Sign-in failed");
    expect(alert).toHaveTextContent("Please try again.");
  });

  it("shows the action when given", () => {
    render(<Alert title="Failed" action={<button type="button">Try again</button>} />);
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("uses the danger tokens", () => {
    render(<Alert title="Failed" />);
    expect(screen.getByRole("alert")).toHaveClass("bg-danger-soft", "text-danger");
  });
});
