import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Avatar, colorIndexOf, initialsOf } from "./avatar";

describe("initialsOf", () => {
  it("uses the first and last word", () => {
    expect(initialsOf("ngoc ngo thi")).toBe("NT");
    expect(initialsOf("Linh")).toBe("L");
    expect(initialsOf("  ")).toBe("?");
  });
});

describe("colorIndexOf", () => {
  it("is stable and within 1..6", () => {
    const index = colorIndexOf("Linh Tran");
    expect(index).toBe(colorIndexOf("Linh Tran"));
    expect(index).toBeGreaterThanOrEqual(1);
    expect(index).toBeLessThanOrEqual(6);
  });
});

describe("Avatar", () => {
  it("shows initials, the full name as label and tooltip", () => {
    render(<Avatar name="Linh Tran" colorIndex={2} />);
    const avatar = screen.getByRole("img", { name: "Linh Tran" });
    expect(avatar).toHaveAttribute("title", "Linh Tran");
    expect(avatar).toHaveTextContent("LT");
    expect(screen.getByText("LT")).toHaveClass("bg-avatar-2");
  });

  it("falls back to a hashed colour for a bad colorIndex", () => {
    render(<Avatar name="Linh Tran" colorIndex={9} />);
    expect(screen.getByText("LT").className).toMatch(/bg-avatar-[1-6]/);
  });
});
