import type { Meta, StoryObj } from "@storybook/react";
import AdminBreadcrumb from "./AdminBreadcrumb";

const meta = {
  title: "Admin/Admin breadcrumb",
  component: AdminBreadcrumb,
  parameters: { nextjs: { navigation: { pathname: "/admin/users" } } },
  tags: ["autodocs"],
} satisfies Meta<typeof AdminBreadcrumb>;

export default meta;
type Story = StoryObj<typeof meta>;

export const UserManagement: Story = { args: { current: "User management" } };
export const AssessmentManagement: Story = {
  args: { current: "Assessment management" },
};
