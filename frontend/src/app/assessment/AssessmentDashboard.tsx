"use client";

import { useMemo } from "react";
import Image from "next/image";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  ClipboardList,
  FileClock,
  Flag,
  Grid2X2,
  HelpCircle,
  LayoutDashboard,
  ListChecks,
  LockKeyhole,
  MessageSquareWarning,
  MessagesSquare,
  PencilLine,
  Radar,
  RefreshCcw,
  Search,
  ShieldCheck,
  Siren,
} from "lucide-react";
import type {
  AssessmentData,
  AssessmentEvidenceInputItem,
  AssessmentResponse,
  MaturityModel,
} from "@/api/types";
import TourInvitation from "@/components/guided-tour/TourInvitation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import logoIcon from "../../../images/map-logo-icon.png";
import type { AssessmentPracticeStep } from "./AssessmentStep";
import type { AssessmentEvidenceByField } from "./assessmentEvidence";
import {
  buildAssessmentDashboardSummary,
  formatAssessmentTitle,
  getAssessmentJourneyStage,
} from "./assessmentDashboard";
import type { AssessmentDimensionSummary } from "./assessmentDashboard";
import AssessmentSaveIndicator from "./AssessmentSaveIndicator";
import type { AssessmentSaveStatus } from "./assessmentAutosave";
import type { AssessmentTourInvitationContent } from "./assessmentTour";
import AssessmentFeedbackReviewTab from "./AssessmentFeedbackReviewTab";
import AssessmentResultsTab from "./AssessmentResultsTab";

export type AssessmentDashboardTab =
  | "overview"
  | "review"
  | "results"
  | "discussion"
  | "logs";

type AssessmentDashboardProps = {
  model: MaturityModel;
  practiceSteps: AssessmentPracticeStep[];
  formData: AssessmentData;
  evidenceFiles: AssessmentEvidenceByField;
  activeTab: AssessmentDashboardTab;
  isLeaving: boolean;
  isPreparingReview: boolean;
  canReview: boolean;
  error: string | null;
  saveStatus: AssessmentSaveStatus;
  saveError: string | null;
  changesRequested: boolean;
  completed: boolean;
  assessment: AssessmentResponse;
  evaluatorInsight?: string | null;
  questionEvaluations?: AssessmentResponse["questionEvaluations"];
  respondentUpdatedResponseKeys: ReadonlySet<string>;
  tourInvitation: AssessmentTourInvitationContent | null;
  onStartTour: () => void;
  onDismissTourInvitation: () => void;
  onTabChange: (tab: AssessmentDashboardTab) => void;
  onDimensionSelect: (dimension: AssessmentDimensionSummary) => void;
  onLeave: () => void;
  showLeaveAction?: boolean;
  onReview: () => void;
  onRetrySave: () => void;
  onInputChange: (field: string, value: string | number) => void;
  onClearAnswer: (field: string) => void;
  onEvidenceItemsChange: (
    field: string,
    items: AssessmentEvidenceInputItem[]
  ) => void;
};

const dimensionIcons = [
  ShieldCheck,
  Search,
  LockKeyhole,
  Radar,
  Siren,
  RefreshCcw,
];

