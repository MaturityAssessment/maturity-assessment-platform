"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronRight,
  Flag,
  MapPinned,
  PencilLine,
} from "lucide-react";
import type {
  AssessmentData,
  AssessmentEvidenceInputItem,
  AssessmentResponse,
} from "@/api/types";
import { cn } from "@/lib/utils";
import type { AssessmentPracticeStep } from "./AssessmentStep";
import AssessmentQuestionCard from "./AssessmentQuestionCard";
import type { AssessmentEvidenceByField } from "./assessmentEvidence";
import {
  buildAssessmentFeedbackReviewItems,
  isReviewedItemUpdated,
} from "./assessmentReviewFeedback";
import { isDependentQuestionDisabled } from "./assessmentFlowUtils";

type AssessmentFeedbackReviewTabProps = {
  modelMaxLevel: number;
  practiceSteps: AssessmentPracticeStep[];
  formData: AssessmentData;
  evidenceFiles: AssessmentEvidenceByField;
  questionEvaluations?: AssessmentResponse["questionEvaluations"];
  respondentUpdatedResponseKeys: ReadonlySet<string>;
  onInputChange: (field: string, value: string | number) => void;
  onClearAnswer: (field: string) => void;
  onEvidenceItemsChange: (
    field: string,
    items: AssessmentEvidenceInputItem[]
  ) => void;
};

export default function AssessmentFeedbackReviewTab({
  modelMaxLevel,
  practiceSteps,
  formData,
  evidenceFiles,
  questionEvaluations,
  respondentUpdatedResponseKeys,
  onInputChange,
  onClearAnswer,
  onEvidenceItemsChange,
}: AssessmentFeedbackReviewTabProps) {
  const items = useMemo(
    () =>
      buildAssessmentFeedbackReviewItems(
        practiceSteps,
        questionEvaluations
      ),
    [practiceSteps, questionEvaluations]
  );
  const itemRefs = useRef(new Map<string, HTMLElement>());
  const scrollFrameRef = useRef<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const flaggedCount = items.filter(
    ({ evaluation }) => evaluation.validationStatus === "FLAGGED"
  ).length;
  const outstandingCount = items.filter(
    ({ evaluation }) =>
      evaluation.validationStatus === "FLAGGED" &&
      !isReviewedItemUpdated(evaluation, respondentUpdatedResponseKeys)
  ).length;
  const completedFlaggedCount = flaggedCount - outstandingCount;

  const updateActiveItem = useCallback(() => {
    if (items.length === 0) return;

    const pageAnchor = window.innerHeight * 0.5;
    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    items.forEach((item, index) => {
      const element = itemRefs.current.get(item.fieldName);
      if (!element) return;
      const bounds = element.getBoundingClientRect();
      const distance =
        bounds.top <= pageAnchor && bounds.bottom >= pageAnchor
          ? 0
          : Math.min(
              Math.abs(bounds.top - pageAnchor),
              Math.abs(bounds.bottom - pageAnchor)
            );
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    setActiveIndex(closestIndex);
  }, [items]);

  useEffect(() => {
    const handleViewportChange = () => {
      if (scrollFrameRef.current !== null) return;
      scrollFrameRef.current = window.requestAnimationFrame(() => {
        scrollFrameRef.current = null;
        updateActiveItem();
      });
    };

    updateActiveItem();
    window.addEventListener("scroll", handleViewportChange, { passive: true });
    window.addEventListener("resize", handleViewportChange);
    return () => {
      window.removeEventListener("scroll", handleViewportChange);
      window.removeEventListener("resize", handleViewportChange);
      if (scrollFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollFrameRef.current);
      }
    };
  }, [updateActiveItem]);

  const scrollToItem = (fieldName: string, index: number) => {
    setActiveIndex(index);
    itemRefs.current.get(fieldName)?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "center",
    });
  };

  if (items.length === 0) return null;

  return (
    <main
      id="assessment-panel-review"
      role="tabpanel"
      aria-labelledby="assessment-tab-review"
      className="mx-auto w-full max-w-5xl px-4 pb-16 pt-7 sm:px-6 lg:pt-9"
    >
      <header>
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <MapPinned className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-950">
              Review evaluator feedback
            </h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
              Work through the reviewed questions in their original assessment
              order. Flagged questions require an update; evaluator adjustments
              are shown for context.
            </p>
          </div>
        </div>
      </header>

      <ReviewProgressMap
        items={items}
        activeIndex={activeIndex}
        outstandingCount={outstandingCount}
        completedFlaggedCount={completedFlaggedCount}
        flaggedCount={flaggedCount}
        respondentUpdatedResponseKeys={respondentUpdatedResponseKeys}
        onItemSelect={scrollToItem}
      />

      <div className="mt-7 space-y-8">
        {items.map((item, index) => {
          const respondentUpdated = isReviewedItemUpdated(
            item.evaluation,
            respondentUpdatedResponseKeys
          );

          return (
            <section
              key={item.fieldName}
              ref={(node) => {
                if (node) {
                  itemRefs.current.set(item.fieldName, node);
                } else {
                  itemRefs.current.delete(item.fieldName);
                }
              }}
              className="scroll-mt-44"
              aria-label={`Reviewed item ${index + 1} of ${items.length}`}
            >
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <nav
                  className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs font-medium text-slate-500"
                  aria-label={`Location of reviewed item ${index + 1}`}
                >
                  <span className="font-semibold text-slate-700">
                    {item.step.dimension.name}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{item.step.module.name}</span>
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="text-slate-700">
                    {item.step.practice.name}
                  </span>
                </nav>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-400">
                  Item {index + 1} of {items.length}
                </span>
              </div>

              <AssessmentQuestionCard
                question={item.question}
                fieldName={item.fieldName}
                value={formData[item.fieldName]}
                evidenceItems={evidenceFiles.get(item.fieldName) || []}
                modelMaxLevel={modelMaxLevel}
                disabled={isDependentQuestionDisabled(
                  item.step,
                  item.question,
                  formData
                )}
                evaluation={item.evaluation}
                respondentUpdated={respondentUpdated}
                onInputChange={onInputChange}
                onClearAnswer={onClearAnswer}
                onEvidenceItemsChange={onEvidenceItemsChange}
              />
            </section>
          );
        })}
      </div>
      <div
        aria-hidden="true"
        className="h-[40vh] min-h-72 max-h-[720px]"
      />
    </main>
  );
}

