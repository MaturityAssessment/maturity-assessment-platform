import type { Meta, StoryObj } from "@storybook/react";
import NavButtons from "./NavButtons";

const meta = { title: "Navigation/Navigation buttons", component: NavButtons, args: { previousLabel: "Previous", nextLabel: "Next", onPrevious: () => undefined, onNext: () => undefined }, tags: ["autodocs"] } satisfies Meta<typeof NavButtons>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const FirstStep: Story = { args: { disablePrevious: true } };
export const LastStep: Story = { args: { disableNext: true } };
