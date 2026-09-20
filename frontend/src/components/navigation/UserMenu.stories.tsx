import type { Meta, StoryObj } from "@storybook/react";
import UserMenu from "./UserMenu";
import { StoryAuthProvider } from "../../../.storybook/StoryAuthProvider";

const meta = { title: "Navigation/User menu", component: UserMenu, decorators: [(Story) => <StoryAuthProvider><Story /></StoryAuthProvider>], tags: ["autodocs"] } satisfies Meta<typeof UserMenu>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Top: Story = {};
export const Sidebar: Story = { args: { variant: "sidebar" } };
