import type {
  AssessmentData,
  AssessmentEvidenceInputItem,
  Dimension,
  MaturityModel,
  Question,
  QuestionEvaluationResponse,
} from "../../api/types";
import type { AssessmentPracticeStep } from "./AssessmentStep";
import { isReviewedItemUpdated } from "./assessmentReviewFeedback.ts";

export type DashboardQuestionStatus =
  | "not-started"
  | "in-progress"
  | "completed";

export type AssessmentDimensionSummary = {
  key: string;
  dimension: Dimension;
  practiceCount: number;
  answeredCount: number;
  totalCount: number;
  unansweredCount: number;
  optionalUnansweredCount: number;
  requiredComplete: boolean;
  status: DashboardQuestionStatus;
  flaggedCount: number;
  outstandingFlaggedCount: number;
  adjustedCount: number;
};

export type AssessmentDashboardSummary = {
  answeredCount: number;
  totalCount: number;
  unansweredCount: number;
  progressPercentage: number;
  flaggedCount: number;
  outstandingFlaggedCount: number;
  adjustedCount: number;
  dimensions: AssessmentDimensionSummary[];
};

export type AssessmentJourneyStage = "overview" | "questions" | "review";

type EvidenceByField = Map<string, AssessmentEvidenceInputItem[]>;

export function buildAssessmentDashboardSummary(
  model: MaturityModel,
  practiceSteps: AssessmentPracticeStep[],
  formData: AssessmentData,
  evidenceByField: EvidenceByField,
  questionEvaluations: Record<string, QuestionEvaluationResponse> = {},
  respondentUpdatedResponseKeys: ReadonlySet<string> = new Set()
): AssessmentDashboardSummary {
  const dimensions = model.dimensions.map((dimension, dimensionIndex) => {
    const dimensionSteps = practiceSteps.filter(
      (step) => step.dimension === dimension
    );
    const questions = dimensionSteps.flatMap((step) =>
      step.practice.questions.flatMap((question) => {
        if (
          question.id == null ||
          isDashboardQuestionDisabled(step, question, formData)
        ) {
          return [];
        }

        return [
          {
            required: Boolean(question.required),
            status: getDashboardQuestionStatus(
              step,
              question,
              formData,
              evidenceByField
            ),
          },
        ];
      })
    );
    const answeredCount = questions.filter(
      ({ status }) => status !== "not-started"
    ).length;
    const totalCount = questions.length;
    const unansweredCount = totalCount - answeredCount;
    const optionalUnansweredCount = questions.filter(
      ({ required, status }) => !required && status === "not-started"
    ).length;
    const requiredComplete =
      totalCount > 0 &&
      questions.every(
        ({ required, status }) =>
          status === "completed" ||
          (!required && status === "not-started")
      );
    const dimensionQuestionIds = new Set(
      dimensionSteps.flatMap((step) =>
        step.practice.questions.flatMap((question) =>
          question.id == null ? [] : [question.id]
        )
      )
    );
    const dimensionEvaluations = Object.values(questionEvaluations).filter(
      (evaluation) => dimensionQuestionIds.has(evaluation.questionId)
    );

    return {
      key: dimension.id || `dimension-${dimensionIndex}`,
      dimension,
      practiceCount: dimensionSteps.length,
      answeredCount,
      totalCount,
      unansweredCount,
      optionalUnansweredCount,
      requiredComplete,
      flaggedCount: dimensionEvaluations.filter(
        (evaluation) => evaluation.validationStatus === "FLAGGED"
      ).length,
      outstandingFlaggedCount: dimensionEvaluations.filter(
        (evaluation) =>
          evaluation.validationStatus === "FLAGGED" &&
          !isReviewedItemUpdated(
            evaluation,
            respondentUpdatedResponseKeys
          )
      ).length,
      adjustedCount: dimensionEvaluations.filter(
        (evaluation) => evaluation.validationStatus === "ADJUSTED"
      ).length,
      status: requiredComplete
        ? "completed"
        : answeredCount > 0
          ? "in-progress"
          : "not-started",
    } satisfies AssessmentDimensionSummary;
  });

  const totals = dimensions.reduce(
    (summary, dimension) => ({
      answeredCount: summary.answeredCount + dimension.answeredCount,
      totalCount: summary.totalCount + dimension.totalCount,
      unansweredCount: summary.unansweredCount + dimension.unansweredCount,
    }),
    {
      answeredCount: 0,
      totalCount: 0,
      unansweredCount: 0,
    }
  );

  return {
    ...totals,
    flaggedCount: Object.values(questionEvaluations).filter(
      (evaluation) => evaluation.validationStatus === "FLAGGED"
    ).length,
    outstandingFlaggedCount: Object.values(questionEvaluations).filter(
      (evaluation) =>
        evaluation.validationStatus === "FLAGGED" &&
        !isReviewedItemUpdated(
          evaluation,
          respondentUpdatedResponseKeys
        )
    ).length,
    adjustedCount: Object.values(questionEvaluations).filter(
      (evaluation) => evaluation.validationStatus === "ADJUSTED"
    ).length,
    progressPercentage:
      totals.totalCount === 0
        ? 0
        : Math.round((totals.answeredCount / totals.totalCount) * 100),
    dimensions,
  };
}

