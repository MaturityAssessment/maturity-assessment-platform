"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  Flag,
  LayoutDashboard,
} from "lucide-react";
import type {
  AssessmentData,
  AssessmentEvidenceInputItem,
  Dimension,
  Module,
  Practice,
  QuestionEvaluationResponse,
  Question,
} from "@/api/types";
import { AgentChatModal } from "@/components";
import { cn } from "@/lib/utils";
import AssessmentNavigationMenu, {
  type AssessmentNavigationModule,
} from "./AssessmentNavigationMenu";
import AssessmentQuestionCard from "./AssessmentQuestionCard";
import {
  getAssessmentPracticeRouteChangeAction,
  getFieldName,
  isDependentQuestionDisabled,
} from "./assessmentFlowUtils";
import type { AssessmentEvidenceByField } from "./assessmentEvidence";
import { buildAssessmentAssistantContext } from "./assessmentAssistantContext";
import type { AssessmentQuestionTourTargetIndexes } from "./assessmentTour";

export interface AssessmentPracticeStep {
  key: string;
  dimension: Dimension;
  module: Module;
  practice: Practice;
}

interface AssessmentStepProps {
  modelName: string;
  modelMaxLevel: number;
  dimensionName: string;
  navigationModules: AssessmentNavigationModule[];
  activeModuleKey: string;
  practiceSteps: AssessmentPracticeStep[];
  activePracticeKey: string;
  formData: AssessmentData;
  evidenceFiles: AssessmentEvidenceByField;
  questionEvaluations?: Record<string, QuestionEvaluationResponse>;
  respondentUpdatedResponseKeys: ReadonlySet<string>;
  outstandingFlaggedCount: number;
  assistantEnabled: boolean;
  questionTourTargetIndexes: AssessmentQuestionTourTargetIndexes;
  nextModuleName: string | null;
  onModuleSelect: (moduleKey: string) => void;
  onModuleOverview: () => void;
  onNextModule: (() => void) | null;
  onPracticeSelect: (practiceKey: string) => void;
  onInputChange: (field: string, value: string | number) => void;
  onClearAnswer: (field: string) => void;
  onEvidenceItemsChange: (
    field: string,
    items: AssessmentEvidenceInputItem[]
  ) => void;
  onOverview: () => void;
}

