import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PersonPicker, type PersonPickerProps } from "../PersonPicker";

const people = [
  { id: "p1", name: "Quang Tran", email: "quang@company.example" },
  { id: "p2", name: "Lan Nguyen", email: "lan@company.example" },
  { id: "p3", name: "Minh Pham", email: "minh@company.example" },
];

function setup(props: Partial<PersonPickerProps> = {}) {
  const onValueChange = vi.fn();
  render(<PersonPicker aria-label="Owner" people={people} value="p1" onValueChange={onValueChange} {...props} />);
  return { onValueChange, button: screen.getByRole("combobox", { name: "Owner" }) };
}

describe("PersonPicker", () => {
  it("shows the picked person on the button, reachable by label", () => {
    const { button } = setup();
    expect(button).toHaveTextContent("Quang Tran");
    expect(button).toHaveAttribute("aria-expanded", "false");
  });

  it("shows the placeholder while nobody is picked", () => {
    const { button } = setup({ value: "", placeholder: "Choose an owner" });
    expect(button).toHaveTextContent("Choose an owner");
  });

  it("opens a list of everyone and marks the picked one", async () => {
    const { button } = setup();
    await userEvent.click(button);
    expect(screen.getAllByRole("option")).toHaveLength(3);
    expect(screen.getByRole("option", { name: "Quang Tran" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("option", { name: "Lan Nguyen" })).toHaveAttribute("aria-selected", "false");
  });

  it("reports the clicked person and closes", async () => {
    const { button, onValueChange } = setup();
    await userEvent.click(button);
    await userEvent.click(screen.getByRole("option", { name: "Lan Nguyen" }));
    expect(onValueChange).toHaveBeenCalledWith("p2");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(button).toHaveFocus();
  });

  it("filters by name or email as you type", async () => {
    const { button } = setup();
    await userEvent.click(button);
    const search = screen.getByRole("combobox", { name: "Search people" });
    await userEvent.type(search, "MINH");
    expect(screen.getAllByRole("option")).toHaveLength(1);
    await userEvent.clear(search);
    await userEvent.type(search, "lan@");
    expect(screen.getByRole("option", { name: "Lan Nguyen" })).toBeInTheDocument();
    expect(screen.getAllByRole("option")).toHaveLength(1);
  });

  it("says so when the search matches nobody", async () => {
    const { button } = setup();
    await userEvent.click(button);
    await userEvent.type(screen.getByRole("combobox", { name: "Search people" }), "zzz");
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
    expect(screen.getByText("No one found")).toBeInTheDocument();
  });

  it("picks with the keyboard: arrows then Enter", async () => {
    const { button, onValueChange } = setup({ value: "" });
    button.focus();
    await userEvent.keyboard("{ArrowDown}");
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{Enter}");
    expect(onValueChange).toHaveBeenCalledWith("p3");
  });

  it("closes with Escape without picking", async () => {
    const { button, onValueChange } = setup();
    await userEvent.click(button);
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("adds the email only when two people share a name", async () => {
    const { button } = setup({
      value: "",
      people: [
        { id: "a", name: "Lan", email: "a@x.example" },
        { id: "b", name: "Lan", email: "b@x.example" },
        { id: "c", name: "Minh", email: "c@x.example" },
      ],
    });
    await userEvent.click(button);
    expect(screen.getByRole("option", { name: "Lan (a@x.example)" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Minh" })).toBeInTheDocument();
  });

  it("marks an invalid field for assistive tech", () => {
    const { button } = setup({ value: "", invalid: true });
    expect(button).toHaveAttribute("aria-invalid", "true");
    expect(button).toHaveClass("border-danger");
  });

  it("does not open when disabled", async () => {
    const { button } = setup({ disabled: true });
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
