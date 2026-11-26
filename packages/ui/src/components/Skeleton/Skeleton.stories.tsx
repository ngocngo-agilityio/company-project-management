import type { Meta, StoryObj } from "@storybook/react-vite";
import { Skeleton } from "./Skeleton";

const meta = {
  title: "Components/Skeleton",
  component: Skeleton,
  args: { className: "h-4 w-60" },
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Line: Story = {};
export const Block: Story = { args: { className: "h-24 w-80" } };
export const Circle: Story = { args: { className: "size-10 rounded-full" } };
