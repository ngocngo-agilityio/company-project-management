import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, screen, userEvent, within } from "storybook/test";
import { Button } from "../button/button";
import { Dialog, DialogClose, DialogContent, DialogTrigger, DrawerContent } from "./dialog";

const meta = {
  title: "Components/Dialog",
  component: Dialog,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Opens the dialog so the accessibility check scans its content, not just the trigger. */
const openDialog: Story["play"] = async ({ canvasElement }) => {
  await userEvent.click(within(canvasElement).getByRole("button", { name: "Open" }));
  await expect(await screen.findByRole("dialog")).toBeVisible();
};

export const Small: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open</Button>
      </DialogTrigger>
      <DialogContent title="Delete project" description="This removes the project and its tasks for everyone.">
        <div className="flex justify-end gap-2">
          <DialogClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
          <Button variant="danger">Delete</Button>
        </div>
      </DialogContent>
    </Dialog>
  ),
  play: openDialog,
};

export const Medium: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open</Button>
      </DialogTrigger>
      <DialogContent title="Task details" description="Review the task before you assign it." size="md">
        <p className="text-body">Write the release notes for the next sprint.</p>
      </DialogContent>
    </Dialog>
  ),
  play: openDialog,
};

export const Drawer: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open</Button>
      </DialogTrigger>
      <DrawerContent title="Main menu">
        <nav aria-label="Main" className="flex flex-col gap-1 p-3">
          <a href="#projects" className="rounded-7 px-2.5 py-3 text-body text-ink hover:bg-surface-2">
            Projects
          </a>
          <a href="#people" className="rounded-7 px-2.5 py-3 text-body text-ink hover:bg-surface-2">
            People
          </a>
        </nav>
      </DrawerContent>
    </Dialog>
  ),
  play: openDialog,
};
