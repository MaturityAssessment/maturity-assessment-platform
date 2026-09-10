"use client";

import type { AssessmentData, Question } from "@/api/types";
import type { AssessmentPracticeStep } from "./AssessmentStep";
import {
  hasValidEvidenceItems,
} from "./assessmentEvidence.ts";
import type { AssessmentEvidenceByField } from "./assessmentEvidence.ts";

export function getFieldName(step: AssessmentPracticeStep, question: Question) {
  return `${step.dimension.id}_${step.module.code}_${String(
    step.practice.id || step.practice.name
  )}_${question.id}`;
}

export function isAnswered(value: unknown) {
  return value !== undefined && value !== null && value !== "";
}

export function isEvidenceOnlyQuestion(question: Question) {
  return question.type === "evidence";
}

export function isQuestionComplete(
  question: Question,
  value: unknown,
  evidenceItems: Parameters<typeof hasValidEvidenceItems>[0]
) {
  if (question.type === "evidence") {
    return hasValidEvidenceItems(evidenceItems);
  }
  return isAnswered(value);
}

export function getQuestionResponseBounds(question: Question) {
  if (
    question.type !== "numeric" && question.type !== "percentage"
  ) {
    return null;
  }

  const min = question.rangeMin;
  const max = question.rangeMax;
  return typeof min === "number" && typeof max === "number"
    && Number.isFinite(min) && Number.isFinite(max)
    ? { min, max }
    : null;
}

export function isQuestionResponseValid(question: Question, value: unknown) {
  if (!isAnswered(value)) return true;
  if (question.type !== "numeric" && question.type !== "percentage") return true;

  const bounds = getQuestionResponseBounds(question);
  const numericValue = typeof value === "number" ? value : Number(value);
  return (
    bounds !== null &&
    Number.isFinite(numericValue) &&
    Number.isInteger(numericValue) &&
    numericValue >= bounds.min &&
    numericValue <= bounds.max
  );
}

export function isDependentQuestionDisabled(
  step: AssessmentPracticeStep,
  question: Question,
  formData: AssessmentData
) {
  const hasDependency =
    question.dependsOnQuestionId != null ||
    Boolean(question.dependsOnQuestionCode?.trim());
  if (!hasDependency) return false;

  const parentById =
    question.dependsOnQuestionId == null
      ? undefined
      : step.practice.questions.find(
          (candidate) => candidate.id === question.dependsOnQuestionId
        );
  const parentQuestion =
    parentById ??
    step.practice.questions.find(
      (candidate) =>
        candidate.code?.toLowerCase() ===
        question.dependsOnQuestionCode?.toLowerCase()
    );
  if (!parentQuestion) return true;

  const parentFieldName = getFieldName(step, parentQuestion);
  return Number(formData[parentFieldName]) !== 1;
}

export function isPracticeRequiredComplete(
  step: AssessmentPracticeStep,
  formData: AssessmentData,
  evidenceFiles: AssessmentEvidenceByField
) {
  const enabledQuestions = getEnabledQuestions(step, formData);

  return enabledQuestions.every((question) => {
    const fieldName = getFieldName(step, question);
    const complete = isQuestionComplete(
      question,
      formData[fieldName],
      evidenceFiles.get(fieldName)
    );
    if (question.required && !complete) {
      return false;
    }

    if (!isQuestionResponseValid(question, formData[fieldName])) {
      return false;
    }

    if (
      !isEvidenceOnlyQuestion(question) &&
      isAnswered(formData[fieldName]) &&
      question.requiresEvidence &&
      !hasValidEvidenceItems(evidenceFiles.get(fieldName))
    ) {
      return false;
    }

    return true;
  });
}

export function isPracticeFullyAnswered(
  step: AssessmentPracticeStep,
  formData: AssessmentData,
  evidenceFiles: AssessmentEvidenceByField
) {
  const enabledQuestions = getEnabledQuestions(step, formData);

  return (
    enabledQuestions.length > 0 &&
    enabledQuestions.every((question) => {
      const fieldName = getFieldName(step, question);

      if (
        !isQuestionComplete(
          question,
          formData[fieldName],
          evidenceFiles.get(fieldName)
        )
      ) {
        return false;
      }

      if (!isQuestionResponseValid(question, formData[fieldName])) {
        return false;
      }

      if (
        question.requiresEvidence &&
        !hasValidEvidenceItems(evidenceFiles.get(fieldName))
      ) {
        return false;
      }

      return true;
    })
  );
}

