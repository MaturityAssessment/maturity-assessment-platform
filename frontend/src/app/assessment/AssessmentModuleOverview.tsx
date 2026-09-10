"use client";

import {
  ArrowRight,
  Check,
  ChevronRight,
  CircleDot,
  ClipboardList,
  FileQuestion,
  Flag,
  Layers3,
} from "lucide-react";
import type { Dimension, Module } from "@/api/types";
import { cn } from "@/lib/utils";
import AssessmentNavigationMenu, {
  type AssessmentNavigationModule,
} from "./AssessmentNavigationMenu";

interface AssessmentModuleOverviewProps {
  modelName: string;
  dimension: Dimension;
  module: Module;
  moduleNumber: number;
  moduleCount: number;
  navigationModules: AssessmentNavigationModule[];
  activeModuleKey: string;
  onOverview: () => void;
  onModuleSelect: (moduleKey: string) => void;
  onPracticeSelect: (practiceKey: string) => void;
}

export default function AssessmentModuleOverview({
  modelName,
  dimension,
  module,
  moduleNumber,
  moduleCount,
  navigationModules,
  activeModuleKey,
  onOverview,
  onModuleSelect,
  onPracticeSelect,
}: AssessmentModuleOverviewProps) {
  const navigationModule = navigationModules.find(
    (item) => item.key === activeModuleKey
  );
  const practices = navigationModule?.practices ?? [];
  const firstIncomplete =
    practices.find((practice) => practice.outstandingFlaggedCount > 0) ??
    practices.find((practice) => !practice.isRequiredComplete) ??
    practices[0];
  const progressPercentage =
    navigationModule && navigationModule.totalQuestions > 0
      ? Math.round(
          (navigationModule.answeredCount /
            navigationModule.totalQuestions) *
            100
        )
      : 0;
  const hasProgress = (navigationModule?.answeredCount ?? 0) > 0;

  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-4 lg:grid-cols-[260px_minmax(0,1fr)] lg:grid-rows-1 lg:gap-8">
      <aside className="min-w-0 lg:min-h-0">
        <AssessmentNavigationMenu
          dimensionName={dimension.name}
          modules={navigationModules}
          activeModuleKey={activeModuleKey}
          activePracticeKey={null}
          onModuleSelect={onModuleSelect}
          onPracticeSelect={onPracticeSelect}
        />
      </aside>

      <main className="min-h-0 min-w-0 overflow-y-auto overscroll-y-contain px-1 pb-8 pt-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-300 hover:scrollbar-thumb-slate-400 sm:px-2 sm:pb-10 sm:pr-3">
        <div className="mx-auto w-full max-w-5xl">
          <nav
            data-help-tour="assessment-module-path"
            className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-slate-500"
            aria-label="Assessment location"
          >
            <button
              type="button"
              onClick={onOverview}
              className="rounded px-1 py-0.5 transition hover:bg-indigo-50 hover:text-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
            >
              {modelName}
            </button>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{dimension.name}</span>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="text-indigo-600">{module.name}</span>
          </nav>

          <section
            data-help-tour="assessment-module-overview"
            className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="relative overflow-hidden border-b border-slate-100 px-5 py-7 sm:px-8 sm:py-9">
              <div
                className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-indigo-50"
                aria-hidden="true"
              />
              <div
                className="pointer-events-none absolute right-12 top-8 h-24 w-24 rounded-full border border-indigo-100"
                aria-hidden="true"
              />

              <div className="relative max-w-3xl">
                <span className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                  <Layers3 className="h-3.5 w-3.5" aria-hidden="true" />
                  Module {String(moduleNumber).padStart(2, "0")} of{" "}
                  {String(moduleCount).padStart(2, "0")}
                </span>

                <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                  {module.name}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
                  {module.description?.trim() ||
                    `Explore the practices and questions included in the ${module.name} module.`}
                </p>
              </div>
            </div>

            <div className="grid divide-y divide-slate-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <ModuleStat
                icon={ClipboardList}
                value={navigationModule?.totalPractices ?? 0}
                label={
                  navigationModule?.totalPractices === 1
                    ? "Practice"
                    : "Practices"
                }
              />
              <ModuleStat
                icon={FileQuestion}
                value={navigationModule?.totalQuestions ?? 0}
                label={
                  navigationModule?.totalQuestions === 1
                    ? "Question"
                    : "Questions"
                }
              />
              <ModuleStat
                icon={Check}
                value={`${navigationModule?.completedPracticeCount ?? 0}/${
                  navigationModule?.totalPractices ?? 0
                }`}
                label="Practices complete"
              />
            </div>
          </section>

          <section
            className="mt-6"
            aria-labelledby="module-structure-heading"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Module structure
                </p>
                <h2
                  id="module-structure-heading"
                  className="mt-1 text-xl font-bold tracking-tight text-slate-950"
                >
                  What you’ll work through
                </h2>
              </div>

              {navigationModule && navigationModule.totalQuestions > 0 && (
                <div className="w-full max-w-xs">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-500">
                      Module progress
                    </span>
                    <span className="font-semibold tabular-nums text-slate-700">
                      {navigationModule.answeredCount}/
                      {navigationModule.totalQuestions} answered
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-indigo-600 transition-[width]"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {practices.length > 0 ? (
              <ol className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                {practices.map((practice, index) => (
                  <li
                    key={practice.key}
                    className="border-b border-slate-100 last:border-b-0"
                  >
                    <button
                      type="button"
                      onClick={() => onPracticeSelect(practice.key)}
                      className="group flex w-full min-w-0 items-center gap-4 px-4 py-4 text-left transition hover:bg-indigo-50/50 focus:outline-none focus-visible:bg-indigo-50 sm:px-5"
                    >
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-bold tabular-nums",
                          practice.isRequiredComplete
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-slate-50 text-slate-500"
                        )}
                        aria-hidden="true"
                      >
                        {practice.isRequiredComplete ? (
                          <Check className="h-4 w-4 stroke-[2.5]" />
                        ) : (
                          String(index + 1).padStart(2, "0")
                        )}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-slate-900 transition group-hover:text-indigo-800">
                          {practice.name}
                        </span>
                        {practice.description?.trim() && (
                          <span className="mt-0.5 block line-clamp-1 text-xs leading-5 text-slate-500">
                            {practice.description}
                          </span>
                        )}
                        <span
                          className={cn(
                            "block text-xs text-slate-400",
                            practice.description?.trim() ? "mt-1" : "mt-0.5"
                          )}
                        >
                          {practice.totalEnabledQuestions}{" "}
                          {practice.totalEnabledQuestions === 1
                            ? "question"
                            : "questions"}
                          {practice.answeredCount > 0 &&
                            ` · ${practice.answeredCount} answered`}
                        </span>
                      </span>

                      <PracticeStatus
                        requiredComplete={practice.isRequiredComplete}
                        answeredCount={practice.answeredCount}
                        outstandingFlaggedCount={
                          practice.outstandingFlaggedCount
                        }
                      />
                      <ChevronRight
                        className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-600"
                        aria-hidden="true"
                      />
                    </button>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
                <ClipboardList className="mx-auto h-6 w-6 text-slate-400" />
                <p className="mt-2 text-sm font-semibold text-slate-700">
                  No practices available
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  This module does not contain any practices yet.
                </p>
              </div>
            )}
          </section>

          {firstIncomplete && (
            <div className="flex justify-center pb-2 pt-8 sm:pt-10">
              <button
                type="button"
                onClick={() => onPracticeSelect(firstIncomplete.key)}
                className="group inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2"
              >
                {hasProgress ? "Continue module" : "Start module"}
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function ModuleStat({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof ClipboardList;
  value: number | string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-4 sm:px-6">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span>
        <span className="block text-lg font-bold leading-5 tabular-nums text-slate-900">
          {value}
        </span>
        <span className="mt-0.5 block text-xs text-slate-500">{label}</span>
      </span>
    </div>
  );
}

function PracticeStatus({
  requiredComplete,
  answeredCount,
  outstandingFlaggedCount,
}: {
  requiredComplete: boolean;
  answeredCount: number;
  outstandingFlaggedCount: number;
}) {
  if (outstandingFlaggedCount > 0) {
    return (
      <span className="hidden items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-orange-700 sm:inline-flex">
        <Flag className="h-3 w-3" aria-hidden="true" />
        {outstandingFlaggedCount} left
      </span>
    );
  }

  if (requiredComplete) {
    return (
      <span className="hidden items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 sm:inline-flex">
        <Check className="h-3 w-3" aria-hidden="true" />
        Complete
      </span>
    );
  }

  if (answeredCount > 0) {
    return (
      <span className="hidden items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 sm:inline-flex">
        <CircleDot className="h-3 w-3" aria-hidden="true" />
        In progress
      </span>
    );
  }

  return (
    <span className="hidden rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500 sm:inline-flex">
      Not started
    </span>
  );
}
