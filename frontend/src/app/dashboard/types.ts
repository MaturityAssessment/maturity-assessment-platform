import type { AssessmentResponse } from "@/api/types";

export type DashboardAssessmentStatus =
  | "draft"
  | "changes-requested"
  | "pending-review"
  | "completed";

export type DashboardAssessmentView = {
  assessment: AssessmentResponse;
  id: number;
  name: string;
  domain: string;
  domainIconKey?: string;
  domainColorKey?: string;
  version?: number;
  progress: number;
  scorePercentage: number | null;
  maturityLevel: string;
  updatedAtTime: number;
  updatedLabel: string;
  status: DashboardAssessmentStatus;
  isDraft: boolean;
  hasChangesRequested: boolean;
  isCompleted: boolean;
  canOpen: boolean;
};
