"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  ChevronDown,
  ChevronRight,
  CircleDot,
  FileQuestion,
  Layers3,
  Link2,
} from "lucide-react";
import type {
  Dimension,
  MaturityModel,
  Module,
  Practice,
  Question,
} from "@/api/types";
import { cn } from "@/lib/utils";

export type ModelStructureCounts = {
  dimensions: number;
  modules: number;
  practices: number;
  questions: number;
  levels: number;
};

export function countModelStructure(
  model: MaturityModel
): ModelStructureCounts {
  return model.dimensions.reduce<ModelStructureCounts>(
    (counts, dimension) => {
      counts.dimensions += 1;
      counts.modules += dimension.modules.length;
      dimension.modules.forEach((module) => {
        counts.practices += module.practices.length;
        counts.questions += module.practices.reduce(
          (total, practice) => total + practice.questions.length,
          0
        );
      });
      return counts;
    },
    {
      dimensions: 0,
      modules: 0,
      practices: 0,
      questions: 0,
      levels: model.levels?.length ?? 0,
    }
  );
}

export function formatQuestionType(type: Question["type"]): string {
  const labels: Record<Question["type"], string> = {
    boolean: "Yes / No",
    likert: "Scale",
    multiple_choice: "Multiple choice",
    numeric: "Number",
    percentage: "Percentage",
    open_answer: "Open answer",
    evidence: "Evidence",
  };
  return labels[type];
}

function hasCustomWeight(weight?: number) {
  return weight != null && Math.abs(Number(weight) - 1) > 1e-9;
}

function HierarchyStep({
  index,
  label,
}: {
  index: number;
  label: string;
}) {
  return (
    <li className="flex items-center gap-2 whitespace-nowrap">
      <span className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 text-[10px] font-semibold tabular-nums text-slate-400">
        {index}
      </span>
      <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-600">
        {label}
      </span>
    </li>
  );
}

function HierarchyConnector() {
  return (
    <li
      className="flex w-10 shrink-0 items-center text-slate-300 sm:w-14"
      aria-hidden="true"
    >
      <span className="h-px flex-1 bg-slate-300" />
      <ChevronRight className="-ml-1 h-4 w-4" />
    </li>
  );
}

function practiceKey(
  dimensionIndex: number,
  moduleIndex: number,
  practiceIndex: number
) {
  return `${dimensionIndex}-${moduleIndex}-${practiceIndex}`;
}

function dimensionKey(dimensionIndex: number) {
  return `${dimensionIndex}`;
}

function moduleKey(dimensionIndex: number, moduleIndex: number) {
  return `${dimensionIndex}-${moduleIndex}`;
}

