import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, screen, userEvent, within } from "storybook/test";
import { PersonPicker, type PersonPickerProps } from "./PersonPicker";

const PEOPLE = [
  { id: "p1", name: "Quang Tran", email: "quang@company.example" },
  { id: "p2", name: "Lan Nguyen", email: "lan@company.example" },
  { id: "p3", name: "Minh Pham", email: "minh@company.example" },
  { id: "p4", name: "Hoa Le", email: "hoa@company.example" },
];

/** The component is controlled, so stories hold the value in state. */
function Controlled(args: PersonPickerProps) {
  const [value, setValue] = useState(args.value);
  return (
    <div className="w-72">
      <PersonPicker {...args} value={value} onValueChange={setValue} />
    </div>
  );
}

const meta = {
  title: "Components/PersonPicker",
  component: PersonPicker,
  render: (args) => <Controlled {...args} />,
  // Every field needs a label for assistive tech; stories use aria-label because the page has no <label>.
  args: { "aria-label": "Owner", people: PEOPLE, value: "p2", onValueChange: () => {} },
} satisfies Meta<typeof PersonPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Opens the list so the accessibility check scans the options and the search box, not just the button. */
const openList: Story["play"] = async ({ canvasElement }) => {
  await userEvent.click(within(canvasElement).getByRole("combobox", { name: "Owner" }));
  await expect(await screen.findByRole("listbox")).toBeVisible();
};

export const Default: Story = {};
export const Open: Story = { play: openList };
export const WithPlaceholder: Story = { args: { value: "", placeholder: "Choose an owner" } };
export const Searching: Story = {
  play: async (context) => {
    await openList?.(context);
    await userEvent.type(screen.getByRole("combobox", { name: "Search people" }), "mi");
    await expect(screen.getAllByRole("option")).toHaveLength(1);
  },
};
export const NoResults: Story = {
  play: async (context) => {
    await openList?.(context);
    await userEvent.type(screen.getByRole("combobox", { name: "Search people" }), "zzz");
    await expect(screen.getByText("No one found")).toBeVisible();
  },
};
export const SameName: Story = {
  args: {
    value: "a",
    people: [
      { id: "a", name: "Lan Nguyen", email: "lan@company.example" },
      { id: "b", name: "Lan Nguyen", email: "lan.nguyen@partner.example" },
    ],
  },
  play: openList,
};
export const Focused: Story = {
  play: async ({ canvas }) => {
    await userEvent.tab();
    await expect(canvas.getByRole("combobox", { name: "Owner" })).toHaveFocus();
  },
};
export const Invalid: Story = { args: { value: "", placeholder: "Choose an owner", invalid: true } };
export const Disabled: Story = { args: { disabled: true } };