export default function AssessmentStep({
  modelName,
  modelMaxLevel,
  dimensionName,
  navigationModules,
  activeModuleKey,
  practiceSteps,
  activePracticeKey,
  formData,
  evidenceFiles,
  questionEvaluations,
  respondentUpdatedResponseKeys,
  outstandingFlaggedCount,
  assistantEnabled,
  questionTourTargetIndexes,
  nextModuleName,
  onModuleSelect,
  onModuleOverview,
  onNextModule,
  onPracticeSelect,
  onInputChange,
  onClearAnswer,
  onEvidenceItemsChange,
  onOverview,
}: AssessmentStepProps) {
  const practiceSectionRefs = useRef(new Map<string, HTMLElement>());
  const pendingPracticeKeyRef = useRef<string | null>(null);
  const historyNavigationRef = useRef(false);
  const activePracticeKeyRef = useRef(activePracticeKey);
  const [visiblePracticeKey, setVisiblePracticeKey] =
    useState(activePracticeKey);
  const [animatePracticeTransition, setAnimatePracticeTransition] =
    useState(false);
  const [assistantContext, setAssistantContext] = useState<string | null>(null);

  activePracticeKeyRef.current = activePracticeKey;

  const scrollToPractice = useCallback(
    (practiceKey: string, behavior: ScrollBehavior) => {
      const targetSection = practiceSectionRefs.current.get(practiceKey);
      if (!targetSection) return;

      targetSection.scrollTop = 0;
      setAnimatePracticeTransition(behavior === "smooth");
      setVisiblePracticeKey(practiceKey);
    },
    []
  );

  const selectPractice = useCallback(
    (practiceKey: string) => {
      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      pendingPracticeKeyRef.current =
        practiceKey === activePracticeKeyRef.current ? null : practiceKey;
      scrollToPractice(practiceKey, reducedMotion ? "auto" : "smooth");
      onPracticeSelect(practiceKey);
    },
    [onPracticeSelect, scrollToPractice]
  );

  useEffect(() => {
    if (historyNavigationRef.current) {
      historyNavigationRef.current = false;
      pendingPracticeKeyRef.current = null;
    } else {
      const routeAction = getAssessmentPracticeRouteChangeAction(
        activePracticeKey,
        null,
        pendingPracticeKeyRef.current
      );

      if (routeAction === "acknowledge-explicit") {
        pendingPracticeKeyRef.current = null;
        return;
      }
      if (routeAction === "await-internal-route") return;
    }

    const frame = window.requestAnimationFrame(() => {
      scrollToPractice(activePracticeKey, "auto");
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activePracticeKey, scrollToPractice]);

  useEffect(() => {
    const handleHistoryNavigation = () => {
      historyNavigationRef.current = true;
    };

    window.addEventListener("popstate", handleHistoryNavigation);
    return () =>
      window.removeEventListener("popstate", handleHistoryNavigation);
  }, []);

  const moduleName = practiceSteps[0]?.module.name ?? "Module";
  const visiblePracticeIndex = Math.max(
    0,
    practiceSteps.findIndex((step) => step.key === visiblePracticeKey)
  );

  const openAssistant = (
    step: AssessmentPracticeStep,
    question: Question,
    evaluation?: QuestionEvaluationResponse
  ) => {
    setAssistantContext(
      buildAssessmentAssistantContext({
        modelName,
        dimensionName: step.dimension.name,
        moduleName: step.module.name,
        practiceName: step.practice.name,
        practiceDescription: step.practice.description,
        question,
        modelMaxLevel,
        evaluation,
      })
    );
  };

  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-4 lg:grid-cols-[260px_minmax(0,1fr)] lg:grid-rows-1 lg:gap-8">
      <aside className="min-w-0 lg:min-h-0">
        <AssessmentNavigationMenu
          dimensionName={dimensionName}
          modules={navigationModules}
          activeModuleKey={activeModuleKey}
          activePracticeKey={visiblePracticeKey}
          onModuleSelect={onModuleSelect}
          onPracticeSelect={selectPractice}
        />
      </aside>

      <div
        data-practice-pager
        className="relative min-h-0 min-w-0 overflow-clip"
        aria-label={`${moduleName} practices`}
      >
        {practiceSteps.map((step, practiceIndex) => {
          const headingId = `practice-${practiceIndex}-heading`;
          const previousPractice = practiceSteps[practiceIndex - 1];
          const nextPractice = practiceSteps[practiceIndex + 1];
          const isVisible = step.key === visiblePracticeKey;

          return (
            <section
              key={step.key}
              ref={(node) => {
                if (node) {
                  practiceSectionRefs.current.set(step.key, node);
                } else {
                  practiceSectionRefs.current.delete(step.key);
                }
              }}
              data-practice-key={step.key}
              data-practice-scroll
              className={cn(
                "absolute inset-0 h-full min-h-0 overflow-y-auto overscroll-y-contain bg-gray-50 px-1 pb-8 pt-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-300 hover:scrollbar-thumb-slate-400 sm:px-2 sm:pb-10 sm:pr-3",
                animatePracticeTransition &&
                  "transform-gpu transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
                practiceIndex < visiblePracticeIndex && "-translate-y-full",
                practiceIndex === visiblePracticeIndex && "translate-y-0",
                practiceIndex > visiblePracticeIndex && "translate-y-full"
              )}
              aria-labelledby={headingId}
              aria-hidden={!isVisible}
              inert={!isVisible}
            >
              <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col">
                <header className="pb-4 sm:pb-5">
                  <nav
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
                    <ChevronRight
                      className="h-3.5 w-3.5"
                      aria-hidden="true"
                    />
                    <span>{step.dimension.name}</span>
                    <ChevronRight
                      className="h-3.5 w-3.5"
                      aria-hidden="true"
                    />
                    <button
                      type="button"
                      onClick={onModuleOverview}
                      className="rounded px-1 py-0.5 transition hover:bg-indigo-50 hover:text-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
                    >
                      {step.module.name}
                    </button>
                    <ChevronRight
                      className="h-3.5 w-3.5"
                      aria-hidden="true"
                    />
                    <span className="text-indigo-600">
                      {step.practice.name}
                    </span>
                  </nav>

                  <h2
                    id={headingId}
                    className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl"
                  >
                    {step.practice.name}
                  </h2>

                  {step.practice.description && (
                    <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                      {step.practice.description}
                    </p>
                  )}
                  {outstandingFlaggedCount > 0 && (
                    <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-800">
                      <Flag className="h-3.5 w-3.5" aria-hidden="true" />
                      {outstandingFlaggedCount} flagged item
                      {outstandingFlaggedCount === 1 ? "" : "s"} left to
                      update before review
                    </p>
                  )}
                </header>

                <div className="mb-3 flex">
                  <button
                    type="button"
                    onClick={() =>
                      previousPractice
                        ? selectPractice(previousPractice.key)
                        : onModuleOverview()
                    }
                    className="group inline-flex items-center gap-1.5 rounded-md px-1 py-1 text-xs font-medium text-slate-500 transition hover:text-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
                  >
                    <ArrowUp
                      className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5"
                      aria-hidden="true"
                    />
                    {previousPractice
                      ? "Previous Practice"
                      : "Module Overview"}
                  </button>
                </div>

                <div className="space-y-4">
                  {step.practice.questions.length === 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
                      This practice does not have questions yet.
                    </div>
                  ) : (
                    step.practice.questions.map((question, questionIndex) => {
                      const fieldName = getFieldName(step, question);
                      const disabled = isDependentQuestionDisabled(
                        step,
                        question,
                        formData
                      );
                      const evaluation = questionEvaluations?.[fieldName];
                      const helpTourTargets = isVisible
                        ? {
                            question:
                              questionTourTargetIndexes.question ===
                              questionIndex,
                            requirements:
                              questionTourTargetIndexes.requirements ===
                              questionIndex,
                            actions:
                              questionTourTargetIndexes.actions ===
                              questionIndex,
                            guidance:
                              questionTourTargetIndexes.guidance ===
                              questionIndex,
                          }
                        : undefined;

                      return (
                        <AssessmentQuestionCard
                          key={fieldName}
                          question={question}
                          fieldName={fieldName}
                          value={formData[fieldName]}
                          evidenceItems={evidenceFiles.get(fieldName) || []}
                          modelMaxLevel={modelMaxLevel}
                          disabled={disabled}
                          evaluation={evaluation}
                          respondentUpdated={Boolean(
                            evaluation?.respondentUpdated ||
                              respondentUpdatedResponseKeys.has(fieldName)
                          )}
                          helpTourTargets={helpTourTargets}
                          onAskAssistant={
                            assistantEnabled
                              ? () => openAssistant(step, question, evaluation)
                              : undefined
                          }
                          onInputChange={onInputChange}
                          onClearAnswer={onClearAnswer}
                          onEvidenceItemsChange={onEvidenceItemsChange}
                        />
                      );
                    })
                  )}
                </div>

                <div className="mt-auto flex justify-center pb-1 pt-8 sm:pt-10">
                  <button
                    type="button"
                    onClick={() =>
                      nextPractice
                        ? selectPractice(nextPractice.key)
                        : onNextModule
                          ? onNextModule()
                          : onOverview()
                    }
                    className="group inline-flex flex-col items-center gap-1 rounded-lg px-4 py-2 text-sm font-semibold text-slate-500 transition hover:text-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
                  >
                    {nextPractice ? (
                      <>
                        Next Practice
                        <ArrowDown
                          className="h-4 w-4 transition-transform group-hover:translate-y-1"
                          aria-hidden="true"
                        />
                      </>
                    ) : (
                      <>
                        {nextModuleName
                          ? `Continue to ${nextModuleName}`
                          : "Back to Assessment Overview"}
                        {nextModuleName ? (
                          <ArrowDown
                            className="h-4 w-4 transition-transform group-hover:translate-y-1"
                            aria-hidden="true"
                          />
                        ) : (
                          <LayoutDashboard
                            className="h-4 w-4"
                            aria-hidden="true"
                          />
                        )}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      {assistantEnabled && (
        <AgentChatModal
          isOpen={assistantContext !== null}
          onClose={() => setAssistantContext(null)}
          context="assessment"
          contextDetails={assistantContext ?? undefined}
          title="Help with this assessment item"
        />
      )}
    </div>
  );
}
