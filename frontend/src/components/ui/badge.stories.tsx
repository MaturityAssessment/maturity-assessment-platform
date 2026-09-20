import type { Meta, StoryObj } from "@storybook/react";
import { Badge } from "./badge";

const meta = {
  title: "UI/Badge",
  component: Badge,
  args: { children: "Active", color: "emerald" },
  tags: ["autodocs"],
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithDot: Story = { args: { dot: true } };
export const Outlined: Story = { args: { dot: true, outlined: true } };
export const StatusPalette: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge color="blue">In progress</Badge>
      <Badge color="amber">Pending review</Badge>
      <Badge color="orange">Changes requested</Badge>
      <Badge color="emerald">Completed</Badge>
      <Badge color="slate">Inactive</Badge>
      <Badge color="violet">Curator</Badge>
    </div>
  ),
};
