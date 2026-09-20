import type { Meta, StoryObj } from "@storybook/react";
import TourInvitation from "./TourInvitation";

const meta = { title: "Guided tour/Tour invitation", component: TourInvitation, args: { title: "New to the dashboard?", description: "Take a quick tour to learn where to find assessments, models, and reports.", onAccept: () => undefined, onDismiss: () => undefined }, tags: ["autodocs"] } satisfies Meta<typeof TourInvitation>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Compact: Story = { args: { compact: true } };
