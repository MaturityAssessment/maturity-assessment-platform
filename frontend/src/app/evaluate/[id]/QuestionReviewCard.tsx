"use client";

import { useState } from "react";
import {
  Check,
  Edit3,
  Flag,
  MessageSquarePlus,
  Paperclip,
} from "lucide-react";
import Tippy from "@tippyjs/react";
import { Modal } from "@/components";
import type { MaturityLevel, QuestionEvaluationStatus } from "@/api/types";
import { TEXT_LIMITS } from "@/config/textLimits";
import { cn } from "@/lib/utils";
import {
  formatQuestionResponseValue,
  questionTypeLabel,
} from "./evaluationModel";
import EvidenceReviewList from "./EvidenceReviewList";
import type { EvaluationQuestion, QuestionReviewDraft } from "./types";

interface QuestionReviewCardProps {
  question: EvaluationQuestion;
  review: QuestionReviewDraft;
  maturityLevels: MaturityLevel[];
  scoreOptions: Array<{ value: number; label: string }>;
  onChange: (responseKey: string, review: QuestionReviewDraft) => void;
  onDownloadEvidence: (evidenceId: number, fileName?: string | null) => void;
}

export default function QuestionReviewCard({
  question,
  review,
  maturityLevels,
  scoreOptions,
  onChange,
  onDownloadEvidence,
}: QuestionReviewCardProps) {
  const [attachmentsOpen, setAttachmentsOpen] = useState(false);
  const [noteExpanded, setNoteExpanded] = useState(
    Boolean(review.reviewerNote)
  );
  const needsScore =
    question.requiresManualScore || review.validationStatus === "ADJUSTED";
  const needsNote =
    review.validationStatus === "ADJUSTED" ||
    review.validationStatus === "FLAGGED";
  const showNote = noteExpanded || needsNote || Boolean(review.reviewerNote);
  const questionLabel = question.question.code || `Question ${question.questionId}`;
  const isBoolean = question.question.type === "boolean";
  const isScale = question.question.type === "likert";
  const isMultipleChoice = question.question.type === "multiple_choice";
  const isRangeQuestion =
    question.question.type === "numeric" ||
    question.question.type === "percentage";
  const scalePointCount = question.question.scalePointCount ?? 5;
  const manualScoreOptions = isBoolean
    ? [
        { value: 0, label: "Incorrect" },
        { value: 1, label: "Correct" },
      ]
    : isScale
      ? Array.from({ length: scalePointCount }, (_, index) => {
          const point = index + 1;
          const ascendingScore = index / (scalePointCount - 1);
          const value = question.question.scaleHighPointIsMaximum ?? true
            ? ascendingScore
            : 1 - ascendingScore;
          const endpointLabel =
            point === 1
              ? question.question.scaleMinLabel
              : point === scalePointCount
                ? question.question.scaleMaxLabel
                : undefined;
          return {
            value,
            label: `Point ${point}${endpointLabel?.trim() ? `: ${endpointLabel}` : ""}`,
          };
        })
    : isMultipleChoice
      ? (question.question.choices ?? []).map((choice) => ({
          value: choice.score,
          label: choice.label,
        }))
      : scoreOptions;

  const update = (patch: Partial<QuestionReviewDraft>) => {
    onChange(question.responseKey, { ...review, ...patch });
  };
  const toggleStatus = (status: QuestionEvaluationStatus) => {
    const nextStatus =
      review.validationStatus === status ? undefined : status;
    update({
      validationStatus: nextStatus,
      manualScore:
        nextStatus === "ADJUSTED" || question.requiresManualScore
          ? review.manualScore
          : undefined,
    });
  };

  return (
    <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <Modal
        isOpen={attachmentsOpen}
        onClose={() => setAttachmentsOpen(false)}
        title="Question attachments"
        maxWidth="2xl"
      >
        <EvidenceReviewList
          evidence={question.evidence}
          onDownload={onDownloadEvidence}
        />
      </Modal>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase text-gray-500">
            {question.moduleName} / {question.practiceName}
          </p>
          <h3 className="mt-1 text-sm font-semibold leading-6 text-gray-950">
            {question.question.text}
          </h3>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
            <span>{questionLabel}</span>
            <span>{questionTypeLabel(question.question)}</span>
            {question.question.requiresEvidence && <span>Evidence required</span>}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => toggleStatus("ACCEPTED")}
            className={cn(
              "inline-flex h-9 items-center gap-1 rounded-md border px-3 text-xs font-semibold",
              review.validationStatus === "ACCEPTED"
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            )}
          >
            <Check className="h-3.5 w-3.5" />
            Accepted
          </button>
          <button
            type="button"
            onClick={() => toggleStatus("ADJUSTED")}
            className={cn(
              "inline-flex h-9 items-center gap-1 rounded-md border px-3 text-xs font-semibold",
              review.validationStatus === "ADJUSTED"
                ? "border-amber-600 bg-amber-600 text-white"
                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            )}
          >
            <Edit3 className="h-3.5 w-3.5" />
            Adjusted
          </button>
          <Tippy content="Flag this answer or its evidence for follow-up. A reviewer note is required.">
            <button
              type="button"
              onClick={() => toggleStatus("FLAGGED")}
              className={cn(
                "inline-flex h-9 w-9 items-center justify-center rounded-md border text-xs font-semibold",
                review.validationStatus === "FLAGGED"
                  ? "border-red-600 bg-red-600 text-white"
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              )}
              aria-label="Flag answer or evidence"
            >
              <Flag className="h-4 w-4" />
            </button>
          </Tippy>
        </div>
      </div>

      <section className="mt-4 rounded-md border border-gray-200 bg-gray-50 p-3">
        <p className="mb-2 text-xs font-semibold uppercase text-gray-500">
          Submitted answer
        </p>
        <pre className="whitespace-pre-wrap font-sans text-sm leading-6 text-gray-800">
          {formatQuestionResponseValue(
            question.question,
            question.responseValue,
            maturityLevels
          )}
        </pre>
        <p className="mt-2 text-xs font-medium text-gray-600">
          {question.initialScore != null
            ? isBoolean
              ? `Initial automated result: ${question.initialScore === 1 ? "Correct" : "Incorrect"}`
              : isScale
                ? "Initial automated result calculated from the scale response"
              : isMultipleChoice
                ? "Initial automated result calculated from the selected option"
              : isRangeQuestion
                ? "Initial automated result calculated from the numeric response"
              : `Initial automated score: ${question.initialScore}`
            : "Not automatically scored"}
        </p>
      </section>

      <div className="mt-4 flex flex-col gap-3 border-t border-gray-100 pt-4">
        <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2 text-gray-600">
            <Paperclip className="h-4 w-4 shrink-0 text-gray-400" />
            {question.evidence.length > 0 ? (
              <span>{question.evidence.length} attachment{question.evidence.length === 1 ? "" : "s"} provided</span>
            ) : (
              <span>No attachments provided</span>
            )}
          </div>
          {question.evidence.length > 0 && (
            <button
              type="button"
              onClick={() => setAttachmentsOpen(true)}
              className="inline-flex h-8 items-center justify-center rounded-md border border-gray-300 bg-white px-3 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              Show attachments
            </button>
          )}
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(220px,320px)_1fr]">
          {needsScore && (
          <section>
            <div className="mb-2 flex items-center justify-between gap-2">
              <label
                htmlFor={`score-${question.responseKey}`}
                className="text-sm font-semibold text-gray-900"
              >
                {isBoolean
                  ? "Manual result"
                  : isScale
                    ? "Manual scale point"
                    : isMultipleChoice
                      ? "Manual option"
                    : isRangeQuestion
                      ? "Manual normalized score"
                    : "Manual score"}
              </label>
              <span className="text-xs font-medium text-red-600">
                Required
              </span>
            </div>
            {isRangeQuestion ? (
              <input
                id={`score-${question.responseKey}`}
                type="number"
                min={0}
                max={1}
                step="0.01"
                value={review.manualScore ?? ""}
                onChange={(event) =>
                  update({
                    manualScore: event.target.value
                      ? Number(event.target.value)
                      : undefined,
                  })
                }
                placeholder="0 to 1"
                className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <select
                id={`score-${question.responseKey}`}
                value={review.manualScore ?? ""}
                onChange={(event) =>
                  update({
                    manualScore: event.target.value
                      ? Number(event.target.value)
                      : undefined,
                  })
                }
                className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">
                  {isBoolean
                    ? "Select result"
                    : isScale
                      ? "Select scale point"
                      : isMultipleChoice
                        ? "Select option"
                        : "Select maturity level"}
                </option>
                {manualScoreOptions.map((score, index) => (
                  <option key={`${score.value}-${index}`} value={score.value}>
                    {score.label}
                  </option>
                ))}
              </select>
            )}
          </section>
          )}

          <section className={cn(!needsScore && "lg:col-span-2")}>
            {!showNote ? (
              <button
                type="button"
                onClick={() => setNoteExpanded(true)}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                <MessageSquarePlus className="h-4 w-4" />
                Add note
              </button>
            ) : (
              <>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <label
                    htmlFor={`note-${question.responseKey}`}
                    className="text-sm font-semibold text-gray-900"
                  >
                    Reviewer note
                  </label>
                  {needsNote && (
                    <span className="text-xs font-medium text-red-600">
                      Required
                    </span>
                  )}
                </div>
                <textarea
                  id={`note-${question.responseKey}`}
                  value={review.reviewerNote}
                  maxLength={TEXT_LIMITS.description}
                  onChange={(event) =>
                    update({ reviewerNote: event.target.value })
                  }
                  rows={3}
                  className="w-full resize-y border-0 border-b border-gray-300 bg-transparent px-0 py-2 text-sm text-gray-900 outline-none focus:border-blue-600 focus:ring-0"
                  placeholder="Add evaluation notes for this answer."
                />
              </>
            )}
          </section>
        </div>
      </div>
    </article>
  );
}
