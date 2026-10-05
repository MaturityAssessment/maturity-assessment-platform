"use client";

import { cva } from "class-variance-authority";
import Tippy from "@tippyjs/react";
import {
  AlertCircle,
  Bot,
  Check,
  Flag,
  LockKeyhole,
  PencilLine,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  QuestionCardFeedbackModel,
  QuestionCardFeedbackTone,
  QuestionCardProps,
  QuestionCardStatus,
} from "./types";

const cardVariants = cva(
  "group overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-200",
  {
    variants: {
      status: {
        unanswered:
          "border-slate-200 hover:border-slate-300 hover:shadow-md",
        complete: "border-emerald-200/80 shadow-emerald-950/[0.03]",
        disabled: "border-slate-200 bg-slate-50/80 opacity-70",
        accepted:
          "border-emerald-300 bg-emerald-50/20 shadow-emerald-950/[0.04]",
        flagged:
          "border-orange-300 bg-orange-50/20 shadow-orange-950/[0.04]",
        "flagged-updated":
          "border-orange-300 bg-orange-50/20 shadow-orange-950/[0.04]",
        adjusted:
          "border-cyan-300 bg-cyan-50/20 shadow-cyan-950/[0.04]",
      },
    },
    defaultVariants: { status: "unanswered" },
  }
);

const indicatorVariants = cva(
  "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors",
  {
    variants: {
      status: {
        unanswered: "border-slate-200 bg-slate-50 text-slate-400",
        complete: "border-emerald-200 bg-emerald-50 text-emerald-600",
        disabled: "border-slate-200 bg-slate-50 text-slate-400",
        accepted: "border-emerald-300 bg-emerald-100 text-emerald-700",
        flagged: "border-orange-300 bg-orange-100 text-orange-700",
        "flagged-updated":
          "border-emerald-300 bg-emerald-100 text-emerald-700",
        adjusted: "border-cyan-300 bg-cyan-100 text-cyan-700",
      },
    },
    defaultVariants: { status: "unanswered" },
  }
);

const feedbackContainerVariants = cva("mt-4 rounded-xl border px-3.5 py-3", {
  variants: {
    tone: {
      accepted: "border-emerald-200 bg-emerald-50",
      flagged: "border-orange-200 bg-orange-50",
      updated: "border-emerald-200 bg-emerald-50",
      adjusted: "border-cyan-200 bg-cyan-50",
    },
  },
});

const feedbackTextVariants = cva("text-xs", {
  variants: {
    tone: {
      accepted: "text-emerald-800",
      flagged: "text-orange-800",
      updated: "text-emerald-800",
      adjusted: "text-cyan-800",
    },
  },
});

export function QuestionCard({
  title,
  instruction,
  status,
  required = false,
  complete = status === "complete",
  interactionDisabled = false,
  disabledMessage,
  guidance,
  feedback,
  headerActions,
  responseDetails,
  footer,
  onAskAssistant,
  onClear,
  anchors,
  children,
}: QuestionCardProps) {
  const disabled = status === "disabled";
  // Review markers remain visible when a dependency disables the answer.
  const indicatorStatus = disabled && feedback
    ? ({
        accepted: "accepted",
        flagged: "flagged",
        updated: "flagged-updated",
        adjusted: "adjusted",
      } as const)[feedback.tone]
    : status;

  return (
    <article
      data-help-tour={anchors?.root || undefined}
      className={cardVariants({ status })}
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-3.5">
          <div className={indicatorVariants({ status: indicatorStatus })} aria-hidden="true">
            <StatusIcon status={indicatorStatus} complete={complete && !disabled} />
          </div>

          <div className="min-w-0 flex-1">
            <div
              data-help-tour={anchors?.actions || undefined}
              className="flex flex-col items-start justify-between gap-3 sm:flex-row"
            >
              <div>
                <p
                  data-help-tour={anchors?.requirements || undefined}
                  className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500"
                >
                  {instruction}
                  {required && !disabled && (
                    <span className="ml-2 normal-case tracking-normal text-indigo-600">
                      Required
                    </span>
                  )}
                </p>
                <h3
                  className={cn(
                    "mt-1.5 text-[15px] font-semibold leading-6 sm:text-base",
                    disabled ? "text-slate-500" : "text-slate-950"
                  )}
                >
                  {title}
                </h3>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-1 self-end sm:self-start">
                {headerActions}
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

                {onClear && (
                  <Tippy content="Clear answer">
                    <button
                      type="button"
                      onClick={onClear}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                      aria-label="Clear answer"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>
                  </Tippy>
                )}

                {guidance && (
                  <Tippy
                    content={
                      <div className="max-w-sm p-2 text-sm leading-5">
                        {guidance}
                      </div>
                    }
                  >
                    <button
                      type="button"
                      data-help-tour={anchors?.guidance || undefined}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                      aria-label="Question guidance"
                    >
                      <AlertCircle className="h-4 w-4" />
                    </button>
                  </Tippy>
                )}
              </div>
            </div>

            {disabledMessage && (
              <p className="mt-2 text-xs leading-5 text-slate-500">
                {disabledMessage}
              </p>
            )}

            {feedback && <QuestionCardFeedback feedback={feedback} />}

            <fieldset
              disabled={interactionDisabled}
              className="mt-5 disabled:pointer-events-none"
            >
              {children}
            </fieldset>
            {responseDetails}
          </div>
        </div>
      </div>
      {footer}
    </article>
  );
}

function QuestionCardFeedback({
  feedback,
}: {
  feedback: QuestionCardFeedbackModel;
}) {
  const Icon = getFeedbackIcon(feedback.tone);

  return (
    <div className={feedbackContainerVariants({ tone: feedback.tone })}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span
          className={cn(
            feedbackTextVariants({ tone: feedback.tone }),
            "inline-flex items-center gap-1.5 font-bold"
          )}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          {feedback.title}
        </span>

        {feedback.readOnly && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
            <LockKeyhole className="h-3 w-3" aria-hidden="true" />
            Read only
          </span>
        )}
        {feedback.result && (
          <span
            className={cn(
              feedbackTextVariants({ tone: feedback.tone }),
              "text-[11px] font-semibold"
            )}
          >
            {feedback.result}
          </span>
        )}
      </div>

      {feedback.note && (
        <p
          className={cn(
            feedbackTextVariants({ tone: feedback.tone }),
            "mt-2 whitespace-pre-wrap leading-5",
            feedback.tone === "flagged" && "text-orange-900",
            feedback.tone === "adjusted" && "text-cyan-900"
          )}
        >
          {feedback.note}
        </p>
      )}
      {feedback.prompt && (
        <p className="mt-2 text-[11px] font-semibold text-orange-700">
          {feedback.prompt}
        </p>
      )}
    </div>
  );
}

function StatusIcon({
  status,
  complete,
}: {
  status: QuestionCardStatus;
  complete: boolean;
}) {
  if (status === "accepted") return <LockKeyhole className="h-3.5 w-3.5" />;
  if (status === "flagged") return <Flag className="h-3.5 w-3.5" />;
  if (status === "adjusted") return <PencilLine className="h-3.5 w-3.5" />;
  if (complete && status !== "disabled") {
    return <Check className="h-4 w-4" strokeWidth={2.5} />;
  }
  return <span className="h-1.5 w-1.5 rounded-full bg-current" />;
}

function getFeedbackIcon(tone: QuestionCardFeedbackTone) {
  if (tone === "accepted") return LockKeyhole;
  if (tone === "flagged" || tone === "updated") return Flag;
  return PencilLine;
}
