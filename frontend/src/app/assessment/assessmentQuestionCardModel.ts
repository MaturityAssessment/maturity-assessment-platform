import type {
  Question,
  QuestionEvaluationResponse,
} from "@/api/types";
import type {
  QuestionCardFeedbackModel,
  QuestionCardStatus,
} from "@/components/assessment/question-card";

export function getQuestionInstruction(question: Question) {
  switch (question.type) {
    case "boolean":
      return "Yes or no";
    case "likert":
      return "Choose a point on the scale";
    case "multiple_selection":
      return "Select all that apply";
    case "multiple_choice":
      return "Select one";
    case "numeric":
      return "Enter a number";
    case "percentage":
      return "Enter a percentage";
    case "open_answer":
      return "Written response";
  }
}

export function getQuestionCardStatus({
  disabled,
  complete,
  evaluation,
  respondentUpdated,
}: {
  disabled: boolean;
  complete: boolean;
  evaluation?: QuestionEvaluationResponse;
  respondentUpdated: boolean;
}): QuestionCardStatus {
  if (disabled) return "disabled";
  switch (evaluation?.validationStatus) {
    case "ACCEPTED":
      return "accepted";
    case "FLAGGED":
      return respondentUpdated ? "flagged-updated" : "flagged";
    case "ADJUSTED":
      return "adjusted";
    default:
      return complete ? "complete" : "unanswered";
  }
}

export function buildQuestionCardFeedback(
  question: Question,
  evaluation: QuestionEvaluationResponse | undefined,
  respondentUpdated: boolean
): QuestionCardFeedbackModel | undefined {
  const status = evaluation?.validationStatus;
  if (!status) return undefined;

  if (status === "ACCEPTED") {
    return {
      tone: "accepted",
      title: "Accepted by evaluator",
      note: evaluation.reviewerNote?.trim() ? evaluation.reviewerNote : undefined,
      readOnly: true,
    };
  }

  if (status === "FLAGGED") {
    return {
      tone: respondentUpdated ? "updated" : "flagged",
      title: respondentUpdated
        ? "Requested update completed"
        : "Changes requested",
      note: evaluation.reviewerNote?.trim() ? evaluation.reviewerNote : undefined,
      prompt: respondentUpdated
        ? undefined
        : "Update this answer or the shared practice evidence to mark it ready for review.",
    };
  }

  return {
    tone: "adjusted",
    title: "Adjusted by evaluator",
    note: evaluation.reviewerNote?.trim() ? evaluation.reviewerNote : undefined,
    result:
      evaluation.manualScore == null
        ? undefined
        : formatEvaluatorResult(question, evaluation.manualScore),
  };
}

export function formatEvaluatorResult(question: Question, score: number) {
  if (question.type === "boolean") {
    return `Evaluator result: ${score === 1 ? "Correct" : "Incorrect"}`;
  }
  if (question.type === "likert") {
    const pointCount = question.scalePointCount ?? 5;
    const ascendingScore =
      question.scaleHighPointIsMaximum ?? true ? score : 1 - score;
    const point = Math.round(1 + ascendingScore * (pointCount - 1));
    const endpointLabel =
      point === 1
        ? question.scaleMinLabel
        : point === pointCount
          ? question.scaleMaxLabel
          : undefined;
    return `Evaluator result: Point ${point}${endpointLabel?.trim() ? `: ${endpointLabel}` : ""}`;
  }
  if (question.type === "multiple_choice") {
    const choice = question.choices?.find(
      (candidate) => Math.abs(candidate.score - score) <= 1e-9
    );
    return choice
      ? `Evaluator result: ${choice.label}`
      : "Evaluator result calculated from the selected option";
  }
  if (question.type === "multiple_selection") {
    return "Evaluator result calculated from the selected options";
  }
  if (question.type === "numeric" || question.type === "percentage") {
    return "Evaluator result calculated from the numeric response";
  }
  return `Evaluator score: ${score}`;
}
