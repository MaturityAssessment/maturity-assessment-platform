"use client";

import type { AssessmentData, Question } from "@/api/types";
import type { AssessmentPracticeStep } from "./AssessmentStep";
import {
  missingEvidenceRequirements,
  getPracticeEvidenceField,
} from "./assessmentEvidence.ts";
import type { AssessmentEvidenceByField } from "./assessmentEvidence.ts";

import { dependencyMatches } from "../../lib/questionDependencies.ts";
import { getSingleChoiceIndex } from "./singleChoiceResponse.ts";

export function getFieldName(step: AssessmentPracticeStep, question: Question) {
  return `${step.dimension.id}_${step.module.code}_${String(
    step.practice.id || step.practice.name
  )}_${question.id}`;
}

export function isAnswered(value: unknown) {
  return value !== undefined && value !== null && (typeof value !== "string" || value.trim() !== "");
}

export function isQuestionComplete(value: unknown) {
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
  if (question.type === "multiple_choice") return getSingleChoiceIndex(question, value) !== undefined;
  if (question.type === "multiple_selection") {
    return Array.isArray(value) && new Set(value).size === value.length && value.every(
      (index) => Number.isInteger(index) && index >= 0 && index < (question.choices?.length ?? 0)
    );
  }
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
  formData: AssessmentData,
  visiting = new Set<Question>()
) {
  if (visiting.has(question)) return true;
  visiting.add(question);
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
  if (!parentQuestion || isDependentQuestionDisabled(step, parentQuestion, formData, visiting)) return true;

  const parentFieldName = getFieldName(step, parentQuestion);
  return !dependencyMatches(parentQuestion, question.dependencyCondition, formData[parentFieldName]);
}

export function isPracticeRequiredComplete(
  step: AssessmentPracticeStep,
  formData: AssessmentData,
  evidenceFiles: AssessmentEvidenceByField
) {
  const issues = getPracticeCompletionIssues(step, formData, evidenceFiles);
  return (
    issues.missingRequiredAnswerCount === 0 &&
    issues.invalidAnswerCount === 0 &&
    issues.missingEvidenceCount === 0
  );
}

export interface AssessmentCompletionIssues {
  missingRequiredAnswerCount: number;
  invalidAnswerCount: number;
  missingEvidenceCount: number;
}

export function getPracticeCompletionIssues(
  step: AssessmentPracticeStep,
  formData: AssessmentData,
  evidenceFiles: AssessmentEvidenceByField
): AssessmentCompletionIssues {
  const enabledQuestions = getEnabledQuestions(step, formData);
  const missingRequiredAnswerCount = enabledQuestions.filter(
    (question) => question.required && !isQuestionComplete(formData[getFieldName(step, question)])
  ).length;
  const invalidAnswerCount = enabledQuestions.filter(
    (question) => !isQuestionResponseValid(question, formData[getFieldName(step, question)])
  ).length;
  return {
    missingRequiredAnswerCount,
    invalidAnswerCount,
    // Show the practice evidence blocker only once its answers are ready.
    missingEvidenceCount:
      missingRequiredAnswerCount === 0 && invalidAnswerCount === 0 &&
      enabledQuestions.length > 0
        ? missingEvidenceRequirements(step.practice, evidenceFiles.get(getPracticeEvidenceField(step.practice.id))) : 0,
  };
}

export function sumAssessmentCompletionIssues(
  items: AssessmentCompletionIssues[]
): AssessmentCompletionIssues {
  return items.reduce(
    (total, item) => ({
      missingRequiredAnswerCount: total.missingRequiredAnswerCount + item.missingRequiredAnswerCount,
      invalidAnswerCount: total.invalidAnswerCount + item.invalidAnswerCount,
      missingEvidenceCount: total.missingEvidenceCount + item.missingEvidenceCount,
    }),
    { missingRequiredAnswerCount: 0, invalidAnswerCount: 0, missingEvidenceCount: 0 }
  );
}

export function getAssessmentCompletionIssueLabel(issues: AssessmentCompletionIssues) {
  const labels: string[] = [];
  if (issues.missingRequiredAnswerCount > 0) {
    labels.push(`${issues.missingRequiredAnswerCount} required answer${issues.missingRequiredAnswerCount === 1 ? "" : "s"} missing`);
  }
  if (issues.invalidAnswerCount > 0) {
    labels.push(`${issues.invalidAnswerCount} answer${issues.invalidAnswerCount === 1 ? " needs" : "s need"} correction`);
  }
  if (issues.missingEvidenceCount > 0) {
    labels.push(
      issues.missingEvidenceCount === 1
        ? "Required evidence missing"
        : `${issues.missingEvidenceCount} required evidence items missing`
    );
  }
  return labels.join(" · ");
}

export function isPracticeFullyAnswered(
  step: AssessmentPracticeStep,
  formData: AssessmentData,
  evidenceFiles: AssessmentEvidenceByField
) {
  const enabledQuestions = getEnabledQuestions(step, formData);

  return (
    enabledQuestions.length > 0 &&
    isPracticeRequiredComplete(step, formData, evidenceFiles) &&
    enabledQuestions.every((question) => {
      const fieldName = getFieldName(step, question);

      if (
        !isQuestionComplete(formData[fieldName])
      ) {
        return false;
      }

      if (!isQuestionResponseValid(question, formData[fieldName])) {
        return false;
      }


      return true;
    })
  );
}

export interface AssessmentPracticeProgress extends AssessmentCompletionIssues {
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
    ...getPracticeCompletionIssues(step, formData, evidenceFiles),
    answeredCount: enabledQuestions.reduce((count, question) => {
      const fieldName = getFieldName(step, question);
      return (
        count +
        (isQuestionComplete(formData[fieldName])
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