export interface AssessmentPracticeProgress {
  answeredCount: number;
  totalEnabledQuestions: number;
  isRequiredComplete: boolean;
  isFullyAnswered: boolean;
}

export function getAssessmentPracticeProgress(
  step: AssessmentPracticeStep,
  formData: AssessmentData,
  evidenceFiles: AssessmentEvidenceByField
): AssessmentPracticeProgress {
  const enabledQuestions = getEnabledQuestions(step, formData);

  return {
    answeredCount: enabledQuestions.reduce((count, question) => {
      const fieldName = getFieldName(step, question);
      return (
        count +
        (isQuestionComplete(
          question,
          formData[fieldName],
          evidenceFiles.get(fieldName)
        )
          ? 1
          : 0)
      );
    }, 0),
    totalEnabledQuestions: enabledQuestions.length,
    isRequiredComplete: isPracticeRequiredComplete(
      step,
      formData,
      evidenceFiles
    ),
    isFullyAnswered: isPracticeFullyAnswered(
      step,
      formData,
      evidenceFiles
    ),
  };
}

export type AssessmentPracticeRailState =
  | "current"
  | "completed"
  | "behind-incomplete"
  | "following";

export function getAssessmentPracticeRailState(
  practiceIndex: number,
  activePracticeIndex: number,
  isRequiredComplete: boolean
): AssessmentPracticeRailState {
  if (practiceIndex === activePracticeIndex) return "current";
  if (isRequiredComplete) return "completed";
  if (activePracticeIndex >= 0 && practiceIndex < activePracticeIndex) {
    return "behind-incomplete";
  }
  return "following";
}

export type AssessmentPracticeRouteChangeAction =
  | "acknowledge-passive"
  | "acknowledge-explicit"
  | "await-internal-route"
  | "scroll-from-route";

export function getAssessmentPracticeRouteChangeAction(
  routePracticeKey: string,
  pendingPassivePracticeKey: string | null,
  pendingExplicitPracticeKey: string | null
): AssessmentPracticeRouteChangeAction {
  if (routePracticeKey === pendingPassivePracticeKey) {
    return "acknowledge-passive";
  }
  if (routePracticeKey === pendingExplicitPracticeKey) {
    return "acknowledge-explicit";
  }
  if (
    pendingPassivePracticeKey !== null ||
    pendingExplicitPracticeKey !== null
  ) {
    return "await-internal-route";
  }
  return "scroll-from-route";
}

export function isEnabledEvidenceField(
  fieldName: string,
  practiceSteps: AssessmentPracticeStep[],
  formData: AssessmentData
) {
  return practiceSteps.some((step) =>
    step.practice.questions.some(
      (question) =>
        question.id &&
        (question.requiresEvidence || isEvidenceOnlyQuestion(question)) &&
        getFieldName(step, question) === fieldName &&
        !isDependentQuestionDisabled(step, question, formData)
    )
  );
}

export function pruneDisabledQuestionData(
  practiceSteps: AssessmentPracticeStep[],
  formData: AssessmentData
) {
  const removedFields = new Set<string>();
  const nextFormData: AssessmentData = { ...formData };
  let removedInPass = true;

  while (removedInPass) {
    removedInPass = false;

    practiceSteps.forEach((step) => {
      step.practice.questions.forEach((question) => {
        if (
          !question.id ||
          !isDependentQuestionDisabled(step, question, nextFormData)
        ) {
          return;
        }

        const fieldName = getFieldName(step, question);
        removedFields.add(fieldName);
        if (
          !isAnswered(nextFormData[fieldName]) &&
          !isAnswered(nextFormData[`${fieldName}_justification`])
        ) {
          return;
        }

        delete nextFormData[fieldName];
        delete nextFormData[`${fieldName}_justification`];
        removedInPass = true;
      });
    });
  }

  return { formData: nextFormData, removedFields };
}

function getEnabledQuestions(
  step: AssessmentPracticeStep,
  formData: AssessmentData
) {
  return step.practice.questions.filter(
    (question) =>
      question.id !== undefined &&
      question.id !== null &&
      !isDependentQuestionDisabled(step, question, formData)
  );
}
