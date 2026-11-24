import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Logo } from "./logo";

describe("Logo", () => {
  it("is decorative and draws a 2x2 grid", () => {
    render(<Logo />);
    const logo = screen.getByTestId("logo");
    expect(logo).toHaveAttribute("aria-hidden", "true");
    expect(logo.querySelectorAll("i")).toHaveLength(4);
  });

  it("is 26px by default and 56px when asked", () => {
    const { rerender } = render(<Logo />);
    expect(screen.getByTestId("logo")).toHaveClass("size-6.5");
    rerender(<Logo size={56} />);
    expect(screen.getByTestId("logo")).toHaveClass("size-14");
  });
});
