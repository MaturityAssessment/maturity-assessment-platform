"use client";

import { Check, ChevronDown, Flag, Layers3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAssessmentPracticeRailState } from "./assessmentFlowUtils";

export type AssessmentNavigationPractice = {
  key: string;
  name: string;
  description?: string;
  order: number;
  answeredCount: number;
  totalEnabledQuestions: number;
  isRequiredComplete: boolean;
  isFullyAnswered: boolean;
  outstandingFlaggedCount: number;
};

export type AssessmentNavigationModule = {
  key: string;
  name: string;
  number: number;
  answeredCount: number;
  totalQuestions: number;
  completedPracticeCount: number;
  totalPractices: number;
  isRequiredComplete: boolean;
  isFullyAnswered: boolean;
  outstandingFlaggedCount: number;
  practices: AssessmentNavigationPractice[];
};

interface AssessmentNavigationMenuProps {
  dimensionName: string;
  modules: AssessmentNavigationModule[];
  activeModuleKey: string;
  activePracticeKey: string | null;
  onModuleSelect: (moduleKey: string) => void;
  onPracticeSelect: (practiceKey: string) => void;
}

export default function AssessmentNavigationMenu({
  dimensionName,
  modules,
  activeModuleKey,
  activePracticeKey,
  onModuleSelect,
  onPracticeSelect,
}: AssessmentNavigationMenuProps) {
  const activeModule =
    modules.find((module) => module.key === activeModuleKey) ?? null;

  if (modules.length === 0) {
    return (
      <p
        data-help-tour="assessment-navigation"
        className="text-sm text-slate-500"
      >
        No modules available in this dimension.
      </p>
    );
  }

  return (
    <nav
      data-help-tour="assessment-navigation"
      className="min-w-0 lg:flex lg:h-full lg:flex-col"
      aria-label={`${dimensionName} module and practice progress`}
    >
      <div className="lg:hidden">
        <p className="mb-2 truncate px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
          {dimensionName}
        </p>
        <ol className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-200">
          {modules.map((module) => (
            <li key={module.key} className="shrink-0">
              <ModuleButton
                module={module}
                active={module.key === activeModuleKey}
                compact
                onSelect={onModuleSelect}
              />
            </li>
          ))}
        </ol>

        {activeModule && activeModule.practices.length > 0 && (
          <PracticeList
            practices={activeModule.practices}
            activePracticeKey={activePracticeKey}
            horizontal
            onPracticeSelect={onPracticeSelect}
          />
        )}
      </div>

      <div className="hidden min-h-0 lg:flex lg:flex-1 lg:flex-col">
        <div className="mb-3 border-b border-slate-200 px-1 pb-3">
          <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            <Layers3 className="h-3.5 w-3.5" aria-hidden="true" />
            Dimension
          </span>
          <p className="mt-1.5 line-clamp-2 text-sm font-semibold leading-5 text-slate-800">
            {dimensionName}
          </p>
        </div>

        <ol className="min-h-0 space-y-1 overflow-y-auto pb-4 pr-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-200">
          {modules.map((module) => {
            const active = module.key === activeModuleKey;

            return (
              <li key={module.key}>
                <ModuleButton
                  module={module}
                  active={active}
                  onSelect={onModuleSelect}
                />

                {active && (
                  <div className="ml-[18px] border-l border-indigo-200 pb-2 pl-3 pt-1">
                    {module.practices.length > 0 ? (
                      <PracticeList
                        practices={module.practices}
                        activePracticeKey={activePracticeKey}
                        onPracticeSelect={onPracticeSelect}
                      />
                    ) : (
                      <p className="px-2 py-2 text-xs leading-5 text-slate-400">
                        No practices in this module
                      </p>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}

function ModuleButton({
  module,
  active,
  compact = false,
  onSelect,
}: {
  module: AssessmentNavigationModule;
  active: boolean;
  compact?: boolean;
  onSelect: (moduleKey: string) => void;
}) {
  const supportingLabel =
    module.totalPractices === 0
      ? "No practices"
      : module.outstandingFlaggedCount > 0
        ? `${module.outstandingFlaggedCount} change${
            module.outstandingFlaggedCount === 1 ? "" : "s"
          } left`
      : module.isFullyAnswered
        ? "All questions answered"
        : module.isRequiredComplete
          ? "Required items complete"
          : `${module.completedPracticeCount}/${module.totalPractices} practices`;

  return (
    <button
      type="button"
      onClick={() => onSelect(module.key)}
      aria-expanded={active}
      aria-label={`Module ${module.number}, ${module.name}, ${supportingLabel}`}
      className={cn(
        "group flex min-w-0 items-center text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400",
        compact
          ? "min-w-[10rem] gap-2.5 rounded-xl border px-3 py-2"
          : "w-full gap-3 rounded-xl px-2.5 py-2.5",
        active
          ? "border-indigo-200 bg-indigo-50 text-indigo-900 shadow-sm"
          : compact
            ? "border-slate-200 bg-white text-slate-700"
            : "text-slate-600 hover:bg-white hover:text-slate-900"
      )}
    >
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-xs font-bold tabular-nums transition",
          active
            ? "border-indigo-200 bg-white text-indigo-700"
            : module.outstandingFlaggedCount > 0
              ? "border-orange-200 bg-orange-50 text-orange-700"
            : module.isRequiredComplete
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-slate-200 bg-white text-slate-500 group-hover:border-indigo-200 group-hover:text-indigo-600"
        )}
        aria-hidden="true"
      >
        {module.outstandingFlaggedCount > 0 ? (
          <Flag className="h-4 w-4 text-orange-600" />
        ) : module.isRequiredComplete ? (
          <Check className="h-4 w-4 stroke-[2.5]" />
        ) : (
          String(module.number).padStart(2, "0")
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block truncate text-sm leading-5",
            active ? "font-bold" : "font-semibold"
          )}
        >
          {module.name}
        </span>
        <span
          className={cn(
            "block truncate text-[11px] leading-4",
            active
              ? "font-medium text-indigo-600"
              : module.isRequiredComplete
                ? "text-emerald-600"
                : module.outstandingFlaggedCount > 0
                  ? "font-semibold text-orange-700"
                : "text-slate-400"
          )}
        >
          {supportingLabel}
        </span>
      </span>

      {!compact && (
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-slate-400 transition-transform",
            active && "rotate-180 text-indigo-500"
          )}
          aria-hidden="true"
        />
      )}
    </button>
  );
}

function PracticeList({
  practices,
  activePracticeKey,
  horizontal = false,
  onPracticeSelect,
}: {
  practices: AssessmentNavigationPractice[];
  activePracticeKey: string | null;
  horizontal?: boolean;
  onPracticeSelect: (practiceKey: string) => void;
}) {
  const activeIndex = practices.findIndex(
    (practice) => practice.key === activePracticeKey
  );

  return (
    <ol
      className={cn(
        horizontal
          ? "-mx-1 flex min-w-0 items-start overflow-x-auto px-1 pb-2 pt-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-200"
          : "space-y-0.5"
      )}
    >
      {practices.map((practice, index) => {
        const state = getAssessmentPracticeRailState(
          index,
          activeIndex,
          practice.isRequiredComplete
        );
        const active = state === "current";
        const complete = state === "completed";
        const behindIncomplete = state === "behind-incomplete";
        const progressLabel = `${practice.answeredCount}/${practice.totalEnabledQuestions} answered`;
        const supportingLabel =
          practice.outstandingFlaggedCount > 0
            ? `${practice.outstandingFlaggedCount} change${
                practice.outstandingFlaggedCount === 1 ? "" : "s"
              } left`
            : active
          ? `Current · ${progressLabel}`
          : complete
            ? practice.isFullyAnswered
              ? "All questions answered"
              : "Required complete"
            : behindIncomplete
              ? `Incomplete · ${progressLabel}`
              : progressLabel;

        return (
          <li
            key={practice.key}
            className={cn(
              horizontal
                ? "relative flex min-w-[7rem] flex-1 justify-center"
                : "min-w-0"
            )}
          >
            {horizontal && index < practices.length - 1 && (
              <span
                className={cn(
                  "pointer-events-none absolute left-1/2 right-[-50%] top-[19px] h-px",
                  activeIndex >= 0 && index < activeIndex
                    ? "bg-indigo-400"
                    : "bg-slate-300"
                )}
                aria-hidden="true"
              />
            )}

            <button
              type="button"
              onClick={() => onPracticeSelect(practice.key)}
              aria-current={active ? "step" : undefined}
              aria-label={`${practice.name}, ${supportingLabel}`}
              className={cn(
                "group relative z-10 flex min-w-0 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400",
                horizontal
                  ? "w-full flex-col items-center gap-1.5 rounded-xl px-1 py-2 text-center"
                  : "w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left",
                active && "bg-white shadow-sm ring-1 ring-inset ring-indigo-200"
              )}
            >
              <span
                className={cn(
                  "relative flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 bg-gray-50 transition",
                  active &&
                    "border-indigo-600 bg-indigo-600 shadow-sm ring-4 ring-indigo-100",
                  complete && "border-indigo-600 bg-indigo-600",
                  behindIncomplete && "border-amber-500 bg-amber-50",
                  practice.outstandingFlaggedCount > 0 &&
                    "border-orange-500 bg-orange-50",
                  state === "following" && "border-slate-300"
                )}
                aria-hidden="true"
              >
                {practice.outstandingFlaggedCount > 0 ? (
                  <Flag className="h-3 w-3 text-orange-600" />
                ) : practice.isRequiredComplete ? (
                  <Check className="h-3 w-3 stroke-[3] text-white" />
                ) : (
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      active && "bg-white",
                      behindIncomplete && "bg-amber-500",
                      state === "following" && "bg-slate-300"
                    )}
                  />
                )}
              </span>

              <span className="min-w-0">
                <span
                  className={cn(
                    "block truncate font-medium leading-4 transition",
                    horizontal ? "max-w-[6.5rem] text-[11px]" : "text-xs",
                    active && "font-bold text-indigo-800",
                    complete && "font-semibold text-indigo-700",
                    behindIncomplete && "font-semibold text-slate-700",
                    state === "following" && "text-slate-500"
                  )}
                >
                  {practice.name}
                </span>
                <span
                  className={cn(
                    "mt-0.5 block truncate text-[10px] leading-3",
                    active && "font-semibold text-indigo-600",
                    complete && "text-indigo-500",
                    behindIncomplete && "font-medium text-amber-700",
                    practice.outstandingFlaggedCount > 0 &&
                      "font-semibold text-orange-700",
                    state === "following" && "text-slate-400"
                  )}
                >
                  {supportingLabel}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
