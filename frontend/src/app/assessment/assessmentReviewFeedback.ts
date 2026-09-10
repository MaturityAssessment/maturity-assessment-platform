import type {
  Question,
  QuestionEvaluationResponse,
  QuestionEvaluationStatus,
} from "@/api/types";
import type { AssessmentPracticeStep } from "./AssessmentStep";
import { getFieldName } from "./assessmentFlowUtils.ts";

export type AssessmentReviewCounts = {
  acceptedCount: number;
  adjustedCount: number;
  flaggedCount: number;
  outstandingFlaggedCount: number;
};

export type AssessmentFeedbackReviewItem = {
  fieldName: string;
  step: AssessmentPracticeStep;
  question: Question;
  evaluation: QuestionEvaluationResponse;
};

export function buildAssessmentFeedbackReviewItems(
  practiceSteps: AssessmentPracticeStep[],
  evaluations:
    | Record<string, QuestionEvaluationResponse>
    | null
    | undefined
): AssessmentFeedbackReviewItem[] {
  return practiceSteps.flatMap((step) =>
    step.practice.questions.flatMap((question) => {
      if (question.id == null) return [];

      const fieldName = getFieldName(step, question);
      const evaluation = evaluations?.[fieldName];
      if (
        evaluation?.validationStatus !== "FLAGGED" &&
        evaluation?.validationStatus !== "ADJUSTED"
      ) {
        return [];
      }

      return [{ fieldName, step, question, evaluation }];
    })
  );
}

export function isReviewedItemUpdated(
  evaluation: QuestionEvaluationResponse | null | undefined,
  updatedResponseKeys: ReadonlySet<string>
) {
  return Boolean(
    evaluation?.respondentUpdated ||
      (evaluation?.responseKey &&
        updatedResponseKeys.has(evaluation.responseKey))
  );
}

export function getAssessmentReviewCounts(
  evaluations:
    | Record<string, QuestionEvaluationResponse>
    | null
    | undefined,
  updatedResponseKeys: ReadonlySet<string> = new Set()
): AssessmentReviewCounts {
  return getReviewCountsForEvaluations(
    Object.values(evaluations || {}),
    updatedResponseKeys
  );
}

export function getPracticeReviewCounts(
  step: AssessmentPracticeStep,
  evaluations:
    | Record<string, QuestionEvaluationResponse>
    | null
    | undefined,
  updatedResponseKeys: ReadonlySet<string>
) {
  return getReviewCountsForEvaluations(
    step.practice.questions.flatMap((question) => {
      if (question.id == null) return [];
      const evaluation = evaluations?.[getFieldName(step, question)];
      return evaluation ? [evaluation] : [];
    }),
    updatedResponseKeys
  );
}

export function isEditableReviewStatus(
  status: QuestionEvaluationStatus | null | undefined
) {
  return status === "FLAGGED" || status === "ADJUSTED";
}

function getReviewCountsForEvaluations(
  evaluations: QuestionEvaluationResponse[],
  updatedResponseKeys: ReadonlySet<string>
): AssessmentReviewCounts {
  return evaluations.reduce<AssessmentReviewCounts>(
    (counts, evaluation) => {
      if (evaluation.validationStatus === "ACCEPTED") {
        counts.acceptedCount += 1;
      }
      if (evaluation.validationStatus === "ADJUSTED") {
        counts.adjustedCount += 1;
      }
      if (evaluation.validationStatus === "FLAGGED") {
        counts.flaggedCount += 1;
        if (!isReviewedItemUpdated(evaluation, updatedResponseKeys)) {
          counts.outstandingFlaggedCount += 1;
        }
      }
      return counts;
    },
    {
      acceptedCount: 0,
      adjustedCount: 0,
      flaggedCount: 0,
      outstandingFlaggedCount: 0,
    }
  );
}
