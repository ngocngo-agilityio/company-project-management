import type { Meta, StoryObj } from "@storybook/react-vite";
import { Logo } from "./logo";

const meta = { title: "Components/Logo", component: Logo } satisfies Meta<typeof Logo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Small: Story = { args: { size: 26 } };
export const Large: Story = { args: { size: 56 } };
