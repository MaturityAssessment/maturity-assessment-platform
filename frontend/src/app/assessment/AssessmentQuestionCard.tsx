"use client";

import { isNotApplicableAnswer, NOT_APPLICABLE_ANSWER } from "@/lib/notApplicable";

import { dependencySummary, isDependencyParent } from "@/lib/questionDependencies";
import type {
  Question,
  QuestionEvaluationResponse,
} from "@/api/types";
import {
  QuestionCard,
  BooleanQuestionInput,
  ScaleQuestionInput,
  SingleChoiceQuestionInput,
  MultiSelectQuestionInput,
  NumericQuestionInput,
  PercentageQuestionInput,
  OpenAnswerQuestionInput,
  type QuestionCardAnchors,
  type QuestionResponseValue,
} from "@/components/assessment/question-card";
import {
  isAnswered,
  isQuestionComplete,
  isQuestionResponseValid,
  getQuestionResponseBounds,
} from "./assessmentFlowUtils";
import { TEXT_LIMITS } from "@/config/textLimits";
import {
  buildQuestionCardFeedback,
  getQuestionCardStatus,
  getQuestionInstruction,
} from "./assessmentQuestionCardModel";

import { getSingleChoiceIndex, singleChoiceValue, isAmbiguousChoiceResponse } from "./singleChoiceResponse";

interface AssessmentQuestionCardProps {
  question: Question;
  practiceQuestions?: Question[];
  fieldName: string;
  value: unknown;
  disabled: boolean;
  readOnly?: boolean;
  evaluation?: QuestionEvaluationResponse;
  respondentUpdated: boolean;
  helpTourTargets?: {
    question?: boolean;
    requirements?: boolean;
    actions?: boolean;
    guidance?: boolean;
  };
  headerActions?: React.ReactNode;
  responseDetails?: React.ReactNode;
  footer?: React.ReactNode;
  onAskAssistant?: () => void;
  onInputChange: (
    field: string,
    value: QuestionResponseValue
  ) => void;
  onClearAnswer: (field: string) => void;
}

