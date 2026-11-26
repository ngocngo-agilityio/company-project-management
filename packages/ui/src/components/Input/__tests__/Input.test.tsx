import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Input } from "../Input";

describe("Input", () => {
  it("accepts typing and is reachable by label", async () => {
    render(
      <label>
        Name
        <Input />
      </label>,
    );
    const input = screen.getByLabelText("Name");
    await userEvent.type(input, "Linh");
    expect(input).toHaveValue("Linh");
  });

  it("marks an invalid field for assistive tech", () => {
    render(<Input aria-label="Email" invalid />);
    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveClass("border-danger");
  });

  it("is not marked invalid by default", () => {
    render(<Input aria-label="Email" />);
    expect(screen.getByLabelText("Email")).not.toHaveAttribute("aria-invalid");
  });
});
