"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Check,
  Flag,
  FileUp,
  Bot,
  LockKeyhole,
  PencilLine,
  RotateCcw,
  X,
} from "lucide-react";
import Tippy from "@tippyjs/react";
import type {
  AssessmentEvidenceInputItem,
  Question,
  QuestionEvaluationResponse,
} from "@/api/types";
import EvidenceUpload from "@/components/EvidenceUpload";
import { TEXT_LIMITS } from "@/config/textLimits";
import { cn } from "@/lib/utils";
import { hasValidEvidenceItems } from "./assessmentEvidence";
import {
  getQuestionResponseBounds,
  isAnswered,
  isEvidenceOnlyQuestion,
  isQuestionComplete,
  isQuestionResponseValid,
} from "./assessmentFlowUtils";

interface AssessmentQuestionCardProps {
  question: Question;
  fieldName: string;
  value: unknown;
  evidenceItems: AssessmentEvidenceInputItem[];
  modelMaxLevel: number;
  disabled: boolean;
  evaluation?: QuestionEvaluationResponse;
  respondentUpdated: boolean;
  helpTourTargets?: {
    question?: boolean;
    requirements?: boolean;
    actions?: boolean;
    guidance?: boolean;
  };
  onAskAssistant?: () => void;
  onInputChange: (field: string, value: string | number) => void;
  onClearAnswer: (field: string) => void;
  onEvidenceItemsChange: (
    field: string,
    items: AssessmentEvidenceInputItem[]
  ) => void;
}

