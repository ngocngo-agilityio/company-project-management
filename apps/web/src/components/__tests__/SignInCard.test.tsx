import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SignInCard } from "../SignInCard";

describe("SignInCard Google button", () => {
  it("shows a busy state after the first press and refuses a second press", () => {
    render(<SignInCard failure={null} />);
    const link = screen.getByRole("link", { name: "Continue with Google" });
    expect(link).toHaveAttribute("aria-busy", "false");

    // jsdom does not navigate; a click that reaches the link is not default-prevented.
    expect(fireEvent.click(link)).toBe(true);
    const busy = screen.getByRole("link", { name: "Opening Google…" });
    expect(busy).toHaveAttribute("aria-busy", "true");

    expect(fireEvent.click(busy)).toBe(false);
  });

  it("leaves the busy state when the page is restored from memory", () => {
    render(<SignInCard failure={null} />);
    fireEvent.click(screen.getByRole("link", { name: "Continue with Google" }));
    expect(screen.getByRole("link", { name: "Opening Google…" })).toBeInTheDocument();

    fireEvent(window, new PageTransitionEvent("pageshow", { persisted: true }));
    expect(screen.getByRole("link", { name: "Continue with Google" })).toHaveAttribute("aria-busy", "false");
  });
});