function CollapsiblePanel({
  id,
  expanded,
  children,
}: {
  id: string;
  expanded: boolean;
  children: ReactNode;
}) {
  return (
    <div
      ref={(node) => {
        if (node) node.inert = !expanded;
      }}
      id={id}
      aria-hidden={!expanded}
      className={cn(
        "grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none",
        expanded
          ? "grid-rows-[1fr] opacity-100"
          : "grid-rows-[0fr] opacity-0"
      )}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

function questionCountForDimension(model: MaturityModel, dimensionIndex: number) {
  return model.dimensions[dimensionIndex].modules.reduce(
    (dimensionTotal, module) =>
      dimensionTotal +
      module.practices.reduce(
        (moduleTotal, practice) => moduleTotal + practice.questions.length,
        0
      ),
    0
  );
}

function parentQuestionText(practice: Practice, question: Question) {
  const parentById =
    question.dependsOnQuestionId != null
      ? practice.questions.find(
          (candidate) => candidate.id === question.dependsOnQuestionId
        )
      : undefined;
  const parentByCode = question.dependsOnQuestionCode
    ? practice.questions.find(
        (candidate) =>
          candidate.code?.toLocaleLowerCase() ===
          question.dependsOnQuestionCode?.toLocaleLowerCase()
      )
    : undefined;
  const parent = parentById ?? parentByCode;
  return parent?.text;
}

function QuestionRow({
  question,
  questionIndex,
  practice,
  levelCount,
}: {
  question: Question;
  questionIndex: number;
  practice: Practice;
  levelCount: number;
}) {
  const isDependent =
    question.dependsOnQuestionId != null ||
    Boolean(question.dependsOnQuestionCode);
  const parentText = parentQuestionText(practice, question);
  const typeLabel =
    question.type === "likert"
      ? `Scale · ${question.scalePointCount ?? 5} points · maximum at ${question.scaleHighPointIsMaximum ?? true ? question.scalePointCount ?? 5 : 1}`
      : question.type === "numeric" || question.type === "percentage"
        ? `${formatQuestionType(question.type)} · ${question.rangeMin ?? 0}–${question.rangeMax ?? 100} · maximum at ${question.rangeHighValueIsMaximum ?? true ? question.rangeMax ?? 100 : question.rangeMin ?? 0}`
      : formatQuestionType(question.type);

  return (
    <li
      className={cn(
        "relative grid grid-cols-[2rem_minmax(0,1fr)] gap-3 px-4 py-4 sm:px-5",
        isDependent && "bg-indigo-50/50"
      )}
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-[11px] font-bold tabular-nums text-slate-500">
        {String(questionIndex + 1).padStart(2, "0")}
      </span>
      <div className="min-w-0">
        {isDependent && (
          <p className="mb-1.5 flex items-start gap-1.5 text-xs font-medium leading-5 text-indigo-700">
            <Link2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>
              Follows:{" "}
              {parentText ??
                question.dependsOnQuestionCode ??
                "linked question"}
            </span>
          </p>
        )}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <p className="text-sm font-medium leading-6 text-slate-800">
            {question.text}
          </p>
          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            {question.required && (
              <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                Required
              </span>
            )}
            {question.requiresEvidence && (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                Evidence
              </span>
            )}
            {hasCustomWeight(question.weight) && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                Weight {question.weight}
              </span>
            )}
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
              {typeLabel}
            </span>
          </div>
        </div>
        {question.help?.trim() && (
          <p className="mt-2 text-xs leading-5 text-slate-500">
            {question.help}
          </p>
        )}
        {question.type === "likert" &&
          (question.scaleMinLabel?.trim() || question.scaleMaxLabel?.trim()) && (
            <p className="mt-2 text-xs leading-5 text-slate-500">
              1: {question.scaleMinLabel?.trim() || "Minimum"} ·{" "}
              {question.scalePointCount ?? 5}: {question.scaleMaxLabel?.trim() || "Maximum"}
            </p>
          )}
      </div>
    </li>
  );
}

function PracticeDisclosure({
  practice,
  disclosureKey,
  expanded,
  levelCount,
  onToggle,
}: {
  practice: Practice;
  disclosureKey: string;
  expanded: boolean;
  levelCount: number;
  onToggle: (key: string) => void;
}) {
  const contentId = `practice-content-${disclosureKey}`;
  const headingId = `practice-heading-${disclosureKey}`;

  return (
    <section aria-labelledby={headingId}>
      <h5 id={headingId} className="sr-only">
        {practice.name}
      </h5>
      <button
        type="button"
        onClick={() => onToggle(disclosureKey)}
        aria-labelledby={headingId}
        aria-expanded={expanded}
        aria-controls={contentId}
        className="group flex w-full items-start gap-3 px-4 py-4 text-left transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-300 sm:px-5"
      >
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-amber-50 text-amber-700">
          <CircleDot className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm font-semibold text-slate-800 group-hover:text-slate-950">
              {practice.name}
            </span>
            <span className="flex shrink-0 items-center gap-2 text-xs text-slate-400">
              {hasCustomWeight(practice.weight) && (
                <span>Weight {practice.weight}</span>
              )}
              <span className="inline-flex items-center gap-1">
                <FileQuestion className="h-3.5 w-3.5" aria-hidden="true" />
                {practice.questions.length}
              </span>
            </span>
          </span>
          {practice.description?.trim() && (
            <span className="mt-1 block text-xs leading-5 text-slate-500">
              {practice.description}
            </span>
          )}
        </span>
        <ChevronDown
          className={cn(
            "mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform duration-300 motion-reduce:transition-none",
            expanded && "rotate-180"
          )}
          aria-hidden="true"
        />
      </button>

      <CollapsiblePanel id={contentId} expanded={expanded}>
        <div className="border-t border-slate-100 bg-slate-50/50 py-2 pr-2 sm:pr-3">
          <div className="ml-7 border-l-2 border-amber-200 bg-white sm:ml-9">
            {practice.questions.length === 0 ? (
              <p className="px-4 py-4 text-sm text-slate-500">
                No questions in this practice.
              </p>
            ) : (
              <ol className="divide-y divide-slate-100">
                {practice.questions.map((question, questionIndex) => (
                  <QuestionRow
                    key={question.id ?? question.code ?? questionIndex}
                    question={question}
                    questionIndex={questionIndex}
                    practice={practice}
                    levelCount={levelCount}
                  />
                ))}
              </ol>
            )}
          </div>
        </div>
      </CollapsiblePanel>
    </section>
  );
}

function ModuleDisclosure({
  module,
  dimensionIndex,
  moduleIndex,
  expanded,
  expandedPractices,
  levelCount,
  onToggle,
  onTogglePractice,
}: {
  module: Module;
  dimensionIndex: number;
  moduleIndex: number;
  expanded: boolean;
  expandedPractices: Set<string>;
  levelCount: number;
  onToggle: (key: string) => void;
  onTogglePractice: (key: string) => void;
}) {
  const disclosureKey = moduleKey(dimensionIndex, moduleIndex);
  const contentId = `module-content-${disclosureKey}`;
  const headingId = `module-heading-${disclosureKey}`;
  const questionCount = module.practices.reduce(
    (total, practice) => total + practice.questions.length,
    0
  );

  return (
    <section
      aria-labelledby={headingId}
      className="overflow-hidden rounded-xl border border-slate-200"
    >
      <header className="bg-white">
        <h4 id={headingId} className="sr-only">
          {module.name}
        </h4>
        <button
          type="button"
          onClick={() => onToggle(disclosureKey)}
          aria-labelledby={headingId}
          aria-expanded={expanded}
          aria-controls={contentId}
          className="group flex w-full items-start gap-3 px-4 py-3.5 text-left transition hover:bg-violet-50/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-300 sm:px-5"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
            <Layers3 className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-violet-600">
              Module {dimensionIndex + 1}.{moduleIndex + 1}
            </span>
            <span className="mt-0.5 block text-base font-bold text-slate-900 group-hover:text-violet-950">
              {module.name}
            </span>
            {module.description?.trim() && (
              <span className="mt-1 block text-sm leading-6 text-slate-500">
                {module.description}
              </span>
            )}
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <span className="hidden flex-wrap items-center gap-1.5 sm:flex">
              {hasCustomWeight(module.weight) && (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                  Weight {module.weight}
                </span>
              )}
              <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700">
                {module.practices.length} practices
              </span>
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                {questionCount} questions
              </span>
            </span>
            <ChevronDown
              className={cn(
                "mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform duration-300 motion-reduce:transition-none",
                expanded && "rotate-180"
              )}
              aria-hidden="true"
            />
          </span>
        </button>
      </header>

      <CollapsiblePanel id={contentId} expanded={expanded}>
        <div className="border-t border-slate-100">
          {module.practices.length === 0 ? (
            <p className="px-5 py-5 text-sm text-slate-500">
              No practices in this module.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {module.practices.map((practice, practiceIndex) => {
                const key = practiceKey(
                  dimensionIndex,
                  moduleIndex,
                  practiceIndex
                );
                return (
                  <PracticeDisclosure
                    key={practice.code ?? practice.id ?? key}
                    practice={practice}
                    disclosureKey={key}
                    expanded={expandedPractices.has(key)}
                    levelCount={levelCount}
                    onToggle={onTogglePractice}
                  />
                );
              })}
            </div>
          )}
        </div>
      </CollapsiblePanel>
    </section>
  );
}

function DimensionDisclosure({
  model,
  dimension,
  dimensionIndex,
  expanded,
  expandedModules,
  expandedPractices,
  onToggle,
  onToggleModule,
  onTogglePractice,
}: {
  model: MaturityModel;
  dimension: Dimension;
  dimensionIndex: number;
  expanded: boolean;
  expandedModules: Set<string>;
  expandedPractices: Set<string>;
  onToggle: (key: string) => void;
  onToggleModule: (key: string) => void;
  onTogglePractice: (key: string) => void;
}) {
  const disclosureKey = dimensionKey(dimensionIndex);
  const contentId = `dimension-content-${disclosureKey}`;
  const headingId = `dimension-heading-${disclosureKey}`;
  const questionCount = questionCountForDimension(model, dimensionIndex);

  return (
    <article
      id={`dimension-${dimensionIndex + 1}`}
      aria-labelledby={headingId}
      className="scroll-mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <header className="bg-slate-50/70">
        <h3 id={headingId} className="sr-only">
          {dimension.name}
        </h3>
        <button
          type="button"
          onClick={() => onToggle(disclosureKey)}
          aria-labelledby={headingId}
          aria-expanded={expanded}
          aria-controls={contentId}
          className="group flex w-full items-start gap-4 px-5 py-4 text-left transition hover:bg-slate-100/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-300 sm:px-6"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600">
              Dimension {String(dimensionIndex + 1).padStart(2, "0")}
            </span>
            <span className="mt-1 block text-xl font-bold tracking-tight text-slate-950 group-hover:text-indigo-950">
              {dimension.name}
            </span>
            {dimension.description?.trim() && (
              <span className="mt-1.5 block max-w-3xl text-sm leading-6 text-slate-600">
                {dimension.description}
              </span>
            )}
          </span>
          <span className="flex shrink-0 items-center gap-3">
            <span className="hidden rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500 sm:inline-flex">
              {dimension.modules.length} modules · {questionCount} questions
            </span>
            <ChevronDown
              className={cn(
                "mt-1 h-5 w-5 shrink-0 text-slate-400 transition-transform duration-300 motion-reduce:transition-none",
                expanded && "rotate-180"
              )}
              aria-hidden="true"
            />
          </span>
        </button>
      </header>

      <CollapsiblePanel id={contentId} expanded={expanded}>
        <div className="space-y-5 border-t border-slate-100 p-4 sm:p-6">
          {dimension.modules.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
              No modules in this dimension.
            </p>
          ) : (
            dimension.modules.map((module, moduleIndex) => {
              const key = moduleKey(dimensionIndex, moduleIndex);
              return (
                <ModuleDisclosure
                  key={module.code ?? moduleIndex}
                  module={module}
                  dimensionIndex={dimensionIndex}
                  moduleIndex={moduleIndex}
                  expanded={expandedModules.has(key)}
                  expandedPractices={expandedPractices}
                  levelCount={model.levels?.length ?? 0}
                  onToggle={onToggleModule}
                  onTogglePractice={onTogglePractice}
                />
              );
            })
          )}
        </div>
      </CollapsiblePanel>
    </article>
  );
}

