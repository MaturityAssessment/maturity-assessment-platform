import type { AssessmentResponse, MaturityModelSummary } from "@/api/types";
import type {
  DashboardAssessmentStatus,
  DashboardAssessmentView,
} from "./types";

export type ModelDetails = Record<number, MaturityModelSummary>;

export function getAssessmentTime(assessment: AssessmentResponse) {
  return new Date(assessment.updatedAt || assessment.createdAt).getTime();
}

export function sortAssessments(assessments: AssessmentResponse[]) {
  return [...assessments].sort(
    (a, b) => getAssessmentTime(b) - getAssessmentTime(a)
  );
}

export function getAssessmentModel(
  assessment: AssessmentResponse,
  models: ModelDetails
) {
  return assessment.maturityModelId
    ? models[assessment.maturityModelId]
    : undefined;
}

export function getAssessmentName(
  assessment: AssessmentResponse,
  models: ModelDetails
) {
  const model = getAssessmentModel(assessment, models);
  if (model) return model.name;
  if (assessment.domainName) return `${assessment.domainName} assessment`;
  if (assessment.maturityModelId) {
    return `Maturity Model #${assessment.maturityModelId}`;
  }
  return "Maturity assessment";
}

export function getAssessmentVersion(
  assessment: AssessmentResponse,
  models: ModelDetails
) {
  return (
    assessment.maturityModelVersion ??
    getAssessmentModel(assessment, models)?.version
  );
}

export function getAssessmentDomain(
  assessment: AssessmentResponse,
  models: ModelDetails
) {
  return (
    assessment.domainName ??
    getAssessmentModel(assessment, models)?.domainName ??
    "General"
  );
}

export function getAssessmentProgress(
  assessment: AssessmentResponse,
  models: ModelDetails
) {
  if (assessment.status !== "DRAFT") return 100;

  const totalQuestions =
    getAssessmentModel(assessment, models)?.totalQuestions ?? 0;
  if (totalQuestions === 0) return 0;

  const responseFields = Object.values(
    assessment.questionEvaluations ?? {}
  ).filter((evaluation) => evaluation.response !== null && evaluation.response !== undefined);
  return Math.min(
    100,
    Math.round((responseFields.length / totalQuestions) * 100)
  );
}

export function getAssessmentScorePercentage(
  assessment: AssessmentResponse,
  models: ModelDetails
) {
  if (assessment.overallPercentageScore != null) {
    return Math.round(assessment.overallPercentageScore);
  }

  const levelCount = getAssessmentModel(assessment, models)?.levelCount;
  if (!levelCount || assessment.overallAverage == null) return null;
  return Math.round((assessment.overallAverage / levelCount) * 100);
}

export function getAssessmentStatus(
  assessment: AssessmentResponse
): DashboardAssessmentStatus {
  if (assessment.status === "DRAFT") return "draft";
  if (assessment.status === "CHANGES_REQUESTED") return "changes-requested";
  if (assessment.status === "COMPLETED" || assessment.isCompleted) {
    return "completed";
  }
  return "pending-review";
}

export function canOpenAssessment(assessment: AssessmentResponse) {
  const status = getAssessmentStatus(assessment);
  return (
    status === "draft" ||
    status === "changes-requested" ||
    status === "completed"
  );
}

export function formatRelativeDate(value: string, now = Date.now()) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "Recently";

  const elapsed = Math.max(0, now - timestamp);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (elapsed < minute) return "Just now";
  if (elapsed < hour) {
    const minutes = Math.floor(elapsed / minute);
    return `${minutes} min${minutes === 1 ? "" : "s"} ago`;
  }
  if (elapsed < day) {
    const hours = Math.floor(elapsed / hour);
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  if (elapsed < 7 * day) {
    const days = Math.floor(elapsed / day);
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }

  const date = new Date(value);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year:
      date.getFullYear() === new Date(now).getFullYear()
        ? undefined
        : "numeric",
  });
}

export function buildAssessmentView(
  assessment: AssessmentResponse,
  models: ModelDetails,
  now = Date.now()
): DashboardAssessmentView {
  const status = getAssessmentStatus(assessment);
  return {
    assessment,
    id: assessment.id,
    name: getAssessmentName(assessment, models),
    domain: getAssessmentDomain(assessment, models),
    domainIconKey: getAssessmentModel(assessment, models)?.domainIconKey,
    domainColorKey: getAssessmentModel(assessment, models)?.domainColorKey,
    version: getAssessmentVersion(assessment, models),
    progress: getAssessmentProgress(assessment, models),
    scorePercentage: getAssessmentScorePercentage(assessment, models),
    maturityLevel: assessment.overallMaturityLevel,
    updatedAtTime: getAssessmentTime(assessment),
    updatedLabel: formatRelativeDate(
      assessment.updatedAt || assessment.createdAt,
      now
    ),
    status,
    isDraft: status === "draft",
    hasChangesRequested: status === "changes-requested",
    isCompleted: status === "completed",
    canOpen: canOpenAssessment(assessment),
  };
}
