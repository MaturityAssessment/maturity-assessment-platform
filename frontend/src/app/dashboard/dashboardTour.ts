import type { TourPlacement } from "@/components/guided-tour/guidedTourGeometry";

export const DASHBOARD_TOUR_KEY = "dashboard";
export const DASHBOARD_TOUR_VERSION = 1;

export interface DashboardTourStep {
  id: string;
  target: string;
  title: string;
  description: string;
  placement: TourPlacement;
}

export const DASHBOARD_TOUR_STEPS = [
  {
    id: "side-navigation",
    target: "dashboard-side-nav",
    title: "Find your way around",
    description:
      "Use the side navigation to move between the areas available to your account.",
    placement: "right",
  },
  {
    id: "start-assessment",
    target: "dashboard-start-assessment",
    title: "Start a new assessment",
    description:
      "Start here to choose a maturity model and create an assessment you can work through.",
    placement: "bottom",
  },
  {
    id: "all-assessments",
    target: "dashboard-all-assessments",
    title: "Keep track of your assessments",
    description:
      "This area brings ongoing assessments and completed results together. Once you have assessments, use search and filters to find an item.",
    placement: "top",
  },
  {
    id: "assistant",
    target: "dashboard-assistant",
    title: "Ask the assessment assistant",
    description:
      "Chat with the assistant about the platform or your assessment work. It can answer questions, but it cannot change or submit an assessment for you.",
    placement: "left",
  },
] as const satisfies readonly DashboardTourStep[];

export const DASHBOARD_TOUR_STEP_COUNT = DASHBOARD_TOUR_STEPS.length;

export interface DashboardTourInvitationInput {
  enabled: boolean;
  completed: boolean;
  dismissed: boolean;
  loading: boolean;
  error?: string | null;
  submissionNoticeOpen: boolean;
  alreadyOffered: boolean;
}

export function shouldOfferDashboardTour({
  enabled,
  completed,
  dismissed,
  loading,
  error,
  submissionNoticeOpen,
  alreadyOffered,
}: DashboardTourInvitationInput) {
  return (
    enabled &&
    !completed &&
    !dismissed &&
    !loading &&
    !error &&
    !submissionNoticeOpen &&
    !alreadyOffered
  );
}

export interface DashboardTourProgress {
  current: number;
  total: number;
  isFirst: boolean;
  isLast: boolean;
}

export function getDashboardTourProgress(
  stepIndex: number
): DashboardTourProgress {
  const normalizedIndex = Number.isFinite(stepIndex)
    ? Math.trunc(stepIndex)
    : 0;
  const boundedIndex = Math.min(
    Math.max(normalizedIndex, 0),
    DASHBOARD_TOUR_STEP_COUNT - 1
  );

  return {
    current: boundedIndex + 1,
    total: DASHBOARD_TOUR_STEP_COUNT,
    isFirst: boundedIndex === 0,
    isLast: boundedIndex === DASHBOARD_TOUR_STEP_COUNT - 1,
  };
}