export default function ModelStructureExplorer({ model }: { model: MaturityModel }) {
  const allDimensionKeys = useMemo(
    () =>
      model.dimensions.map((_, dimensionIndex) =>
        dimensionKey(dimensionIndex)
      ),
    [model]
  );
  const allModuleKeys = useMemo(
    () =>
      model.dimensions.flatMap((dimension, dimensionIndex) =>
        dimension.modules.map((_, moduleIndex) =>
          moduleKey(dimensionIndex, moduleIndex)
        )
      ),
    [model]
  );
  const allPracticeKeys = useMemo(
    () =>
      model.dimensions.flatMap((dimension, dimensionIndex) =>
        dimension.modules.flatMap((module, moduleIndex) =>
          module.practices.map((_, practiceIndex) =>
            practiceKey(dimensionIndex, moduleIndex, practiceIndex)
          )
        )
      ),
    [model]
  );
  const [expandedDimensions, setExpandedDimensions] = useState<Set<string>>(
    () => new Set(allDimensionKeys)
  );
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    () => new Set(allModuleKeys)
  );
  const [expandedPractices, setExpandedPractices] = useState<Set<string>>(
    () => new Set(allPracticeKeys.slice(0, 1))
  );
  const allExpanded =
    allDimensionKeys.length > 0 &&
    allDimensionKeys.every((key) => expandedDimensions.has(key)) &&
    allModuleKeys.every((key) => expandedModules.has(key)) &&
    allPracticeKeys.every((key) => expandedPractices.has(key));

  const toggleDimension = (key: string) => {
    setExpandedDimensions((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleModule = (key: string) => {
    setExpandedModules((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const togglePractice = (key: string) => {
    setExpandedPractices((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <section aria-labelledby="model-structure-heading" className="min-w-0">
      <h2 id="model-structure-heading" className="sr-only">
        Model structure
      </h2>

      <div className="mb-4">
        <div className="overflow-x-auto py-2">
          <ol
            aria-label="Model hierarchy: dimensions contain modules, modules contain practices, and practices contain questions"
            className="mx-auto flex w-max min-w-max items-center px-2"
          >
            <HierarchyStep index={1} label="Dimensions" />
            <HierarchyConnector />
            <HierarchyStep index={2} label="Modules" />
            <HierarchyConnector />
            <HierarchyStep index={3} label="Practices" />
            <HierarchyConnector />
            <HierarchyStep index={4} label="Questions" />
          </ol>
        </div>

        {allDimensionKeys.length > 0 && (
          <div className="mt-1 flex justify-center sm:justify-end">
            <button
              type="button"
              onClick={() => {
                setExpandedDimensions(
                  allExpanded ? new Set() : new Set(allDimensionKeys)
                );
                setExpandedModules(
                  allExpanded ? new Set() : new Set(allModuleKeys)
                );
                setExpandedPractices(
                  allExpanded ? new Set() : new Set(allPracticeKeys)
                );
              }}
              className="rounded-md px-2 py-1.5 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-50 hover:text-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              {allExpanded ? "Collapse all" : "Expand all"}
            </button>
          </div>
        )}
      </div>

      {model.dimensions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <Layers3 className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
          <h3 className="mt-3 text-sm font-semibold text-slate-800">
            No model structure available
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Edit the model to add its first dimension.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {model.dimensions.map((dimension, dimensionIndex) => {
            const key = dimensionKey(dimensionIndex);
            return (
              <DimensionDisclosure
                key={dimension.id ?? dimensionIndex}
                model={model}
                dimension={dimension}
                dimensionIndex={dimensionIndex}
                expanded={expandedDimensions.has(key)}
                expandedModules={expandedModules}
                expandedPractices={expandedPractices}
                onToggle={toggleDimension}
                onToggleModule={toggleModule}
                onTogglePractice={togglePractice}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
