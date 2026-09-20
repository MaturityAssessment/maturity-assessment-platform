import type { Meta, StoryObj } from "@storybook/react";
import type { MaturityModelSummary } from "@/api/types";
import type { MaturityModelGroup } from "@/app/maturity-models/catalog";
import { ModelMetrics, ModelStatus } from "./ModelCatalogMetadata";

const model: MaturityModelSummary = {
  id: 10,
  name: "Security maturity model",
  description: "A model for assessing security capabilities.",
  dimensionCount: 4,
  moduleCount: 12,
  totalQuestions: 48,
  levelCount: 5,
  isActive: true,
  version: 3,
  createdAt: "2026-01-01T00:00:00.000Z",
};

const group: MaturityModelGroup = {
  baseModelId: 10,
  versions: [model],
  representative: model,
  activeVersion: model,
  latestVersion: model,
  createdAt: model.createdAt,
};

const meta = {
  title: "Maturity models/Catalog metadata",
  component: ModelMetrics,
  tags: ["autodocs"],
} satisfies Meta<typeof ModelMetrics>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Metrics: Story = { args: { model } };
export const ActiveStatus: Story = {
  args: { model },
  render: () => <ModelStatus group={group} />,
};
export const InactiveStatus: Story = {
  args: { model },
  render: () => <ModelStatus group={{ ...group, activeVersion: undefined }} />,
};
