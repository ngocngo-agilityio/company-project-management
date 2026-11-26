import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Chip } from "../Chip";

describe("Chip", () => {
  it("has no remove button unless onRemove is given", () => {
    render(<Chip>Sat 21 Nov</Chip>);
    expect(screen.getByText("Sat 21 Nov")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("names and fires the remove button", async () => {
    const onRemove = vi.fn();
    render(
      <Chip tone="warning" onRemove={onRemove}>
        High priority
      </Chip>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Remove High priority" }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
