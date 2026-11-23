import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Dialog, DialogContent, DialogTrigger, DrawerContent } from "./dialog";

describe("Dialog", () => {
  it("opens with a title and description, and closes with the close button", async () => {
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent title="Rename card" description="Pick a new name.">
          <p>Body</p>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    const dialog = screen.getByRole("dialog", { name: "Rename card" });
    expect(dialog).toHaveAccessibleDescription("Pick a new name.");
    expect(dialog).toHaveClass("max-w-dialog-sm");
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent title="Card" size="md" />
      </Dialog>,
    );
    const trigger = screen.getByRole("button", { name: "Open" });
    await userEvent.click(trigger);
    expect(screen.getByRole("dialog")).toHaveClass("max-w-dialog");
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});

describe("DrawerContent", () => {
  it("is a dialog named by its title", async () => {
    render(
      <Dialog>
        <DialogTrigger>Menu</DialogTrigger>
        <DrawerContent title="Main menu">
          <nav>links</nav>
        </DrawerContent>
      </Dialog>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Menu" }));
    expect(screen.getByRole("dialog", { name: "Main menu" })).toBeInTheDocument();
  });
});
