import type { Meta, StoryObj } from "@storybook/react";
import SideNavbar from "./SideNavbar";
import { StoryAuthProvider } from "../../../.storybook/StoryAuthProvider";

const meta = { title: "Navigation/Side navbar", component: SideNavbar, parameters: { layout: "fullscreen", nextjs: { navigation: { pathname: "/dashboard" } } }, decorators: [(Story) => <StoryAuthProvider><Story /></StoryAuthProvider>], tags: ["autodocs"] } satisfies Meta<typeof SideNavbar>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Admin: Story = {};
