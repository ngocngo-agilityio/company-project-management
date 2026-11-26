import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../Button/Button";
import { Alert } from "./Alert";

const meta = {
  title: "Components/Alert",
  component: Alert,
  args: { title: "Sign-in was cancelled or failed.", children: "Something went wrong with Google. Please try again." },
  decorators: [
    (Story) => (
      <div className="max-w-110">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const TitleOnly: Story = { args: { children: undefined } };
export const WithAction: Story = {
  args: { action: <Button variant="danger">Try again</Button> },
};
