import type { Meta, StoryObj } from "@storybook/react";
import type { AssessmentResponse } from "@/api/types";
import DraftSelectionModal from "./DraftSelectionModal";

const draft = (id: number, version?: number): AssessmentResponse => ({
  id,
  overallAverage: 0,
  overallMaturityLevel: "Not assessed",
  isCompleted: false,
  maturityModelId: version === 3 ? 10 : 9,
  maturityModelVersion: version,
  createdAt: "2026-01-10T09:00:00.000Z",
  updatedAt: "2026-01-15T14:30:00.000Z",
});

const meta = {
  title: "Assessment/Draft selection modal",
  component: DraftSelectionModal,
  args: {
    isOpen: true,
    modelName: "Cloud security maturity model",
    activeVersion: 3,
    actionInProgress: null,
    onClose: () => undefined,
    onContinueDraft: () => undefined,
    onStartNew: () => undefined,
  },
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
} satisfies Meta<typeof DraftSelectionModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CurrentAndLegacyDrafts: Story = {
  args: {
    selection: {
      currentDraft: draft(101, 3),
      legacyDrafts: [draft(98, 2), draft(91, 1)],
    },
  },
};

export const LegacyDraftsOnly: Story = {
  args: {
    selection: { currentDraft: null, legacyDrafts: [draft(98, 2)] },
  },
};

export const Error: Story = {
  args: {
    selection: { currentDraft: draft(101, 3), legacyDrafts: [] },
    error: "We could not clear the saved progress.",
  },
};
