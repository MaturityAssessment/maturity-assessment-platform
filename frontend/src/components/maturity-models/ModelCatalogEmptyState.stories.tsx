import type { Meta, StoryObj } from "@storybook/react";
import ModelCatalogEmptyState, { ModelCatalogLoadError } from "./ModelCatalogEmptyState";

const meta = {
  title: "Maturity models/Catalog states",
  component: ModelCatalogEmptyState,
  args: {
    filtered: false,
    canCreate: true,
    domainsUnavailable: false,
    onCreate: () => undefined,
    onClearFilters: () => undefined,
    onRetry: () => undefined,
  },
  tags: ["autodocs"],
} satisfies Meta<typeof ModelCatalogEmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CanCreate: Story = {};
export const FilteredNoResults: Story = { args: { filtered: true } };
export const DomainsUnavailable: Story = { args: { domainsUnavailable: true } };
export const NoDomain: Story = { args: { canCreate: false } };
export const LoadError: Story = {
  render: () => <ModelCatalogLoadError onRetry={() => undefined} />,
};
