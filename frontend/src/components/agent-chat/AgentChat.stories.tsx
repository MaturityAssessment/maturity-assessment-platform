import type { Meta, StoryObj } from "@storybook/react";
import AgentChat from "./AgentChat";

const meta = { title: "Agent chat/Chat", component: AgentChat, args: { context: "assessment", contextDetails: "Reviewing the security practice" }, parameters: { layout: "fullscreen" }, tags: ["autodocs"] } satisfies Meta<typeof AgentChat>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { render: (args) => <div className="mx-auto h-[560px] max-w-3xl p-4"><AgentChat {...args} /></div> };
export const Embedded: Story = { args: { hideHeader: true }, render: (args) => <div className="mx-auto h-[560px] max-w-3xl p-4"><AgentChat {...args} /></div> };
