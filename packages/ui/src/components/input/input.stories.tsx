import type { Meta, StoryObj } from "@storybook/react-vite";
import { Input } from "./input";

const meta = {
  title: "Components/Input",
  component: Input,
  // Every field needs a label for assistive tech; stories use aria-label because the page has no <label>.
  args: { "aria-label": "Project name", placeholder: "Project name" },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Filled: Story = { args: { defaultValue: "Website redesign" } };
export const Disabled: Story = { args: { disabled: true } };
export const Invalid: Story = { args: { invalid: true, defaultValue: "" } };
