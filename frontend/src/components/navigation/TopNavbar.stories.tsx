import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "../ui/button";
import TopNavbar from "./TopNavbar";

const meta = { title: "Navigation/Top navbar", component: TopNavbar, args: { title: "Maturity models", subtitle: "Manage your organization’s assessment frameworks", showUserMenu: false }, parameters: { layout: "fullscreen" }, tags: ["autodocs"] } satisfies Meta<typeof TopNavbar>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithBackButton: Story = { args: { backButton: { href: "/dashboard", label: "Back to dashboard" }, rightActions: <Button size="sm">Create model</Button> } };