export default function AssessmentDashboard({
  model,
  practiceSteps,
  formData,
  evidenceFiles,
  activeTab,
  isLeaving,
  isPreparingReview,
  canReview,
  error,
  saveStatus,
  saveError,
  changesRequested,
  completed,
  assessment,
  evaluatorInsight,
  questionEvaluations,
  respondentUpdatedResponseKeys,
  tourInvitation,
  onStartTour,
  onDismissTourInvitation,
  onTabChange,
  onDimensionSelect,
  onLeave,
  showLeaveAction = true,
  onReview,
  onRetrySave,
  onInputChange,
  onClearAnswer,
  onEvidenceItemsChange,
}: AssessmentDashboardProps) {
  const summary = useMemo(
    () =>
      buildAssessmentDashboardSummary(
        model,
        practiceSteps,
        formData,
        evidenceFiles,
        questionEvaluations,
        respondentUpdatedResponseKeys
      ),
    [
      evidenceFiles,
      formData,
      model,
      practiceSteps,
      questionEvaluations,
      respondentUpdatedResponseKeys,
    ]
  );
  const feedbackItemCount = summary.flaggedCount + summary.adjustedCount;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-4 pt-5 sm:px-6 lg:px-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <Image
                src={logoIcon}
                alt="Maturity Assessment Platform"
                className="h-10 w-10 shrink-0 object-contain"
                priority
              />
              <div className="min-w-0">
                <p className="truncate text-lg font-bold tracking-tight text-slate-950 sm:text-xl">
                  {formatAssessmentTitle(model.name)}
                </p>
                {model.domain?.name && (
                  <p className="mt-0.5 text-xs font-medium text-slate-500">
                    {model.domain.name}
                  </p>
                )}
              </div>
            </div>

            <div
              data-help-tour={
                showLeaveAction ? undefined : "assessment-dashboard-leave"
              }
              className="flex flex-wrap items-center gap-2 sm:justify-end"
            >
              {completed ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                  <BadgeCheck className="h-4 w-4" aria-hidden="true" />
                  Evaluation complete
                </span>
              ) : (
                <div data-help-tour="assessment-dashboard-autosave">
                  <AssessmentSaveIndicator
                    status={saveStatus}
                    error={saveError}
                    onRetry={onRetrySave}
                  />
                </div>
              )}
              <Button
                type="button"
                variant="ghost"
                onClick={onStartTour}
                title="Show assessment dashboard tour"
                aria-label="Show assessment dashboard tour"
                className="text-slate-600"
              >
                <CircleHelp className="h-4 w-4" aria-hidden="true" />
                Guide me
              </Button>
              {showLeaveAction && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onLeave}
                  disabled={isLeaving}
                  data-help-tour="assessment-dashboard-leave"
                  className="border-slate-200 bg-white text-slate-700"
                >
                  {completed || changesRequested
                    ? "Back to assessments"
                    : isLeaving
                      ? "Saving..."
                      : "Continue Later"}
                </Button>
              )}
            </div>
          </div>

          <nav
            className="flex gap-7 overflow-x-auto"
            aria-label="Assessment dashboard"
            role="tablist"
          >
            <DashboardTab
              label="Overview"
              tab="overview"
              activeTab={activeTab}
              onSelect={onTabChange}
            />
            {!completed && feedbackItemCount > 0 && (
              <DashboardTab
                label="Review"
                tab="review"
                count={feedbackItemCount}
                activeTab={activeTab}
                onSelect={onTabChange}
              />
            )}
            {completed && (
              <DashboardTab
                label="Results"
                tab="results"
                activeTab={activeTab}
                onSelect={onTabChange}
              />
            )}
            <DashboardTab
              label="Discussion"
              tab="discussion"
              activeTab={activeTab}
              onSelect={onTabChange}
            />
            <DashboardTab
              label="Logs"
              tab="logs"
              activeTab={activeTab}
              onSelect={onTabChange}
            />
          </nav>
        </div>
      </header>

      {tourInvitation && (
        <div className="mx-auto w-full max-w-[1440px] px-4 pt-5 sm:px-6 lg:px-10">
          <TourInvitation
            title={tourInvitation.title}
            description={tourInvitation.description}
            onAccept={onStartTour}
            onDismiss={onDismissTourInvitation}
          />
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mx-auto w-full max-w-[1440px] px-4 pt-5 sm:px-6 lg:px-10"
        >
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </p>
        </div>
      )}

      {activeTab === "overview" ? (
        <OverviewTab
          summary={summary}
          changesRequested={changesRequested}
          completed={completed}
          evaluatorInsight={evaluatorInsight}
          canReview={canReview}
          isPreparingReview={isPreparingReview}
          onDimensionSelect={onDimensionSelect}
          onReview={onReview}
        />
      ) : activeTab === "review" ? (
        feedbackItemCount > 0 ? (
          <AssessmentFeedbackReviewTab
            modelMaxLevel={Math.max(2, model.levels?.length || 5)}
            practiceSteps={practiceSteps}
            formData={formData}
            evidenceFiles={evidenceFiles}
            questionEvaluations={questionEvaluations}
            respondentUpdatedResponseKeys={respondentUpdatedResponseKeys}
            onInputChange={onInputChange}
            onClearAnswer={onClearAnswer}
            onEvidenceItemsChange={onEvidenceItemsChange}
          />
        ) : null
      ) : activeTab === "results" ? (
        completed ? (
          <AssessmentResultsTab
            assessment={assessment}
            model={model}
            practiceSteps={practiceSteps}
          />
        ) : null
      ) : (
        <PlaceholderTab tab={activeTab} />
      )}
    </div>
  );
}

