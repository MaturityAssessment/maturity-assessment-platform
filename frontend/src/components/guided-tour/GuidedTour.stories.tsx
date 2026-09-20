import type { Meta, StoryObj } from "@storybook/react";
import GuidedTour from "./GuidedTour";

const meta = { title: "Guided tour/Guided tour", component: GuidedTour, parameters: { layout: "fullscreen" }, args: { open: true, onExit: () => undefined, steps: [{ id: "welcome", target: "tour-target", title: "Your workspace", description: "Use this area to start exploring your assessment workspace.", placement: "bottom" }] }, tags: ["autodocs"] } satisfies Meta<typeof GuidedTour>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = { render: (args) => <div className="min-h-[420px] bg-slate-50 p-12"><div data-help-tour="tour-target" className="w-fit rounded-lg bg-white p-6 shadow">Dashboard content</div><GuidedTour {...args} /></div> };
