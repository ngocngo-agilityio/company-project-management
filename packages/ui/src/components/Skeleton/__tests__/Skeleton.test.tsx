import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Skeleton } from "../Skeleton";

describe("Skeleton", () => {
  it("is hidden from screen readers", () => {
    const { container } = render(<Skeleton />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });

  it("pulses unless the person asked for less motion, and takes extra classes", () => {
    const { container } = render(<Skeleton className="h-4 w-20" />);
    expect(container.firstElementChild).toHaveClass("animate-pulse", "motion-reduce:animate-none", "h-4", "w-20");
  });
});
