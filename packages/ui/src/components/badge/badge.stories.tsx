import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge } from "./badge";

const meta = {
  title: "Components/Badge",
  component: Badge,
  args: { children: "Active" },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Neutral: Story = { args: { tone: "neutral", children: "Draft" } };
export const Accent: Story = { args: { tone: "accent", children: "In progress" } };
export const Danger: Story = { args: { tone: "danger", children: "Blocked" } };
export const Warning: Story = { args: { tone: "warning", children: "At risk" } };
export const Success: Story = { args: { tone: "success", children: "Done" } };
