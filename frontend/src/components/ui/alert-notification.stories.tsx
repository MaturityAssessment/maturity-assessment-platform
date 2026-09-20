import type { Meta, StoryObj } from "@storybook/react";
import { AlertNotification } from "./alert-notification";

const meta = { title: "UI/Alert notification", component: AlertNotification, tags: ["autodocs"] } satisfies Meta<typeof AlertNotification>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Success: Story = { args: { payload: { variant: "success", title: "Saved", message: "Your changes were saved.", durationMs: 0 }, onDismiss: () => undefined } };
export const Error: Story = { args: { payload: { variant: "error", title: "Unable to save", message: "Please try again.", detail: "The server did not accept the request.", durationMs: 0 }, onDismiss: () => undefined } };
