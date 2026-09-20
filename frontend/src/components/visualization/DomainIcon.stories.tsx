import type { Meta, StoryObj } from "@storybook/react";
import { DomainIcon } from "./DomainIcon";

const meta = { title: "Visualization/Domain icon", component: DomainIcon, tags: ["autodocs"] } satisfies Meta<typeof DomainIcon>;
export default meta;
type Story = StoryObj<typeof meta>;

export const BlueLayers: Story = { args: { iconKey: "layers", colorKey: "blue", name: "Architecture" } };
export const Shield: Story = { args: { iconKey: "shield", colorKey: "emerald", name: "Security", size: 24 } };
export const Fallback: Story = { args: { name: "Unconfigured domain" } };