export default function AssessmentQuestionCard({
  question,
  fieldName,
  value,
  evidenceItems,
  modelMaxLevel,
  disabled,
  evaluation,
  respondentUpdated,
  helpTourTargets,
  onAskAssistant,
  onInputChange,
  onClearAnswer,
  onEvidenceItemsChange,
}: AssessmentQuestionCardProps) {
  if (!question.id) return null;

  const reviewStatus = evaluation?.validationStatus;
  const accepted = reviewStatus === "ACCEPTED";
  const flagged = reviewStatus === "FLAGGED";
  const adjusted = reviewStatus === "ADJUSTED";
  const interactionDisabled = disabled || accepted || adjusted;
  const evidenceOnly = isEvidenceOnlyQuestion(question);
  const hasRequirementDetails =
    Boolean(question.required) ||
    Boolean(question.requiresEvidence) ||
    evidenceOnly;
  const hasVisibleRequirementDetails = hasRequirementDetails && !disabled;
  const cardTourTargets = [
    helpTourTargets?.question && "assessment-question-card",
    helpTourTargets?.requirements &&
      !hasVisibleRequirementDetails &&
      "assessment-question-requirements",
  ]
    .filter(Boolean)
    .join(" ");
  const headerActionTourTargets = [
    helpTourTargets?.actions && "assessment-question-actions",
    helpTourTargets?.guidance &&
      !question.help &&
      "assessment-question-guidance",
  ]
    .filter(Boolean)
    .join(" ");
  const hasContent = isAnswered(value) || evidenceItems.length > 0;
  const complete =
    isQuestionComplete(question, value, evidenceItems) &&
    isQuestionResponseValid(question, value) &&
    (evidenceOnly ||
      !question.requiresEvidence ||
      hasValidEvidenceItems(evidenceItems));
  const responseBounds = getQuestionResponseBounds(question);
  const responseInvalid = !isQuestionResponseValid(question, value);
  const showAttachedEvidence =
    !evidenceOnly &&
    Boolean(question.requiresEvidence) &&
    !disabled &&
    isAnswered(value);

  return (
    <article
      data-help-tour={cardTourTargets || undefined}
      className={cn(
        "group overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-200",
        disabled
          ? "border-slate-200 bg-slate-50/80 opacity-70"
          : accepted
            ? "border-emerald-300 bg-emerald-50/20 shadow-emerald-950/[0.04]"
              : flagged
                ? "border-orange-300 bg-orange-50/20 shadow-orange-950/[0.04]"
                : adjusted
                  ? "border-cyan-300 bg-cyan-50/20 shadow-cyan-950/[0.04]"
                  : complete
                    ? "border-emerald-200/80 shadow-emerald-950/[0.03]"
                    : "border-slate-200 hover:border-slate-300 hover:shadow-md"
      )}
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-3.5">
          <div
            className={cn(
              "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors",
              accepted
                ? "border-emerald-300 bg-emerald-100 text-emerald-700"
                : flagged
                  ? respondentUpdated
                    ? "border-emerald-300 bg-emerald-100 text-emerald-700"
                    : "border-orange-300 bg-orange-100 text-orange-700"
                  : adjusted
                    ? "border-cyan-300 bg-cyan-100 text-cyan-700"
                    : complete && !disabled
                      ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                      : "border-slate-200 bg-slate-50 text-slate-400"
            )}
            aria-hidden="true"
          >
            {accepted ? (
              <LockKeyhole className="h-3.5 w-3.5" />
            ) : flagged && !respondentUpdated ? (
              <Flag className="h-3.5 w-3.5" />
            ) : adjusted ? (
              <PencilLine className="h-3.5 w-3.5" />
            ) : complete && !disabled ? (
              <Check className="h-4 w-4" strokeWidth={2.5} />
            ) : (
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div
              data-help-tour={headerActionTourTargets || undefined}
              className="flex items-start justify-between gap-3"
            >
              <div>
                <p
                  data-help-tour={
                    helpTourTargets?.requirements &&
                    hasVisibleRequirementDetails
                      ? "assessment-question-requirements"
                      : undefined
                  }
                  className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500"
                >
                  {getQuestionInstruction(question)}
                  {question.required && !disabled && (
                    <span className="ml-2 normal-case tracking-normal text-indigo-600">
                      Required
                    </span>
                  )}
                  {(question.requiresEvidence || evidenceOnly) && !disabled && (
                    <span className="ml-2 normal-case tracking-normal text-indigo-600">
                      {question.requiresEvidence
                        ? "Evidence required"
                        : "Evidence response"}
                    </span>
                  )}
                </p>
                <h3
                  className={cn(
                    "mt-1.5 text-[15px] font-semibold leading-6 sm:text-base",
                    disabled ? "text-slate-500" : "text-slate-950"
                  )}
                >
                  {question.text}
                </h3>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                {onAskAssistant && (
                  <Tippy content="Ask the assistant about this item">
                    <button
                      type="button"
                      onClick={onAskAssistant}
                      className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-50 hover:text-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                      aria-label="Ask the assistant about this item"
                    >
                      <Bot className="h-4 w-4" aria-hidden="true" />
                      <span className="hidden sm:inline">Ask assistant</span>
                    </button>
                  </Tippy>
                )}

                {hasContent && !interactionDisabled && (
                  <Tippy content={evidenceOnly ? "Remove evidence" : "Clear answer"}>
                    <button
                      type="button"
                      onClick={() => onClearAnswer(fieldName)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                      aria-label={evidenceOnly ? "Remove evidence" : "Clear answer"}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>
                  </Tippy>
                )}

                {question.help && (
                  <Tippy
                    content={
                      <div className="max-w-sm p-2 text-sm leading-5">
                        {question.help}
                      </div>
                    }
                  >
                    <button
                      type="button"
                      data-help-tour={
                        helpTourTargets?.guidance
                          ? "assessment-question-guidance"
                          : undefined
                      }
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                      aria-label="Question guidance"
                    >
                      <AlertCircle className="h-4 w-4" />
                    </button>
                  </Tippy>
                )}
              </div>
            </div>

            {disabled && (
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Available when the related question is answered Yes.
              </p>
            )}

            {evaluation?.validationStatus && (
              <ReviewFeedback
                question={question}
                evaluation={evaluation}
                respondentUpdated={respondentUpdated}
              />
            )}

            <fieldset
              disabled={interactionDisabled}
              className="mt-5 disabled:pointer-events-none"
            >
              {question.type === "boolean" && (
                <BooleanOptions
                  fieldName={fieldName}
                  value={value}
                  disabled={interactionDisabled}
                  onInputChange={onInputChange}
                />
              )}

              {question.type === "likert" && (
                <LikertOptions
                  fieldName={fieldName}
                  value={value}
                  pointCount={Math.max(2, question.scalePointCount ?? 5)}
                  minLabel={question.scaleMinLabel}
                  maxLabel={question.scaleMaxLabel}
                  disabled={interactionDisabled}
                  onInputChange={onInputChange}
                />
              )}

              {question.type === "multiple_choice" && (
                <ChoiceOptions
                  question={question}
                  fieldName={fieldName}
                  value={value}
                  disabled={interactionDisabled}
                  onInputChange={onInputChange}
                />
              )}

              {(question.type === "numeric" ||
                question.type === "percentage") && (
                <NumericResponseField
                  fieldName={fieldName}
                  value={value}
                  bounds={responseBounds}
                  invalid={responseInvalid}
                  suffix={question.type === "percentage" ? "%" : undefined}
                  showSlider={question.type === "percentage"}
                  onInputChange={onInputChange}
                />
              )}

              {question.type === "open_answer" && (
                <OpenAnswerField
                  fieldName={fieldName}
                  value={value}
                  onInputChange={onInputChange}
                />
              )}

              {evidenceOnly && !accepted && (
                <EvidenceUpload
                  questionId={question.id}
                  items={evidenceItems}
                  onItemsChange={(items) =>
                    onEvidenceItemsChange(fieldName, items)
                  }
                  required={question.required}
                  readOnly={accepted}
                />
              )}
            </fieldset>

            {evidenceOnly && accepted && (
              <div className="mt-5">
                <EvidenceUpload
                  questionId={question.id}
                  items={evidenceItems}
                  onItemsChange={() => undefined}
                  required={question.required}
                  readOnly
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {showAttachedEvidence && (
          <motion.div
            key="evidence-upload"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-indigo-100 bg-indigo-50/60 px-5 py-5 sm:px-6">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-indigo-950">
                  <FileUp className="h-4 w-4 text-indigo-600" />
                  Supporting evidence
                </div>
                <span className="text-xs font-medium text-indigo-600">
                  Required
                </span>
              </div>
              <EvidenceUpload
                questionId={question.id}
                items={evidenceItems}
                onItemsChange={(items) =>
                  onEvidenceItemsChange(fieldName, items)
                }
                required
                readOnly={accepted}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}

function ReviewFeedback({
  question,
  evaluation,
  respondentUpdated,
}: {
  question: Question;
  evaluation: QuestionEvaluationResponse;
  respondentUpdated: boolean;
}) {
  const status = evaluation.validationStatus;
  const accepted = status === "ACCEPTED";
  const flagged = status === "FLAGGED";
  const Icon = accepted ? LockKeyhole : flagged ? Flag : PencilLine;

  return (
    <div
      className={cn(
        "mt-4 rounded-xl border px-3.5 py-3",
        accepted
          ? "border-emerald-200 bg-emerald-50"
          : flagged
            ? respondentUpdated
              ? "border-emerald-200 bg-emerald-50"
              : "border-orange-200 bg-orange-50"
            : "border-cyan-200 bg-cyan-50"
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 text-xs font-bold",
            accepted
              ? "text-emerald-800"
              : flagged
                ? respondentUpdated
                  ? "text-emerald-800"
                  : "text-orange-800"
                : "text-cyan-800"
          )}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          {accepted
            ? "Accepted by evaluator"
            : flagged
              ? respondentUpdated
                ? "Requested update completed"
                : "Changes requested"
              : "Adjusted by evaluator"}
        </span>

        {accepted && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
            <LockKeyhole className="h-3 w-3" aria-hidden="true" />
            Read only
          </span>
        )}
        {evaluation.manualScore != null && status === "ADJUSTED" && (
          <span className="text-[11px] font-semibold text-cyan-700">
            {formatEvaluatorResult(question, evaluation.manualScore)}
          </span>
        )}
      </div>

      {evaluation.reviewerNote?.trim() && (
        <p
          className={cn(
            "mt-2 whitespace-pre-wrap text-xs leading-5",
            accepted
              ? "text-emerald-800"
              : flagged
                ? respondentUpdated
                  ? "text-emerald-800"
                  : "text-orange-900"
                : "text-cyan-900"
          )}
        >
          {evaluation.reviewerNote}
        </p>
      )}
      {flagged && !respondentUpdated && (
        <p className="mt-2 text-[11px] font-semibold text-orange-700">
          Update this answer or its evidence to mark it ready for review.
        </p>
      )}
    </div>
  );
}

function formatEvaluatorResult(question: Question, score: number) {
  if (question.type === "boolean") {
    return `Evaluator result: ${score === 1 ? "Correct" : "Incorrect"}`;
  }
  if (question.type === "likert") {
    const pointCount = question.scalePointCount ?? 5;
    const ascendingScore = question.scaleHighPointIsMaximum ?? true
      ? score
      : 1 - score;
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
  if (question.type === "numeric" || question.type === "percentage") {
    return "Evaluator result calculated from the numeric response";
  }
  return `Evaluator score: ${score}`;
}

function getQuestionInstruction(question: Question) {
  switch (question.type) {
    case "boolean":
      return "Yes or no";
    case "likert":
      return "Choose a point on the scale";
    case "multiple_choice":
      return "Select one";
    case "numeric":
      return "Enter a number";
    case "percentage":
      return "Enter a percentage";
    case "open_answer":
      return "Written response";
    case "evidence":
      return "Provide evidence";
  }
}

function BooleanOptions({
  fieldName,
  value,
  disabled,
  onInputChange,
}: {
  fieldName: string;
  value: unknown;
  disabled: boolean;
  onInputChange: (field: string, value: string | number) => void;
}) {
  const options = [
    { label: "Yes", value: 1, icon: Check },
    { label: "No", value: 0, icon: X },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:max-w-md">
      {options.map((option) => {
        const selected = value === option.value;
        const Icon = option.icon;
        return (
          <label
            key={option.label}
            className={cn(
              "flex min-h-14 cursor-pointer items-center justify-center gap-2.5 rounded-xl border px-4 text-sm font-semibold transition",
              selected
                ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-500"
                : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/40",
              disabled && "cursor-not-allowed bg-slate-100 text-slate-400"
            )}
          >
            <input
              type="radio"
              name={fieldName}
              value={option.value}
              checked={selected}
              onChange={(event) =>
                onInputChange(fieldName, Number(event.target.value))
              }
              className="sr-only"
            />
            <Icon className="h-4 w-4" strokeWidth={2.25} />
            {option.label}
          </label>
        );
      })}
    </div>
  );
}

function LikertOptions({
  fieldName,
  value,
  pointCount,
  minLabel,
  maxLabel,
  disabled,
  onInputChange,
}: {
  fieldName: string;
  value: unknown;
  pointCount: number;
  minLabel?: string | null;
  maxLabel?: string | null;
  disabled: boolean;
  onInputChange: (field: string, value: string | number) => void;
}) {
  return (
    <div className="max-w-2xl overflow-x-auto pb-1">
      <div style={{ minWidth: `${Math.max(280, pointCount * 44)}px` }}>
        <div className="flex items-center justify-between gap-3">
          <span className="max-w-[40%] truncate text-xs font-medium text-slate-500">
            {minLabel?.trim() || "Minimum"}
          </span>
          <output
            htmlFor={fieldName}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-semibold",
              isAnswered(value)
                ? "bg-indigo-50 text-indigo-700"
                : "bg-slate-100 text-slate-500"
            )}
          >
            {isAnswered(value) ? `Point ${value}` : "Select a point"}
          </output>
          <span className="max-w-[40%] truncate text-right text-xs font-medium text-slate-500">
            {maxLabel?.trim() || "Maximum"}
          </span>
        </div>

        <div className="relative mt-5 h-12 rounded-lg px-2 focus-within:ring-2 focus-within:ring-indigo-200">
          <div className="absolute left-4 right-4 top-3 h-1 rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-indigo-500 transition-[width]"
              style={{
                width: isAnswered(value)
                  ? `${((Number(value) - 1) / (pointCount - 1)) * 100}%`
                  : "0%",
              }}
            />
          </div>
          <div className="pointer-events-none absolute left-4 right-4 top-1.5 flex justify-between">
            {Array.from({ length: pointCount }, (_, index) => index + 1).map((level) => (
              <span
                key={level}
                className={cn(
                  "flex h-4 w-4 items-center justify-center rounded-full border-2 bg-white transition",
                  Number(value) >= level
                    ? "border-indigo-500"
                    : "border-slate-300"
                )}
              >
                {Number(value) === level && (
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
                )}
              </span>
            ))}
          </div>
          <input
            id={fieldName}
            type="range"
            min={1}
            max={pointCount}
            step={1}
            value={isAnswered(value) ? Number(value) : 1}
            onPointerDown={(event) => {
              const bounds = event.currentTarget.getBoundingClientRect();
              const position = Math.max(
                0,
                Math.min(1, (event.clientX - bounds.left) / bounds.width)
              );
              onInputChange(
                fieldName,
                Math.round(1 + position * (pointCount - 1))
              );
            }}
            onKeyDown={(event) => {
              if (
                !isAnswered(value) &&
                (event.key === "Enter" ||
                  event.key === " " ||
                  event.key === "Home")
              ) {
                event.preventDefault();
                onInputChange(fieldName, 1);
              }
            }}
            onChange={(event) =>
              onInputChange(fieldName, Number(event.target.value))
            }
            aria-label="Scale point"
            className="absolute left-2 right-2 top-0 h-7 cursor-pointer opacity-0 disabled:cursor-not-allowed"
          />
          <div className="absolute bottom-0 left-2 right-2 flex justify-between text-[11px] font-semibold text-slate-500">
            {Array.from({ length: pointCount }, (_, index) => (
              <span key={index + 1} className="w-4 text-center">
                {index + 1}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ChoiceOptions({
  question,
  fieldName,
  value,
  disabled,
  onInputChange,
}: {
  question: Question;
  fieldName: string;
  value: unknown;
  disabled: boolean;
  onInputChange: (field: string, value: string | number) => void;
}) {
  if (!question.choices?.length) {
    return (
      <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
        No answer options are configured for this question.
      </p>
    );
  }

  return (
    <div className="grid max-w-2xl gap-2">
      {question.choices.map((choice, index) => {
        const selected = Math.abs(Number(value) - choice.score) <= 1e-9;
        return (
          <label
            key={`${choice.score}-${index}`}
            className={cn(
              "flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm transition",
              selected
                ? "border-indigo-400 bg-indigo-50 text-slate-950 ring-1 ring-indigo-400"
                : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-slate-50",
              disabled && "cursor-not-allowed bg-slate-100 text-slate-400"
            )}
          >
            <input
              type="radio"
              name={fieldName}
              value={choice.score}
              checked={selected}
              onChange={(event) =>
                onInputChange(fieldName, Number(event.target.value))
              }
              className="sr-only"
            />
            <span
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                selected
                  ? "border-indigo-600 bg-indigo-600 text-white"
                  : "border-slate-300 bg-white"
              )}
            >
              {selected && <Check className="h-3 w-3" strokeWidth={3} />}
            </span>
            <span className="leading-5">{choice.label}</span>
          </label>
        );
      })}
    </div>
  );
}

function NumericResponseField({
  fieldName,
  value,
  bounds,
  invalid,
  suffix,
  showSlider = false,
  onInputChange,
}: {
  fieldName: string;
  value: unknown;
  bounds: { min: number; max: number } | null;
  invalid: boolean;
  suffix?: string;
  showSlider?: boolean;
  onInputChange: (field: string, value: string | number) => void;
}) {
  const descriptionId = `${fieldName}-range-description`;
  const errorId = `${fieldName}-range-error`;

  return (
    <div className={showSlider ? "max-w-2xl" : "max-w-sm"}>
      <div className={cn(showSlider && bounds && "grid gap-4 sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-center")}>
        <div
          className={cn(
            "flex h-14 items-center overflow-hidden rounded-xl border bg-white transition focus-within:ring-2",
            invalid
              ? "border-red-400 focus-within:border-red-500 focus-within:ring-red-100"
              : "border-slate-300 focus-within:border-indigo-500 focus-within:ring-indigo-100"
          )}
        >
          <input
            type="number"
            step={1}
            min={bounds?.min}
            max={bounds?.max}
            value={(value as string | number | undefined) ?? ""}
            aria-invalid={invalid}
            aria-describedby={
              invalid ? `${descriptionId} ${errorId}` : descriptionId
            }
            onChange={(event) =>
              onInputChange(
                fieldName,
                event.target.value === "" ? "" : Number(event.target.value)
              )
            }
            className="h-full min-w-0 flex-1 border-0 bg-transparent px-4 text-lg font-semibold text-slate-950 outline-none ring-0 placeholder:font-normal placeholder:text-slate-400 focus:ring-0 disabled:bg-slate-100"
            placeholder={bounds ? `${bounds.min} – ${bounds.max}` : "0"}
          />
          {suffix && (
            <span className="border-l border-slate-200 px-4 text-base font-semibold text-slate-500">
              {suffix}
            </span>
          )}
        </div>
        {showSlider && bounds && (
          <div className="px-1">
            <input
              type="range"
              min={bounds.min}
              max={bounds.max}
              step={1}
              value={isAnswered(value) ? Number(value) : bounds.min}
              onPointerDown={(event) => {
                const slider = event.currentTarget.getBoundingClientRect();
                const position = Math.max(
                  0,
                  Math.min(1, (event.clientX - slider.left) / slider.width)
                );
                onInputChange(
                  fieldName,
                  Math.round(bounds.min + position * (bounds.max - bounds.min))
                );
              }}
              onChange={(event) =>
                onInputChange(fieldName, Number(event.target.value))
              }
              aria-label="Percentage"
              className="h-2 w-full cursor-pointer accent-indigo-600 disabled:cursor-not-allowed"
            />
            <div className="mt-1 flex justify-between text-[11px] font-medium text-slate-500">
              <span>{bounds.min}%</span>
              <span>{bounds.max}%</span>
            </div>
          </div>
        )}
      </div>
      {bounds && (
        <p id={descriptionId} className="mt-2 text-xs text-slate-500">
          Accepted range: {bounds.min} to {bounds.max}
          {suffix}
        </p>
      )}
      {invalid && bounds && (
        <p
          id={errorId}
          role="alert"
          className="mt-1 text-xs font-medium text-red-600"
        >
          Enter a whole number between {bounds.min} and {bounds.max}
          {suffix}.
        </p>
      )}
    </div>
  );
}

function OpenAnswerField({
  fieldName,
  value,
  onInputChange,
}: {
  fieldName: string;
  value: unknown;
  onInputChange: (field: string, value: string | number) => void;
}) {
  const length = String(value ?? "").length;
  return (
    <div>
      <textarea
        value={(value as string | undefined) || ""}
        maxLength={TEXT_LIMITS.openAnswer}
        onChange={(event) => onInputChange(fieldName, event.target.value)}
        className="min-h-36 w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100"
        placeholder="Write a concise response with the relevant details…"
      />
      <div className="mt-1.5 flex items-center justify-between gap-3 text-xs text-slate-500">
        <span>Your response is saved automatically.</span>
        <span>
          {length.toLocaleString()} / {TEXT_LIMITS.openAnswer.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
