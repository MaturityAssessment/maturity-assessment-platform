import type { Meta, StoryObj } from "@storybook/react";
import ProgressBar from "./ProgressBar";

const meta = { title: "Visualization/Progress bar", component: ProgressBar, args: { completed: 3, total: 8, stepTitle: "Define your maturity model", stepDescription: "Complete each step to publish the model.", previousLabel: "Back", nextLabel: "Next", onPrevious: () => undefined, onNext: () => undefined }, tags: ["autodocs"] } satisfies Meta<typeof ProgressBar>;
export default meta;
type Story = StoryObj<typeof meta>;

export const InProgress: Story = {};
export const Complete: Story = { args: { completed: 8, total: 8, stepTitle: "Ready to publish" } };
export const WithoutNavigation: Story = { args: { onPrevious: undefined, onNext: undefined, previousLabel: undefined, nextLabel: undefined } };