export default function AssessmentQuestionCard({
  question,
  practiceQuestions = [],
  fieldName,
  value,
  disabled,
  readOnly = false,
  evaluation,
  respondentUpdated,
  helpTourTargets,
  headerActions,
  responseDetails,
  footer,
  onAskAssistant,
  onInputChange,
  onClearAnswer,
}: AssessmentQuestionCardProps) {
  if (!question.id) return null;

  const dependencyParent = practiceQuestions.find((candidate) => isDependencyParent(candidate, question));
  const needsChoiceSelection = question.type === "multiple_choice" && !readOnly
    && practiceQuestions.some((child) => child.dependencyCondition?.type === "multiple_choice" && isDependencyParent(question, child))
    && isAmbiguousChoiceResponse(question, value);
  const reviewStatus = evaluation?.validationStatus;
  const interactionDisabled =
    readOnly || disabled || reviewStatus === "ACCEPTED" || reviewStatus === "ADJUSTED";
  const hasContent = isAnswered(value);
  const complete =
    isQuestionComplete(value) && isQuestionResponseValid(question, value);
  const hasVisibleRequirementDetails = Boolean(question.required) && !disabled;
  const anchors: QuestionCardAnchors = {
    root: joinAnchors(
      helpTourTargets?.question && "assessment-question-card",
      helpTourTargets?.requirements &&
        !hasVisibleRequirementDetails &&
        "assessment-question-requirements"
    ),
    requirements:
      helpTourTargets?.requirements && hasVisibleRequirementDetails
        ? "assessment-question-requirements"
        : undefined,
    actions: joinAnchors(
      helpTourTargets?.actions && "assessment-question-actions",
      helpTourTargets?.guidance &&
        !question.help &&
        "assessment-question-guidance"
    ),
    guidance:
      helpTourTargets?.guidance && question.help
        ? "assessment-question-guidance"
        : undefined,
  };
  const inputProps = {
    disabled: interactionDisabled,
    name: fieldName,
    onChange: (nextValue: QuestionResponseValue) =>
      onInputChange(fieldName, nextValue),
  };
  const notApplicable = isNotApplicableAnswer(value);
  const numberValue = typeof value === "number" ? value : undefined;
  const bounds = getQuestionResponseBounds(question);
  let input;
  switch (question.type) {
    case "boolean":
      input = <BooleanQuestionInput {...inputProps} value={numberValue} />;
      break;
    case "likert":
      input = (
        <ScaleQuestionInput
          {...inputProps}
          value={numberValue}
          pointCount={Math.max(2, question.scalePointCount ?? 5)}
          minLabel={question.scaleMinLabel}
          maxLabel={question.scaleMaxLabel}
        />
      );
      break;
    case "multiple_choice":
      input = (
        <SingleChoiceQuestionInput
          {...inputProps}
          value={needsChoiceSelection && !interactionDisabled ? undefined : getSingleChoiceIndex(question, value)}
          onChange={(index) => onInputChange(fieldName, index === undefined ? undefined : singleChoiceValue(index))}
          options={(question.choices ?? []).map(({ label }, index) => ({
            label,
            value: index,
          }))}
        />
      );
      break;
    case "multiple_selection":
      input = (
        <MultiSelectQuestionInput
          {...inputProps}
          value={Array.isArray(value) ? value : undefined}
          options={(question.choices ?? []).map(({ label }, index) => ({
            label,
            value: index,
          }))}
        />
      );
      break;
    case "numeric":
    case "percentage": {
      const NumberInput = question.type === "percentage"
        ? PercentageQuestionInput
        : NumericQuestionInput;
      input = (
        <NumberInput
          {...inputProps}
          value={typeof value === "number" || typeof value === "string" ? value : undefined}
          min={bounds?.min}
          max={bounds?.max}
          invalid={!isQuestionResponseValid(question, value)}
        />
      );
      break;
    }
    case "open_answer":
      input = (
        <OpenAnswerQuestionInput
          {...inputProps}
          value={typeof value === "string" ? value : undefined}
          maxLength={TEXT_LIMITS.openAnswer}
          helperText="Your response is saved automatically."
        />
      );
      break;
  }

  return (
    <QuestionCard
      title={question.text}
      instruction={getQuestionInstruction(question)}
      status={getQuestionCardStatus({
        disabled,
        complete,
        evaluation,
        respondentUpdated,
      })}
      required={Boolean(question.required)}
      complete={complete}
      interactionDisabled={interactionDisabled}
      disabledMessage={
        disabled
          ? `${dependencySummary(dependencyParent, question.dependencyCondition)}.`
          : undefined
      }
      guidance={question.help || undefined}
      feedback={buildQuestionCardFeedback(
        question,
        evaluation,
        respondentUpdated
      )}
      headerActions={headerActions}
      responseDetails={needsChoiceSelection && !interactionDisabled ? <>
        <p role="status" className="text-sm text-amber-800">Please select an answer option again to activate dependent questions.</p>
        {responseDetails}
      </> : responseDetails}
      footer={footer}
      onAskAssistant={onAskAssistant}
      onClear={
        hasContent && !interactionDisabled
          ? () => onClearAnswer(fieldName)
          : undefined
      }
      anchors={anchors}
    >
      {question.allowNotApplicable ? (
        <div className="flex flex-col gap-2">
          {input}
          <label className={`inline-flex min-h-9 items-center gap-2 self-end rounded-md px-2 text-xs font-medium transition-colors focus-within:ring-2 focus-within:ring-indigo-400 focus-within:ring-offset-2 ${
            notApplicable ? "bg-indigo-50/60 text-indigo-700" : "text-slate-500"
          } ${interactionDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-slate-50 hover:text-slate-700"}`}>
            <input
              type="checkbox"
              name={`${fieldName}_not_applicable`}
              checked={notApplicable}
              disabled={interactionDisabled}
              onChange={(event) => onInputChange(fieldName, event.target.checked ? NOT_APPLICABLE_ANSWER : undefined)}
              aria-label="N/A (Not applicable)"
              className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-0 focus:ring-offset-0"
            />
            Not applicable
          </label>
        </div>
      ) : input}
    </QuestionCard>
  );
}

function joinAnchors(...anchors: Array<string | false | undefined>) {
  const result = anchors.filter(Boolean).join(" ");
  return result || undefined;
}
