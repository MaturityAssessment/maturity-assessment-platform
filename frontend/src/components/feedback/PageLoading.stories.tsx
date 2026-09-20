import type { Meta, StoryObj } from "@storybook/react";
import { PageLoading } from "./PageLoading";

const meta = { title: "Feedback/Page loading", component: PageLoading, parameters: { layout: "fullscreen" }, tags: ["autodocs"] } satisfies Meta<typeof PageLoading>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { message: "Loading assessment..." } };
export const Large: Story = { args: { size: "lg", message: "Preparing your workspace..." } };
