import { useState } from "react";
import type { ModelEditorQuestion } from "@/api/types";
import { acceptedValueLabel, type AcceptedValue } from "../model/questionBranchingEditor";
import { inputClass, labelClass } from "./FormFields";

const same = (a: AcceptedValue, b: AcceptedValue) => JSON.stringify(a) === JSON.stringify(b);
export const branchingActionClass = "rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-40";

export default function BranchingAcceptedAnswers({ parent, values, onChange }: {
  parent: ModelEditorQuestion; values: AcceptedValue[]; onChange: (values: AcceptedValue[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const options: Array<{ value: AcceptedValue; label: string }> = parent.type === "boolean"
    ? [{ value: true, label: "Yes" }, { value: false, label: "No" }]
    : parent.type === "multiple_choice" || parent.type === "multiple_selection"
      ? (parent.choices ?? []).filter(choice => choice.id).map(choice => ({ value: choice.id!, label: choice.label || "Untitled option" }))
      : parent.type === "likert"
        ? Array.from({ length: Math.min(100, Math.max(0, parent.scalePointCount || 0)) }, (_, index) => ({ value: index + 1, label: String(index + 1) })) : [];
  const freeEntry = ["numeric", "percentage", "open_answer"].includes(parent.type);
  if (parent.allowNotApplicable) options.push({ value: { notApplicable: true }, label: "N/A (Not applicable)" });
  const toggle = (value: AcceptedValue) => onChange(values.some(item => same(item, value)) ? values.filter(item => !same(item, value)) : [...values, value]);
  const number = Number(draft);
  const draftValid = parent.type === "open_answer" ? Boolean(draft.trim())
    : Boolean(draft.trim()) && Number.isInteger(number) && number >= parent.rangeMin && number <= parent.rangeMax;
  const value = parent.type === "open_answer" ? draft : number;
  const add = () => { if (draftValid && !values.some(item => same(item, value))) { onChange([...values, value]); setDraft(""); } };
  return <fieldset className="mt-3 min-w-0 space-y-2">
    <legend className="text-xs font-semibold text-gray-700">Accepted answers</legend>
    <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto">
      {options.map(option => <label key={JSON.stringify(option.value)} className="flex min-w-0 items-start gap-2 rounded-md border border-gray-200 bg-white px-2.5 py-2 text-sm text-gray-800">
        <input type="checkbox" checked={values.some(item => same(item, option.value))} onChange={() => toggle(option.value)} className="mt-0.5 rounded border-gray-300 text-blue-600" />
        <span className="min-w-0 [overflow-wrap:anywhere]">{option.label}</span>
      </label>)}
    </div>
    {values.filter(item => !options.some(option => same(option.value, item))).map(item => <div key={JSON.stringify(item)} className="flex items-center justify-between gap-2 rounded border border-gray-200 bg-white px-3 py-2 text-sm">
      <span className="min-w-0 whitespace-pre-wrap [overflow-wrap:anywhere]">{acceptedValueLabel(item, parent)}{!freeEntry && " (no longer available)"}</span>
      <button type="button" className={branchingActionClass} onClick={() => toggle(item)} aria-label={`Remove accepted answer ${acceptedValueLabel(item, parent)}`}>Remove</button>
    </div>)}
    {freeEntry && <div className="flex flex-wrap items-end gap-2">
      <label className={`${labelClass} min-w-0 flex-1`}>{parent.type === "open_answer" ? "Exact answer text" : `Whole number (${parent.rangeMin}–${parent.rangeMax})`}
        <input className={inputClass} type={parent.type === "open_answer" ? "text" : "number"} value={draft}
          min={parent.rangeMin} max={parent.rangeMax} step={1} maxLength={10000}
          onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); add(); } }} />
      </label>
      <button type="button" className={branchingActionClass} disabled={!draftValid || values.some(item => same(item, value)) || values.length >= 1000} onClick={add}>Add answer</button>
    </div>}
    <p className="text-xs leading-5 text-gray-500">{parent.type === "multiple_selection"
      ? "For an ordinary answer, all listed options must be selected; extra options are allowed. A respondent's N/A replaces those selections and matches only if N/A is accepted here."
      : parent.type === "open_answer" ? "Any listed answer matches. Text is case-sensitive and must match exactly."
        : "Any selected answer matches."}</p>
    {!values.length && <p role="alert" className="text-xs text-red-600">Choose at least one accepted answer.</p>}
  </fieldset>;
}
