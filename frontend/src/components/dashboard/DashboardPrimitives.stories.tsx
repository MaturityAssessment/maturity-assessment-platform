import type { Meta, StoryObj } from "@storybook/react";
import type { DashboardAssessmentView } from "@/app/dashboard/types";
import {
  AssessmentIcon,
  DashboardPanel,
  EmptyState,
  ProgressResult,
  StatusBadge,
} from "./DashboardPrimitives";

const assessment = (status: DashboardAssessmentView["status"]): DashboardAssessmentView => ({
  assessment: {
    id: 42,
    overallAverage: 3.2,
    overallMaturityLevel: "Defined",
    isCompleted: status === "completed",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  id: 42,
  name: "Security assessment",
  domain: "Security",
  progress: 68,
  scorePercentage: 64,
  maturityLevel: "Defined",
  updatedAtTime: Date.now(),
  updatedLabel: "Today",
  status,
  isDraft: status === "draft",
  hasChangesRequested: status === "changes-requested",
  isCompleted: status === "completed",
  canOpen: true,
});

const meta = {
  title: "Dashboard/Primitives",
  component: DashboardPanel,
  tags: ["autodocs"],
} satisfies Meta<typeof DashboardPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Panel: Story = {
  args: {
    title: "Continue your assessments",
    description: "Pick up where you left off.",
    children: <p className="text-sm text-slate-600">Assessment content</p>,
  },
};

export const AssessmentIconDefault: Story = {
  args: { title: "", description: "", children: null },
  render: () => <AssessmentIcon />,
};

export const AssessmentIconForDomain: Story = {
  args: { title: "", description: "", children: null },
  render: () => <AssessmentIcon domainName="Architecture" iconKey="layers" colorKey="blue" />,
};

export const Statuses: Story = {
  args: { title: "", description: "", children: null },
  render: () => (
    <div className="flex flex-wrap gap-3">
      <StatusBadge status="draft" />
      <StatusBadge status="pending-review" />
      <StatusBadge status="changes-requested" />
      <StatusBadge status="completed" />
    </div>
  ),
};

export const ProgressResults: Story = {
  args: { title: "", description: "", children: null },
  render: () => (
    <div className="space-y-4">
      <ProgressResult assessment={assessment("draft")} />
      <ProgressResult assessment={assessment("pending-review")} />
      <ProgressResult assessment={assessment("changes-requested")} />
      <ProgressResult assessment={assessment("completed")} />
    </div>
  ),
};

export const Empty: Story = {
  args: { title: "", description: "", children: null },
  render: () => (
    <EmptyState
      title="No assessments yet"
      description="Start an assessment to measure your organisation's maturity."
      href="/assessments/new"
      action="Start assessment"
    />
  ),
};
