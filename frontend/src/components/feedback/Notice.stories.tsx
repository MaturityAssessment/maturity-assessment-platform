import type { Meta, StoryObj } from "@storybook/react";
import Notice from "./Notice";

const meta = { title: "Feedback/Notice", component: Notice, args: { onDismiss: () => undefined, durationMs: 60000 }, tags: ["autodocs"] } satisfies Meta<typeof Notice>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Success: Story = { args: { type: "success", message: "Assessment saved successfully." } };
export const Warning: Story = { args: { type: "warning", message: "Some required questions are unanswered." } };
export const Error: Story = { args: { type: "error", message: "We could not load this assessment." } };
