import type { AssessmentResponse, UserDTO, AgentEvaluationDraftResponse } from "@/api/types";
import type { EvaluationQuestion, QuestionReviewDraft } from "./types";

export function assessmentCapabilities(
  assessment: AssessmentResponse | null,
  user: Pick<UserDTO, "id" | "role"> | null | undefined,
  campaignToken?: string | null,
) {
  const evaluator = !campaignToken && (user?.role === "CURATOR" || user?.role === "ADMIN");
  const submitted = !!assessment && (["PENDING_REVIEW", "CHANGES_REQUESTED", "COMPLETED"].includes(assessment.status || "") || assessment.isCompleted);
  const canEvaluate = !!(evaluator && submitted);
  const canEditEvaluation = canEvaluate && assessment?.status === "PENDING_REVIEW" && !assessment.isCompleted;
  const owner = !!campaignToken || (!!user && (assessment?.userId === user.id || (!evaluator && assessment?.userId == null)));
  const canEditResponses = !!assessment && owner && !assessment.isCompleted &&
    (assessment.status === "DRAFT" || assessment.status === "CHANGES_REQUESTED");
  return { canEvaluate, canEditEvaluation, canEditResponses };
}

export function reviewNeedsAttention(question: EvaluationQuestion, review?: QuestionReviewDraft) {
  return !review?.validationStatus || review.validationStatus === "FLAGGED" ||
    ((question.requiresManualScore || review.validationStatus === "ADJUSTED") && typeof review.manualScore !== "number") ||
    (review.validationStatus === "ADJUSTED" && !review.reviewerNote.trim());
}

export function mergeAgentReviews(
  reviews: Record<string, QuestionReviewDraft>,
  draft: AgentEvaluationDraftResponse,
  touched: ReadonlySet<string>,
) {
  const next = { ...reviews };
  for (const [key, suggestion] of Object.entries(draft.questionEvaluations || {})) {
    const current = reviews[key];
    if (!current || touched.has(key) || current.validationStatus || current.manualScore != null || current.reviewerNote.trim()) continue;
    next[key] = {
      validationStatus: (suggestion.validationStatus === "ACCEPTED" || suggestion.validationStatus === "ADJUSTED" || suggestion.validationStatus === "FLAGGED")
        ? suggestion.validationStatus : "FLAGGED",
      manualScore: typeof suggestion.manualScore === "number" ? suggestion.manualScore : undefined,
      reviewerNote: suggestion.reviewerNote || "",
    };
  }
  return next;
}