export function getAssessmentJourneyStage(
  summary: AssessmentDashboardSummary,
  canReview: boolean
): AssessmentJourneyStage {
  if (canReview) return "review";
  if (summary.answeredCount > 0) return "questions";
  return "overview";
}

export function findDimensionEntryPractice(
  dimension: Dimension,
  practiceSteps: AssessmentPracticeStep[],
  formData: AssessmentData,
  evidenceByField: EvidenceByField
) {
  const dimensionSteps = practiceSteps.filter(
    (step) => step.dimension === dimension
  );
  const firstUnresolved = dimensionSteps.find((step) => {
    const enabledQuestions = step.practice.questions.filter(
      (question) =>
        question.id != null &&
        !isDashboardQuestionDisabled(step, question, formData)
    );

    return (
      enabledQuestions.length === 0 ||
      enabledQuestions.some(
        (question) =>
          getDashboardQuestionStatus(
            step,
            question,
            formData,
            evidenceByField
          ) !== "completed"
      )
    );
  });

  return firstUnresolved ?? dimensionSteps[0] ?? null;
}

export function formatAssessmentTitle(modelName: string) {
  const name = modelName.trim();
  return /\bassessment$/i.test(name) ? name : `${name} Assessment`;
}

function getDashboardQuestionStatus(
  step: AssessmentPracticeStep,
  question: Question,
  formData: AssessmentData,
  evidenceByField: EvidenceByField
): DashboardQuestionStatus {
  const fieldName = getDashboardFieldName(step, question);
  const hasAnswer = isPopulated(formData[fieldName]);

  if (!hasAnswer) return "not-started";
  if (!isDashboardResponseValid(question, formData[fieldName])) {
    return "in-progress";
  }

  if (
    question.requiresEvidence &&
    !hasValidDashboardEvidence(evidenceByField.get(fieldName))
  ) {
    return "in-progress";
  }

  return "completed";
}

function isDashboardQuestionDisabled(
  step: AssessmentPracticeStep,
  question: Question,
  formData: AssessmentData
) {
  const hasDependency =
    question.dependsOnQuestionId != null ||
    Boolean(question.dependsOnQuestionCode?.trim());
  if (!hasDependency) return false;

  const parentQuestion =
    (question.dependsOnQuestionId == null
      ? undefined
      : step.practice.questions.find(
          (candidate) => candidate.id === question.dependsOnQuestionId
        )) ??
    step.practice.questions.find(
      (candidate) =>
        candidate.code?.toLocaleLowerCase() ===
        question.dependsOnQuestionCode?.toLocaleLowerCase()
    );

  if (!parentQuestion) return true;

  const parentFieldName = getDashboardFieldName(step, parentQuestion);
  return Number(formData[parentFieldName]) !== 1;
}

function getDashboardFieldName(
  step: AssessmentPracticeStep,
  question: Question
) {
  return `${step.dimension.id}_${step.module.code}_${String(
    step.practice.id || step.practice.name
  )}_${question.id}`;
}

function isDashboardResponseValid(question: Question, value: unknown) {
  if (question.type !== "numeric" && question.type !== "percentage") {
    return true;
  }

  const numericValue = typeof value === "number" ? value : Number(value);
  const minimum = question.rangeMin;
  const maximum = question.rangeMax;

  return (
    Number.isFinite(numericValue) &&
    Number.isInteger(numericValue) &&
    typeof minimum === "number" &&
    typeof maximum === "number" &&
    numericValue >= minimum &&
    numericValue <= maximum
  );
}

function hasValidDashboardEvidence(
  items: AssessmentEvidenceInputItem[] | undefined
) {
  return Boolean(
    items?.some((item) => {
      if (item.type === "file") {
        return Boolean(item.file || (item.evidenceId && item.fileName));
      }

      try {
        const url = new URL(item.url.trim());
        return url.protocol === "https:" && Boolean(url.hostname);
      } catch {
        return false;
      }
    })
  );
}

function isPopulated(value: unknown) {
  return value !== undefined && value !== null && value !== "";
}
