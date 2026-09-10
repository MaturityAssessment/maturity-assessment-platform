"use client";

import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  FileText,
  Flag,
  Link2,
  LockKeyhole,
  PencilLine,
  Send,
} from "lucide-react";
import type {
  AssessmentData,
  MaturityModel,
  Question,
  QuestionEvaluationResponse,
} from "@/api/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AssessmentPracticeStep } from "./AssessmentStep";
import {
  getFieldName,
  isAnswered,
  isDependentQuestionDisabled,
  isEvidenceOnlyQuestion,
} from "./assessmentFlowUtils";
import type { AssessmentEvidenceByField } from "./assessmentEvidence";

interface ReviewStepProps {
  maturityModel: MaturityModel;
  practiceSteps: AssessmentPracticeStep[];
  formData: AssessmentData;
  evidenceFiles: AssessmentEvidenceByField;
  questionEvaluations?: Record<string, QuestionEvaluationResponse>;
  respondentUpdatedResponseKeys: ReadonlySet<string>;
  changesRequested: boolean;
  isSubmitting: boolean;
  backLabel?: string;
  onBack: () => void;
  onSubmit: () => void;
}

export default function ReviewStep({
  maturityModel,
  practiceSteps,
  formData,
  evidenceFiles,
  questionEvaluations,
  respondentUpdatedResponseKeys,
  changesRequested,
  isSubmitting,
  backLabel = "Back to assessment",
  onBack,
  onSubmit,
}: ReviewStepProps) {
  const dimensions = maturityModel.dimensions.map((dimension) => ({
    dimension,
    steps: practiceSteps.filter((step) => step.dimension === dimension),
  }));

  return (
    <section className="space-y-5">
      <div className="rounded-lg border border-blue-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              <CheckCircle2 className="h-4 w-4" />
              {changesRequested ? "Updates complete" : "Ready for submission"}
            </div>
            <h1 className="mt-3 text-2xl font-semibold text-gray-950">
              {changesRequested
                ? "Review your updates"
                : "Review your assessment"}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
              {changesRequested
                ? "Check the requested changes before resubmitting the assessment for evaluation."
                : "Check the answers and saved evidence before submitting. Files and secure links are preserved whenever the draft is saved."}
            </p>
          </div>
          <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
            <span className="font-semibold text-gray-950">
              {maturityModel.name}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {dimensions.map(({ dimension, steps }) => (
          <div
            key={dimension.id || dimension.name}
            className="rounded-lg border border-gray-200 bg-white shadow-sm"
          >
            <div className="border-b border-gray-100 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                Dimension
              </p>
              <h2 className="mt-1 text-lg font-semibold text-gray-950">
                {dimension.name}
              </h2>
            </div>

            <div className="divide-y divide-gray-100">
              {dimension.modules.map((module) => {
                const moduleSteps = steps.filter((step) => step.module === module);
                if (moduleSteps.length === 0) return null;

                return (
                  <div key={module.code || module.name} className="px-5 py-4">
                    <h3 className="text-sm font-semibold text-gray-900">
                      {module.name}
                    </h3>

                    <div className="mt-3 space-y-3">
                      {moduleSteps.map((step) => (
                        <div
                          key={step.key}
                          className="rounded-lg border border-gray-200 bg-gray-50"
                        >
                          <div className="border-b border-gray-200 px-4 py-3">
                            <p className="text-sm font-semibold text-gray-950">
                              {step.practice.name}
                            </p>
                          </div>

                          <div className="divide-y divide-gray-200">
                            {step.practice.questions.length === 0 ? (
                              <p className="px-4 py-3 text-sm text-gray-500">
                                No questions in this practice.
                              </p>
                            ) : (
                              step.practice.questions.map((question) => (
                                <QuestionReviewRow
                                  key={`${step.key}-${question.id || question.text}`}
                                  step={step}
                                  question={question}
                                  formData={formData}
                                  evidenceFiles={evidenceFiles}
                                  evaluation={
                                    question.id == null
                                      ? undefined
                                      : questionEvaluations?.[
                                          getFieldName(step, question)
                                        ]
                                  }
                                  respondentUpdatedResponseKeys={
                                    respondentUpdatedResponseKeys
                                  }
                                />
                              ))
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isSubmitting}
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Button>
        <Button type="button" onClick={onSubmit} disabled={isSubmitting}>
          <Send className="h-4 w-4" />
          {isSubmitting
            ? "Submitting..."
            : changesRequested
              ? "Resubmit assessment"
              : "Submit assessment"}
        </Button>
      </div>
    </section>
  );
}

function QuestionReviewRow({
  step,
  question,
  formData,
  evidenceFiles,
  evaluation,
  respondentUpdatedResponseKeys,
}: {
  step: AssessmentPracticeStep;
  question: Question;
  formData: AssessmentData;
  evidenceFiles: AssessmentEvidenceByField;
  evaluation?: QuestionEvaluationResponse;
  respondentUpdatedResponseKeys: ReadonlySet<string>;
}) {
  if (!question.id) return null;

  const fieldName = getFieldName(step, question);
  const disabled = isDependentQuestionDisabled(step, question, formData);
  const evidenceItems = evidenceFiles.get(fieldName) || [];
  const respondentUpdated = Boolean(
    evaluation?.respondentUpdated ||
      respondentUpdatedResponseKeys.has(fieldName)
  );
  const answer = disabled
    ? "Not applicable"
    : isEvidenceOnlyQuestion(question)
      ? evidenceItems.length > 0
        ? `${evidenceItems.length} evidence item${evidenceItems.length === 1 ? "" : "s"} provided`
        : "No evidence provided"
      : formatAnswer(question, formData[fieldName]);

  return (
    <div
      className={cn(
        "grid gap-3 px-4 py-3 text-sm md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]",
        disabled && "bg-gray-100 text-gray-500"
      )}
    >
      <div>
        <p className={cn("font-medium", disabled ? "text-gray-500" : "text-gray-900")}>
          {question.text}
        </p>
        {evaluation?.validationStatus && (
          <ReviewStatus
            evaluation={evaluation}
            respondentUpdated={respondentUpdated}
          />
        )}
        {question.required && !disabled && (
          <p className="mt-1 text-xs font-medium text-blue-600">Required</p>
        )}
      </div>

      <div className="space-y-2">
        <p className={cn("text-gray-700", disabled && "text-gray-500")}>
          {answer}
        </p>
        {!disabled &&
          evidenceItems.map((item) => (
            <div
              key={item.id}
              className="flex max-w-full items-start gap-2 rounded-md border border-blue-100 bg-blue-50 px-2 py-1.5 text-xs text-blue-900"
            >
              {item.type === "file" ? (
                <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              ) : (
                <Link2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              )}
              <div className="min-w-0">
                {item.type === "file" ? (
                  <p className="truncate font-medium">
                    {item.fileName || item.file?.name || "Evidence file"}
                  </p>
                ) : (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex max-w-full items-center gap-1 font-medium underline"
                  >
                    <span className="truncate">{item.url}</span>
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                )}
                {item.description && (
                  <p className="mt-0.5 text-blue-700">{item.description}</p>
                )}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

function ReviewStatus({
  evaluation,
  respondentUpdated,
}: {
  evaluation: QuestionEvaluationResponse;
  respondentUpdated: boolean;
}) {
  const status = evaluation.validationStatus;
  const accepted = status === "ACCEPTED";
  const flagged = status === "FLAGGED";
  const Icon = accepted ? LockKeyhole : flagged ? Flag : PencilLine;

  return (
    <div className="mt-1.5">
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
          accepted
            ? "bg-emerald-50 text-emerald-700"
            : flagged
              ? respondentUpdated
                ? "bg-emerald-50 text-emerald-700"
                : "bg-orange-50 text-orange-700"
              : "bg-cyan-50 text-cyan-700"
        )}
      >
        <Icon className="h-3 w-3" aria-hidden="true" />
        {accepted
          ? "Accepted"
          : flagged
            ? respondentUpdated
              ? "Updated"
              : "Changes requested"
            : "Adjusted"}
      </span>
      {evaluation.reviewerNote?.trim() && (
        <p className="mt-1 text-xs leading-5 text-gray-500">
          {evaluation.reviewerNote}
        </p>
      )}
    </div>
  );
}

function formatAnswer(question: Question, value: unknown) {
  if (!isAnswered(value)) return "No answer provided";

  if (question.type === "boolean") {
    return Number(value) === 1 ? "Yes" : "No";
  }

  if (question.type === "percentage") {
    return `${String(value)}%`;
  }

  if (question.type === "multiple_choice") {
    return (
      question.choices?.find(
        (choice) => Math.abs(choice.score - Number(value)) <= 1e-9
      )?.label ||
      String(value)
    );
  }

  return String(value);
}
