import { Listbox, ListboxButton, ListboxLabel, ListboxOption, ListboxOptions } from "@headlessui/react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import type { DependencyCondition, ModelEditorPractice, ModelEditorQuestion } from "@/api/types";
import { defaultDependencyCondition, dependencyConditionError, dependencySummary } from "@/lib/questionDependencies";
import { dependencyWouldCycle } from "../model/editorValidation";
import { inputClass, labelClass } from "./FormFields";

export default function QuestionDependencyField({ question, practice, onChange }: {
  question: ModelEditorQuestion;
  practice: ModelEditorPractice;
  onChange: (question: ModelEditorQuestion) => void;
}) {
  const candidates = practice.questions.filter((candidate) => candidate.clientKey !== question.clientKey
    && ["boolean", "multiple_choice", "likert"].includes(candidate.type)
    && !dependencyWouldCycle(practice, question.code, candidate.code));
  const parent = practice.questions.find((candidate) => candidate.code.toLowerCase() === question.dependsOnQuestionCode?.toLowerCase());
  const eligible = parent && candidates.includes(parent);
  const condition = question.dependencyCondition ?? (parent?.type === "boolean" ? defaultDependencyCondition("boolean") : undefined);
  const error = question.dependsOnQuestionCode && !eligible ? "Select a valid parent question in this practice."
    : dependencyConditionError(parent, condition);
  const id = `question-${question.clientKey}-dependency`;
  const label = (candidate: ModelEditorQuestion) => `${candidate.code} — ${candidate.text || "Untitled question"}`;
  const setCondition = (dependencyCondition: DependencyCondition) => onChange({ ...question, dependencyCondition });
  const options: { value: boolean | string | number; label: string }[] = parent?.type === "boolean"
    ? [{ value: true, label: "Yes" }, { value: false, label: "No" }]
    : parent?.type === "multiple_choice"
      ? (parent.choices ?? []).map((choice) => ({ value: choice.id ?? "", label: choice.label || "Untitled option" }))
      : parent?.type === "likert"
        ? Array.from({ length: Number.isInteger(parent.scalePointCount) ? Math.min(100, Math.max(0, parent.scalePointCount)) : 0 }, (_, index) => ({
            value: index + 1,
            label: `${index + 1}${index === 0 && parent.scaleMinLabel ? ` — ${parent.scaleMinLabel}` : index + 1 === parent.scalePointCount && parent.scaleMaxLabel ? ` — ${parent.scaleMaxLabel}` : ""}`,
          })) : [];
  const selected: (string | number | boolean)[] = condition?.type !== parent?.type ? []
    : condition?.type === "boolean" ? condition.answers : condition?.type === "multiple_choice" ? condition.optionIds : condition?.points ?? [];
  const toggle = (value: boolean | string | number) => {
    const next = selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value];
    if (parent?.type === "boolean") setCondition({ type: "boolean", answers: next as boolean[] });
    if (parent?.type === "multiple_choice") setCondition({ type: "multiple_choice", optionIds: next as string[] });
    if (parent?.type === "likert") setCondition({ type: "likert", points: (next as number[]).sort((a, b) => a - b) });
  };

  return (
    <div className="min-w-0">
      <Listbox as="div" className={labelClass} value={question.dependsOnQuestionCode ?? ""}
        onChange={(code: string) => {
          const nextParent = candidates.find((candidate) => candidate.code === code);
          onChange({ ...question, dependsOnQuestionCode: code || undefined,
            dependencyCondition: nextParent ? defaultDependencyCondition(nextParent.type) : undefined });
        }}>
        <ListboxLabel>Depends on</ListboxLabel>
        <ListboxButton id={id} aria-invalid={Boolean(error)} aria-describedby={`${id}-help${error ? ` ${id}-error` : ""}`}
          className={`${inputClass} flex min-w-0 items-center gap-2 text-left ${error ? "border-red-500" : ""}`}
          title={parent ? label(parent) : undefined}>
          <span className="min-w-0 flex-1 truncate">{parent ? label(parent) : question.dependsOnQuestionCode || "No dependency"}</span>
          <ChevronDownIcon aria-hidden="true" className="h-4 w-4 shrink-0 text-gray-500" />
        </ListboxButton>
        <ListboxOptions anchor="bottom start" className="z-50 max-h-64 w-[var(--button-width)] overflow-y-auto overflow-x-hidden rounded-md border border-gray-200 bg-white p-1 shadow-lg [--anchor-gap:4px] focus:outline-none">
          <ListboxOption value="" className="cursor-pointer rounded px-2 py-2 text-sm text-gray-900 data-[focus]:bg-blue-50 data-[selected]:font-semibold">No dependency</ListboxOption>
          {question.dependsOnQuestionCode && !eligible && (
            <ListboxOption disabled value={question.dependsOnQuestionCode} className="rounded px-2 py-2 text-sm text-red-600">
              <span className="block truncate">{parent ? label(parent) : question.dependsOnQuestionCode} (needs attention)</span>
            </ListboxOption>
          )}
          {candidates.map((candidate) => (
            <ListboxOption key={candidate.clientKey} value={candidate.code} title={label(candidate)}
              className="cursor-pointer rounded px-2 py-2 text-sm text-gray-900 data-[focus]:bg-blue-50 data-[selected]:font-semibold">
              <span className="block truncate">{label(candidate)}</span>
            </ListboxOption>
          ))}
        </ListboxOptions>
      </Listbox>
      <p id={`${id}-help`} className="mt-1 text-xs text-gray-500">Choose a Yes / No, Multiple choice, or Scale question in this practice.</p>
      {eligible && (
        <fieldset className="mt-3 min-w-0 rounded-lg border border-gray-200 bg-gray-50/70 p-3" aria-describedby={error ? `${id}-error` : undefined}>
          <legend className="px-1 text-xs font-semibold text-gray-800">Activate when the answer is</legend>
          <div className={`flex max-h-48 gap-2 overflow-y-auto ${parent.type === "multiple_choice" ? "flex-col" : "flex-wrap"}`}>
            {options.map((option) => (
              <label key={String(option.value)} className="flex min-w-0 cursor-pointer items-start gap-2 rounded-md border border-gray-200 bg-white px-2.5 py-2 text-sm text-gray-800">
                <input type="checkbox" checked={selected.includes(option.value)} onChange={() => toggle(option.value)}
                  className="mt-0.5 shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <span className="min-w-0 [overflow-wrap:anywhere]">{option.label}</span>
              </label>
            ))}
          </div>
          {!error && <p className="mt-2 line-clamp-3 text-xs leading-5 text-gray-500" title={dependencySummary(parent, condition)}>{dependencySummary(parent, condition)}. Any selected answer activates this question.</p>}
          {error && <button type="button" className="mt-2 text-xs font-medium text-blue-600 hover:underline"
            onClick={() => onChange({ ...question, dependencyCondition: defaultDependencyCondition(parent.type) })}>Reset activation answers</button>}
        </fieldset>
      )}
      {error && <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
