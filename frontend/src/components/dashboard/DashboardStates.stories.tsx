import type { Meta, StoryObj } from "@storybook/react";
import { DashboardError, DashboardLoading } from "./DashboardStates";

const meta = {
  title: "Dashboard/States",
  component: DashboardLoading,
  tags: ["autodocs"],
} satisfies Meta<typeof DashboardLoading>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Loading: Story = {};
export const Error: Story = {
  render: () => <DashboardError message="We could not load the dashboard." onRetry={() => undefined} />,
};