function DashboardTab({
  label,
  count,
  tab,
  activeTab,
  onSelect,
}: {
  label: string;
  count?: number;
  tab: AssessmentDashboardTab;
  activeTab: AssessmentDashboardTab;
  onSelect: (tab: AssessmentDashboardTab) => void;
}) {
  const isActive = activeTab === tab;

  return (
    <button
      type="button"
      role="tab"
      id={`assessment-tab-${tab}`}
      aria-controls={`assessment-panel-${tab}`}
      aria-selected={isActive}
      onClick={() => onSelect(tab)}
      className={cn(
        "relative shrink-0 rounded-t-md px-1.5 pb-3 pt-1 text-sm font-semibold transition focus:outline-none focus-visible:bg-indigo-50 focus-visible:text-indigo-700 focus-visible:outline-none",
        isActive
          ? "text-indigo-700 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-indigo-600"
          : "text-slate-500 hover:text-slate-800"
      )}
    >
      <span className="inline-flex items-center gap-1.5">
        {label}
        {count !== undefined && (
          <span
            className={cn(
              "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
              isActive
                ? "bg-indigo-100 text-indigo-700"
                : "bg-slate-100 text-slate-600"
            )}
          >
            {count}
          </span>
        )}
      </span>
    </button>
  );
}

function OverviewTab({
  summary,
  changesRequested,
  completed,
  evaluatorInsight,
  canReview,
  isPreparingReview,
  onDimensionSelect,
  onReview,
}: {
  summary: ReturnType<typeof buildAssessmentDashboardSummary>;
  changesRequested: boolean;
  completed: boolean;
  evaluatorInsight?: string | null;
  canReview: boolean;
  isPreparingReview: boolean;
  onDimensionSelect: (dimension: AssessmentDimensionSummary) => void;
  onReview: () => void;
}) {
  return (
    <main
      id="assessment-panel-overview"
      role="tabpanel"
      aria-labelledby="assessment-tab-overview"
      className={cn(
        "mx-auto w-full max-w-[1440px] px-4 pt-7 sm:px-6 lg:px-10 lg:pt-9",
        changesRequested || completed ? "pb-12" : "pb-40 lg:pb-40"
      )}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section
          data-help-tour="assessment-dashboard-dimensions"
          aria-labelledby="assessment-dimensions-title"
        >
          <div className="mb-4">
            <h1
              id="assessment-dimensions-title"
              className="text-xl font-bold tracking-tight text-slate-950"
            >
              Assessment dimensions
            </h1>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {changesRequested
                ? "Use this overview to see where the evaluator requested updates."
                : completed
                  ? "Review the completed assessment structure or open Results for the final evaluation."
                : "Work through the assessment one dimension at a time. Choose where you want to continue."}
            </p>
          </div>

          {summary.dimensions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
              <ClipboardList className="mx-auto h-7 w-7 text-slate-400" />
              <h2 className="mt-3 font-semibold text-slate-900">
                No dimensions available
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                This maturity model does not contain assessment dimensions yet.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {summary.dimensions.map((dimension, index) => {
                const Icon = dimensionIcons[index % dimensionIcons.length];
                const canOpen = dimension.practiceCount > 0 && !completed;
                return (
                  <div
                    key={dimension.key}
                    className={cn(
                      "grid overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm sm:grid-cols-[minmax(0,1fr)_auto]",
                      canOpen &&
                        "group transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onDimensionSelect(dimension)}
                      disabled={!canOpen}
                      aria-label={`Open ${dimension.dimension.name} dimension`}
                      className="grid min-w-0 gap-4 px-4 py-4 text-left focus:outline-none disabled:cursor-default sm:grid-cols-[auto_minmax(0,1fr)_140px] sm:items-center sm:px-5"
                    >
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 transition group-hover:bg-indigo-100">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>

                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-slate-950">
                            {dimension.dimension.name}
                          </span>
                          {!changesRequested && (
                            <DimensionStatus status={dimension.status} />
                          )}
                          {changesRequested &&
                            dimension.outstandingFlaggedCount > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-700">
                                <Flag
                                  className="h-3 w-3"
                                  aria-hidden="true"
                                />
                                {dimension.outstandingFlaggedCount} need
                                {dimension.outstandingFlaggedCount === 1
                                  ? "s"
                                  : ""}{" "}
                                changes
                              </span>
                            )}
                          {changesRequested &&
                            dimension.flaggedCount > 0 &&
                            dimension.outstandingFlaggedCount === 0 && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                                <Check
                                  className="h-3 w-3"
                                  aria-hidden="true"
                                />
                                Updates complete
                              </span>
                            )}
                          {changesRequested &&
                            dimension.adjustedCount > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-cyan-50 px-2 py-0.5 text-[11px] font-semibold text-cyan-700">
                                <PencilLine
                                  className="h-3 w-3"
                                  aria-hidden="true"
                                />
                                {dimension.adjustedCount} adjusted
                              </span>
                            )}
                          {dimension.optionalUnansweredCount > 0 && (
                            <span className="text-[11px] font-medium text-slate-400">
                              · {dimension.optionalUnansweredCount} optional{" "}
                              unanswered
                            </span>
                          )}
                        </span>
                        <span className="mt-1 block line-clamp-2 text-sm leading-5 text-slate-500">
                          {getDimensionDescription(dimension)}
                        </span>
                      </span>

                      <span className="text-sm sm:text-right">
                        <span className="block font-medium text-slate-700">
                          {dimension.practiceCount}{" "}
                          {dimension.practiceCount === 1
                            ? "Practice"
                            : "Practices"}
                        </span>
                        <span className="mt-1 block whitespace-nowrap text-xs text-slate-500">
                          <span className="font-semibold text-slate-700">
                            {dimension.answeredCount}/{dimension.totalCount}
                          </span>{" "}
                          answered
                        </span>
                      </span>
                    </button>

                    <div className="flex items-center px-4 pb-4 sm:py-4 sm:pl-0 sm:pr-5">
                      {dimension.requiredComplete && canOpen ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => onDimensionSelect(dimension)}
                          aria-label={`Review ${dimension.dimension.name}`}
                          className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800"
                        >
                          <ClipboardCheck
                            className="h-4 w-4"
                            aria-hidden="true"
                          />
                          Review
                        </Button>
                      ) : canOpen ? (
                        <ChevronRight
                          className="hidden h-5 w-5 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-indigo-600 sm:block"
                          aria-hidden="true"
                        />
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <aside
          data-help-tour="assessment-dashboard-progress"
          className="space-y-4 lg:sticky lg:top-6 lg:self-start"
        >
          <ProgressCard
            summary={summary}
            changesRequested={changesRequested}
            evaluatorInsight={evaluatorInsight}
          />
          {canReview && !completed && (
            <ReviewReadyCard
              isPreparingReview={isPreparingReview}
              changesRequested={changesRequested}
              onReview={onReview}
            />
          )}
        </aside>
      </div>

      {!changesRequested && !completed && (
        <AssessmentJourney
          summary={summary}
          canReview={canReview}
          isPreparingReview={isPreparingReview}
          onReview={onReview}
        />
      )}
    </main>
  );
}

function AssessmentJourney({
  summary,
  canReview,
  isPreparingReview,
  onReview,
}: {
  summary: ReturnType<typeof buildAssessmentDashboardSummary>;
  canReview: boolean;
  isPreparingReview: boolean;
  onReview: () => void;
}) {
  const currentStage = getAssessmentJourneyStage(summary, canReview);
  const currentIndex = {
    overview: 1,
    questions: 2,
    review: 3,
  }[currentStage];
  const steps = [
    {
      key: "domain",
      label: "Choose domain",
      detail: "Domain selected",
      icon: Grid2X2,
    },
    {
      key: "overview",
      label: "Overview",
      detail: "Review dimensions",
      icon: LayoutDashboard,
    },
    {
      key: "questions",
      label: "Answer questions",
      detail: "Complete each dimension",
      icon: ListChecks,
    },
    {
      key: "review",
      label: "Review",
      detail: canReview ? "Ready to review" : "Complete required items",
      icon: ClipboardCheck,
    },
    {
      key: "submit",
      label: "Submit",
      detail: "Submit from review",
      icon: Flag,
    },
  ] as const;

  return (
    <section
      data-help-tour="assessment-dashboard-journey"
      aria-labelledby="assessment-journey-title"
      className="fixed inset-x-4 bottom-8 z-30 mx-auto max-w-[1320px] sm:inset-x-8 lg:inset-x-12"
    >
      <h2
        id="assessment-journey-title"
        className="px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400"
      >
        Assessment journey
      </h2>
      <div className="mt-4 overflow-x-auto pb-1">
        <ol className="flex min-w-[920px] items-center">
          {steps.map((step, index) => {
            const status =
              index < currentIndex
                ? "completed"
                : index === currentIndex
                  ? "current"
                  : "upcoming";
            const isReviewAction = step.key === "review" && canReview;

            return (
              <li
                key={step.key}
                className="flex min-w-0 flex-1 items-center"
              >
                <JourneyStep
                  index={index}
                  label={step.label}
                  detail={
                    step.key === "review" && isPreparingReview
                      ? "Saving progress..."
                      : step.detail
                  }
                  Icon={step.icon}
                  status={status}
                  isAction={isReviewAction}
                  disabled={isPreparingReview}
                  onClick={isReviewAction ? onReview : undefined}
                />
                {index < steps.length - 1 && (
                  <ArrowRight
                    className="mx-4 h-4 w-4 shrink-0 text-slate-300"
                    aria-hidden="true"
                  />
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

function JourneyStep({
  index,
  label,
  detail,
  Icon,
  status,
  isAction,
  disabled,
  onClick,
}: {
  index: number;
  label: string;
  detail: string;
  Icon: typeof Grid2X2;
  status: "completed" | "current" | "upcoming";
  isAction: boolean;
  disabled: boolean;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span
        className={cn(
          "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition",
          status === "completed" &&
            "border-emerald-200 bg-emerald-50 text-emerald-700",
          status === "current" &&
            "border-indigo-200 bg-indigo-50 text-indigo-700",
          status === "upcoming" &&
            "border-slate-300 text-slate-400"
        )}
      >
        {status === "completed" ? (
          <Check className="h-5 w-5" aria-hidden="true" />
        ) : (
          <Icon className="h-5 w-5" aria-hidden="true" />
        )}
      </span>
      <span className="min-w-0 text-left">
        <span
          className={cn(
            "block text-sm font-semibold",
            status === "current" && "text-indigo-900",
            status === "completed" && "text-slate-800",
            status === "upcoming" && "text-slate-500"
          )}
        >
          {index + 1}. {label}
        </span>
        <span className="mt-1 block whitespace-nowrap text-xs text-slate-400">
          {detail}
        </span>
      </span>
    </>
  );

  if (isAction) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-current={status === "current" ? "step" : undefined}
        className="flex min-w-0 items-center gap-3 rounded-md px-1 py-1 transition hover:text-indigo-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 disabled:cursor-wait disabled:opacity-60"
      >
        {content}
      </button>
    );
  }

  return (
    <div
      aria-current={status === "current" ? "step" : undefined}
      className="flex min-w-0 items-center gap-3 px-1 py-1"
    >
      {content}
    </div>
  );
}

function DimensionStatus({
  status,
}: {
  status: AssessmentDimensionSummary["status"];
}) {
  const styles = {
    "not-started": "bg-slate-100 text-slate-600",
    "in-progress": "bg-blue-50 text-blue-700",
    completed: "bg-emerald-50 text-emerald-700",
  };
  const labels = {
    "not-started": "Not started",
    "in-progress": "In progress",
    completed: "Completed",
  };

  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-semibold",
        styles[status]
      )}
    >
      {labels[status]}
    </span>
  );
}

function ProgressCard({
  summary,
  changesRequested,
  evaluatorInsight,
}: {
  summary: ReturnType<typeof buildAssessmentDashboardSummary>;
  changesRequested: boolean;
  evaluatorInsight?: string | null;
}) {
  const regularAnsweredCount = changesRequested
    ? Math.max(
        0,
        summary.answeredCount - summary.adjustedCount - summary.flaggedCount
      )
    : summary.answeredCount;

  return (
    <section
      className={cn(
        "rounded-lg border bg-white/80 p-4",
        changesRequested ? "border-orange-200" : "border-slate-200"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900">
          Overall progress
        </h2>
        {changesRequested && (
          <span
            className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-orange-50 text-orange-700"
            title="Evaluator feedback received"
          >
            <MessageSquareWarning className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Evaluator feedback received</span>
          </span>
        )}
      </div>
      <ProgressRing
        summary={summary}
        showFeedbackSegments={changesRequested}
      />

      <dl className="mt-3 space-y-2">
        <ProgressLegendRow
          color="bg-indigo-500"
          label="Answered"
          value={regularAnsweredCount}
        />
        {changesRequested && (
          <>
            <ProgressLegendRow
              color="bg-cyan-600"
              label="Adjusted"
              value={summary.adjustedCount}
            />
            <ProgressLegendRow
              color="bg-orange-500"
              label="Changes left"
              value={summary.outstandingFlaggedCount}
            />
          </>
        )}
        <ProgressLegendRow
          color="bg-slate-300"
          label="Unanswered"
          value={summary.unansweredCount}
        />
      </dl>

      {changesRequested && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <p className="flex items-center gap-2 text-xs font-semibold text-slate-800">
            <MessageSquareWarning
              className="h-4 w-4 text-orange-700"
              aria-hidden="true"
            />
            Evaluator feedback received
          </p>

          <dl className="mt-3 space-y-3">
            <FeedbackLegendRow
              color="bg-orange-500"
              label="Changes left"
              value={summary.outstandingFlaggedCount}
              description={
                summary.outstandingFlaggedCount === 0
                  ? "All flagged items have been updated."
                  : "Revise these items using the evaluator’s feedback."
              }
            />
            <FeedbackLegendRow
              color="bg-cyan-600"
              label="Adjusted"
              value={summary.adjustedCount}
              description="Updated by the evaluator and shown for context."
            />
          </dl>

          {evaluatorInsight?.trim() && (
            <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Evaluator&apos;s note
              </p>
              <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-600">
                {evaluatorInsight}
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function FeedbackLegendRow({
  color,
  label,
  value,
  description,
}: {
  color: string;
  label: string;
  value: number;
  description: string;
}) {
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-x-2">
      <span
        className={cn("mt-1 h-2.5 w-2.5 rounded-full", color)}
        aria-hidden="true"
      />
      <dt className="text-xs font-medium text-slate-700">{label}</dt>
      <dd className="text-xs font-bold tabular-nums text-slate-900">
        {value}
      </dd>
      <dd className="col-start-2 col-end-4 mt-0.5 text-[11px] leading-4 text-slate-400">
        {description}
      </dd>
    </div>
  );
}

function ReviewReadyCard({
  isPreparingReview,
  changesRequested,
  onReview,
}: {
  isPreparingReview: boolean;
  changesRequested: boolean;
  onReview: () => void;
}) {
  return (
    <section
      aria-labelledby="assessment-ready-to-review-title"
      className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-4 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <Check className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-600">
            Next step
          </p>
          <h2
            id="assessment-ready-to-review-title"
            className="mt-1 text-base font-bold text-slate-950"
          >
            {changesRequested ? "Updates ready to review" : "Ready to review"}
          </h2>
        </div>
      </div>

      <p
        id="assessment-ready-to-review-description"
        className="mt-3 text-sm leading-6 text-slate-600"
      >
        {changesRequested
          ? "Every flagged item has been updated. Review the changes before sending the assessment back for evaluation."
          : "All required items across every dimension are complete. Review your answers and evidence before submitting for evaluation."}
      </p>

      <Button
        type="button"
        onClick={onReview}
        disabled={isPreparingReview}
        aria-describedby="assessment-ready-to-review-description"
        className="mt-4 w-full bg-indigo-600 text-white hover:bg-indigo-700"
      >
        {isPreparingReview ? (
          <RefreshCcw className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
        )}
        <span aria-live="polite">
          {isPreparingReview
            ? "Preparing review..."
            : changesRequested
              ? "Review updates"
              : "Review assessment"}
        </span>
      </Button>
    </section>
  );
}

function ProgressRing({
  summary,
  showFeedbackSegments,
}: {
  summary: ReturnType<typeof buildAssessmentDashboardSummary>;
  showFeedbackSegments: boolean;
}) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const regularAnsweredCount = showFeedbackSegments
    ? Math.max(
        0,
        summary.answeredCount - summary.adjustedCount - summary.flaggedCount
      )
    : summary.answeredCount;
  const regularAnsweredLength =
    summary.totalCount === 0
      ? 0
      : (regularAnsweredCount / summary.totalCount) * circumference;
  const adjustedLength =
    summary.totalCount === 0
      ? 0
      : (summary.adjustedCount / summary.totalCount) * circumference;
  const flaggedLength =
    summary.totalCount === 0
      ? 0
      : (summary.flaggedCount / summary.totalCount) * circumference;
  const coloredLength =
    regularAnsweredLength + adjustedLength + flaggedLength;
  const getArcEndPoint = (length: number) => {
    const angle = (length / circumference) * 2 * Math.PI;
    return {
      x: 64 + radius * Math.cos(angle),
      y: 64 + radius * Math.sin(angle),
    };
  };
  const regularAnsweredEnd = getArcEndPoint(regularAnsweredLength);
  const adjustedEnd = getArcEndPoint(
    regularAnsweredLength + adjustedLength
  );
  const flaggedEnd = getArcEndPoint(coloredLength);

  return (
    <div className="relative mx-auto mt-3 h-32 w-32">
      <svg
        viewBox="0 0 128 128"
        className="h-full w-full -rotate-90"
        aria-hidden="true"
      >
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="8"
        />
        {regularAnsweredLength > 0 && (
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke="#6366f1"
            strokeWidth="8"
            strokeLinecap={showFeedbackSegments ? "butt" : "round"}
            strokeDasharray={`${regularAnsweredLength} ${circumference - regularAnsweredLength}`}
          />
        )}
        {showFeedbackSegments && adjustedLength > 0 && (
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke="#0891b2"
            strokeWidth="8"
            strokeLinecap="butt"
            strokeDasharray={`${adjustedLength} ${circumference - adjustedLength}`}
            strokeDashoffset={-regularAnsweredLength}
          />
        )}
        {showFeedbackSegments && flaggedLength > 0 && (
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke="#f97316"
            strokeWidth="8"
            strokeLinecap="butt"
            strokeDasharray={`${flaggedLength} ${circumference - flaggedLength}`}
            strokeDashoffset={-(regularAnsweredLength + adjustedLength)}
          />
        )}
        {showFeedbackSegments && regularAnsweredLength > 0 && (
          <circle
            cx={regularAnsweredEnd.x}
            cy={regularAnsweredEnd.y}
            r="4"
            fill="#6366f1"
          />
        )}
        {showFeedbackSegments && adjustedLength > 0 && (
          <circle
            cx={adjustedEnd.x}
            cy={adjustedEnd.y}
            r="4"
            fill="#0891b2"
          />
        )}
        {showFeedbackSegments && flaggedLength > 0 && (
          <circle
            cx={flaggedEnd.x}
            cy={flaggedEnd.y}
            r="4"
            fill="#f97316"
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="text-2xl font-bold tracking-tight text-slate-950">
          {summary.progressPercentage}
          <span className="ml-0.5 text-base">%</span>
        </p>
        <p className="mt-0.5 text-[11px] font-medium leading-4 text-slate-500">
          {summary.answeredCount}/{summary.totalCount}
          <br />
          answered
        </p>
      </div>
    </div>
  );
}

function ProgressLegendRow({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-3 text-xs">
      <dt className="flex flex-1 items-center gap-2 text-slate-600">
        <span className={cn("h-2.5 w-2.5 rounded-full", color)} />
        {label}
      </dt>
      <dd className="font-semibold tabular-nums text-slate-900">{value}</dd>
    </div>
  );
}

function PlaceholderTab({
  tab,
}: {
  tab: Exclude<
    AssessmentDashboardTab,
    "overview" | "review" | "results"
  >;
}) {
  const isDiscussion = tab === "discussion";
  const Icon = isDiscussion ? MessagesSquare : FileClock;
  const title = isDiscussion ? "Discussion" : "Logs";
  const description = isDiscussion
    ? "A shared space for assessment notes and conversations will live here."
    : "Assessment activity and change history will appear here.";

  return (
    <main
      id={`assessment-panel-${tab}`}
      role="tabpanel"
      aria-labelledby={`assessment-tab-${tab}`}
      className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 lg:px-10"
    >
      <section className="flex min-h-[420px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 text-center">
        <div className="max-w-md">
          <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Icon className="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-xl font-bold text-slate-950">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
          <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
            Coming soon
          </span>
        </div>
      </section>
    </main>
  );
}

function getDimensionDescription(summary: AssessmentDimensionSummary) {
  const description = summary.dimension.description?.trim();
  if (description) return description;

  const moduleNames = summary.dimension.modules
    .map((module) => module.name.trim())
    .filter(Boolean);
  if (moduleNames.length > 0) return moduleNames.join(", ");

  return "Open this dimension to review its assessment practices.";
}
