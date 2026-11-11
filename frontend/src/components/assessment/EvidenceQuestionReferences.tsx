"use client";

import { useId } from "react";
import { questionReferenceLabel, type EvidenceQuestionOption } from "@/app/assessment/evidenceReferences";

export type EvidenceReferenceProps = {
  questions?: EvidenceQuestionOption[];
  evidenceRequirements?: import("@/api/types").EvidenceRequirement[];
  currentEvidenceFreshness?: import("@/api/types").EvidenceFreshnessSummary;
  historicalEvidenceValidity?: import("@/api/types").EvidenceFreshnessSummary;
  inactiveQuestionIds?: ReadonlySet<number>;
};

export function EvidenceQuestionReferenceChips({ referencedQuestionIds = [], questions = [], inactiveQuestionIds }: EvidenceReferenceProps & {
  referencedQuestionIds?: number[];
}) {
  if (!referencedQuestionIds.length) {
    return <p className="mt-2 text-xs text-slate-500">General practice evidence · No question references</p>;
  }
  return <ul aria-label="Referenced questions" className="mt-2 flex flex-wrap gap-1.5">
    {referencedQuestionIds.map(id => {
      const question = questions.find(candidate => candidate.id === id);
      const label = question ? questionReferenceLabel(question) : `Question ${id}`;
      const description = `${question ? `${question.code || `Question ${id}`}: ${question.text}` : label}${inactiveQuestionIds?.has(id) ? " · Inactive" : ""}`;
      return <li key={id} title={description} aria-label={description}
        className="max-w-full rounded-md bg-indigo-50 px-2 py-1 text-xs text-indigo-800">
        <span className="line-clamp-2">{label}{inactiveQuestionIds?.has(id) ? " · Inactive" : ""}</span>
      </li>;
    })}
  </ul>;
}

export function EvidenceQuestionReferencePicker({ selectedIds, onChange, questions = [], inactiveQuestionIds }: EvidenceReferenceProps & {
  selectedIds: number[]; onChange: (ids: number[]) => void;
}) {
  const prefix = useId();
  return <fieldset className="space-y-2">
    <legend className="mb-2 text-sm font-medium text-slate-900">Reference questions <span className="font-normal text-slate-500">(optional)</span></legend>
    <p className="text-xs leading-5 text-slate-500">Choose the questions this evidence supports, or leave it as general practice evidence.</p>
    <div className="max-h-60 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
      {questions.filter(question => question.id != null).map(question => <label key={question.id}
        htmlFor={`${prefix}-${question.id}`} className="flex cursor-pointer items-start gap-3 rounded-md p-2 text-sm hover:bg-slate-50">
        <input id={`${prefix}-${question.id}`} type="checkbox" className="mt-1 accent-indigo-600"
          checked={selectedIds.includes(question.id!)}
          onChange={event => onChange(event.target.checked ? [...selectedIds, question.id!] : selectedIds.filter(id => id !== question.id))} />
        <span className="min-w-0" title={question.text}>
          <span className="font-medium text-slate-800">{question.code || `Question ${question.id}`}</span>
          {inactiveQuestionIds?.has(question.id!) && <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">Inactive</span>}
          <span className="mt-0.5 block text-xs leading-5 text-slate-600">{question.text}</span>
        </span>
      </label>)}
      {!questions.length && <p className="p-2 text-xs text-slate-500">This practice has no questions.</p>}
    </div>
  </fieldset>;
}
