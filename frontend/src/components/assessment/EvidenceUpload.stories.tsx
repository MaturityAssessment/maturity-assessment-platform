import type { Meta, StoryObj } from "@storybook/react";
import EvidenceUpload from "./EvidenceUpload";

const meta = { title: "Assessment/Evidence upload", component: EvidenceUpload, args: { practiceId: 42, items: [], onItemsChange: () => undefined }, tags: ["autodocs"] } satisfies Meta<typeof EvidenceUpload>;
export default meta;
type Story = StoryObj<typeof meta>;

export const FilesAndLinks: Story = {};
export const FilesOnly: Story = { args: { allowedType: "file", required: true } };
export const LinksOnly: Story = { args: { allowedType: "link" } };
export const ReadOnly: Story = { args: { readOnly: true } };