function ReviewProgressMap({
  items,
  activeIndex,
  outstandingCount,
  completedFlaggedCount,
  flaggedCount,
  respondentUpdatedResponseKeys,
  onItemSelect,
}: {
  items: ReturnType<typeof buildAssessmentFeedbackReviewItems>;
  activeIndex: number;
  outstandingCount: number;
  completedFlaggedCount: number;
  flaggedCount: number;
  respondentUpdatedResponseKeys: ReadonlySet<string>;
  onItemSelect: (fieldName: string, index: number) => void;
}) {
  const currentItem = items[Math.min(activeIndex, items.length - 1)];
  const updateProgress =
    flaggedCount === 0 ? 100 : (completedFlaggedCount / flaggedCount) * 100;

  return (
    <section
      className="sticky top-0 z-20 mt-6 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-md shadow-slate-950/[0.06] backdrop-blur sm:p-5"
      aria-label="Review progress and page position"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="flex min-w-0 items-center gap-3 lg:w-[230px] lg:shrink-0">
          <span
            className={cn(
              "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
              outstandingCount > 0
                ? "bg-orange-100 text-orange-700"
                : "bg-emerald-100 text-emerald-700"
            )}
          >
            {outstandingCount > 0 ? (
              <Flag className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Check className="h-4 w-4" aria-hidden="true" />
            )}
          </span>
          <div>
            <p className="text-sm font-bold text-slate-950">
              {flaggedCount === 0
                ? "No changes required"
                : outstandingCount > 0
                  ? `${outstandingCount} ${
                      outstandingCount === 1 ? "change" : "changes"
                    } left`
                  : "Required updates complete"}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {flaggedCount > 0
                ? `${completedFlaggedCount} of ${flaggedCount} flagged items updated`
                : "Evaluator adjustments are shown for context"}
            </p>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="font-semibold text-slate-600">
              Update progress
            </span>
            <span className="font-semibold tabular-nums text-slate-500">
              {Math.round(updateProgress)}%
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-300",
                outstandingCount > 0 ? "bg-orange-500" : "bg-emerald-500"
              )}
              style={{ width: `${updateProgress}%` }}
            />
          </div>
          <p className="mt-2 truncate text-xs text-slate-500">
            <span className="font-semibold text-slate-700">
              Item {activeIndex + 1} of {items.length}
            </span>
            {currentItem && (
              <>
                {" · "}
                {currentItem.step.dimension.name}
                {" / "}
                {currentItem.step.module.name}
                {" / "}
                {currentItem.step.practice.name}
              </>
            )}
          </p>
        </div>
      </div>

      <div
        className="mt-4 p-2 flex gap-1.5 overflow-x-auto pb-1"
        aria-label="Reviewed item map"
      >
        {items.map((item, index) => {
          const updated = isReviewedItemUpdated(
            item.evaluation,
            respondentUpdatedResponseKeys
          );
          const adjusted = item.evaluation.validationStatus === "ADJUSTED";
          const statusLabel = adjusted
            ? "adjusted by evaluator"
            : updated
              ? "updated"
              : "needs changes";

          return (
            <button
              key={item.fieldName}
              type="button"
              onClick={() => onItemSelect(item.fieldName, index)}
              aria-label={`Go to item ${index + 1}, ${statusLabel}`}
              aria-current={index === activeIndex ? "step" : undefined}
              title={`Item ${index + 1}: ${statusLabel}`}
              className={cn(
                "flex h-7 min-w-7 shrink-0 items-center justify-center rounded-md border px-1.5 text-[11px] font-bold tabular-nums transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2",
                adjusted
                  ? "border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100"
                  : updated
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    : "border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100",
                index === activeIndex &&
                  "ring-2 ring-indigo-500 ring-offset-2"
              )}
            >
              {adjusted ? (
                <PencilLine className="h-3 w-3" aria-hidden="true" />
              ) : (
                index + 1
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-medium text-slate-500">
        {outstandingCount > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-orange-500" />
            Needs update
          </span>
        )}
        {completedFlaggedCount > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Updated
          </span>
        )}
        {items.some(
          ({ evaluation }) => evaluation.validationStatus === "ADJUSTED"
        ) && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-cyan-500" />
            Adjusted by evaluator
          </span>
        )}
        <span className="ml-auto hidden text-slate-400 sm:inline">
          Select an item to jump to it
        </span>
      </div>
    </section>
  );
}
