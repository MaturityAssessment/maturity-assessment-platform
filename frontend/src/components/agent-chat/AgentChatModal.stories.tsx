import type { Meta, StoryObj } from "@storybook/react";
import AgentChatModal from "./AgentChatModal";

const meta = { title: "Agent chat/Chat modal", component: AgentChatModal, args: { isOpen: true, onClose: () => undefined, context: "assessment", contextDetails: "Reviewing the security practice" }, parameters: { layout: "fullscreen" }, tags: ["autodocs"] } satisfies Meta<typeof AgentChatModal>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Open: Story = {};
