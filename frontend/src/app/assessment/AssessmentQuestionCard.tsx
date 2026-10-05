"use client";

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

interface AssessmentQuestionCardProps {
  question: Question;
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
  onAskAssistant?: () => void;
  onInputChange: (
    field: string,
    value: string | number | number[] | undefined
  ) => void;
  onClearAnswer: (field: string) => void;
}

export default function AssessmentQuestionCard({
  question,
  fieldName,
  value,
  disabled,
  readOnly = false,
  evaluation,
  respondentUpdated,
  helpTourTargets,
  onAskAssistant,
  onInputChange,
  onClearAnswer,
}: AssessmentQuestionCardProps) {
  if (!question.id) return null;

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
          value={numberValue}
          options={(question.choices ?? []).map(({ label, score }) => ({
            label,
            value: score,
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
          ? "Available when the related question is answered Yes."
          : undefined
      }
      guidance={question.help || undefined}
      feedback={buildQuestionCardFeedback(
        question,
        evaluation,
        respondentUpdated
      )}
      onAskAssistant={onAskAssistant}
      onClear={
        hasContent && !interactionDisabled
          ? () => onClearAnswer(fieldName)
          : undefined
      }
      anchors={anchors}
    >
      {input}
    </QuestionCard>
  );
}

function joinAnchors(...anchors: Array<string | false | undefined>) {
  const result = anchors.filter(Boolean).join(" ");
  return result || undefined;
}
