import type {
  AssessmentData,
  AssessmentResponse,
  QuestionResponseRequest,
} from "@/api/types";
import type { AssessmentPracticeStep } from "./AssessmentStep";
import {
  getFieldName,
  isAnswered,
  isDependentQuestionDisabled,
  isEvidenceOnlyQuestion,
} from "./assessmentFlowUtils.ts";

export function collectQuestionResponses(
  practiceSteps: AssessmentPracticeStep[],
  formData: AssessmentData
) {
  const responses: Record<string, QuestionResponseRequest> = {};

  practiceSteps.forEach((step) => {
    step.practice.questions.forEach((question) => {
      if (
        !question.id ||
        isDependentQuestionDisabled(step, question, formData)
      ) {
        return;
      }

      const fieldName = getFieldName(step, question);
      const value = formData[fieldName];
      if (isAnswered(value) && !isEvidenceOnlyQuestion(question)) {
        const justification = formData[`${fieldName}_justification`];
        responses[fieldName] = {
          questionId: question.id,
          response:
            question.type === "open_answer"
              ? value
              : Number(value) || 0,
          ...(isAnswered(justification)
            ? { respondentJustification: String(justification) }
            : {}),
        };
      }
    });
  });

  return responses;
}

export function hydrateQuestionResponses(
  evaluations:
    | AssessmentResponse["questionEvaluations"]
    | null
    | undefined
) {
  const formData: AssessmentData = {};
  Object.values(evaluations || {}).forEach((evaluation) => {
    if (isAnswered(evaluation.response)) {
      formData[evaluation.responseKey] = evaluation.response;
    }
    if (isAnswered(evaluation.respondentJustification)) {
      formData[`${evaluation.responseKey}_justification`] =
        evaluation.respondentJustification;
    }
  });
  return formData;
}
