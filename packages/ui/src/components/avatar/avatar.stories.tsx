import type { Meta, StoryObj } from "@storybook/react-vite";
import { Avatar } from "./avatar";

const IMAGE =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><rect width='64' height='64' fill='%23888'/></svg>";

const meta = {
  title: "Components/Avatar",
  component: Avatar,
  args: { name: "Linh Tran" },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Initials: Story = {};
export const WithImage: Story = { args: { src: IMAGE } };
export const BrokenImage: Story = { args: { src: "/missing-avatar.png" } };
export const Card22: Story = { args: { size: 22, colorIndex: 2 } };
export const Default26: Story = { args: { size: 26, colorIndex: 3 } };
export const Sidebar34: Story = { args: { size: 34, colorIndex: 4 } };

/** One avatar per palette colour, so every token pairing is contrast-checked. */
export const AllColors: Story = {
  render: () => (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5, 6].map((index) => (
        <Avatar key={index} name="Linh Tran" colorIndex={index} size={34} />
      ))}
    </div>
  ),
};
