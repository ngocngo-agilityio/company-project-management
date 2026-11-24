import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Chip } from "./chip";

const meta = {
  title: "Components/Chip",
  component: Chip,
  args: { children: "Due Friday" },
} satisfies Meta<typeof Chip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Neutral: Story = { args: { tone: "neutral" } };
export const Accent: Story = { args: { tone: "accent" } };
export const Danger: Story = { args: { tone: "danger", children: "Overdue" } };
export const Warning: Story = { args: { tone: "warning", children: "Due today" } };
export const Success: Story = { args: { tone: "success", children: "Done" } };
export const Removable: Story = { args: { onRemove: fn() } };
