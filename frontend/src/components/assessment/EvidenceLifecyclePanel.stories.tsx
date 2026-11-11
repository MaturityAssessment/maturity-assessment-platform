import type { Meta, StoryObj } from "@storybook/react";
import type { AssessmentResponse, EvidenceFreshnessSummary } from "@/api/types";
import EvidenceLifecyclePanel from "./EvidenceLifecyclePanel";

export const currentExample: EvidenceFreshnessSummary = {
  evaluatedOn: "2026-12-02", calculatedAt: "2026-12-02T10:00:00Z", nextRefreshAt: null,
  requiredIndicatorCount: 1, outdatedIndicatorCount: 1, unknownDateIndicatorCount: 0, missingIndicatorCount: 0,
  indicators: [{ practiceId: 42, practiceName: "Incident management", requirementCode: "report", requirementName: "Monthly incident report",
    required: true, satisfied: true, status: "OUTDATED", maxAgeDays: 31, validThrough: "2026-12-01",
    records: [{ evidenceId: 1, collectedAt: "2026-10-31", status: "OUTDATED", ageDays: 32, validThrough: "2026-12-01" }] }],
};
export const completedExample: AssessmentResponse = { id: 10, status: "COMPLETED", isCompleted: true, overallAverage: 3.8,
  overallPercentageScore: 73, overallMaturityLevel: "Managed", createdAt: "2026-11-04T10:00:00Z", referenceDate: "2026-11-04",
  historicalEvidenceValidity: { ...currentExample, evaluatedOn: "2026-11-04", outdatedIndicatorCount: 0,
    indicators: currentExample.indicators.map(item => ({ ...item, status: "CURRENT", records: item.records.map(record => ({ ...record, status: "CURRENT", ageDays: 4 })) })) },
  currentEvidenceFreshness: currentExample,
};
const meta = { title: "Assessment/Evidence lifecycle", component: EvidenceLifecyclePanel,
  args: { assessment: completedExample, readOnly: true },
  render: args => <div className="max-w-3xl"><p className="mb-4 text-sm font-medium text-emerald-800">Completed · Score 73%</p><EvidenceLifecyclePanel {...args} /></div>,
} satisfies Meta<typeof EvidenceLifecyclePanel>;
export default meta;
type Story = StoryObj<typeof meta>;
export const HistoricalAndCurrent: Story = {};
export const RefreshFailed: Story = { args: { refreshingError: "Could not refresh current evidence freshness." } };
export const LegacyReferenceDate: Story = { args: { assessment: { ...completedExample, referenceDateInferred: true } } };
