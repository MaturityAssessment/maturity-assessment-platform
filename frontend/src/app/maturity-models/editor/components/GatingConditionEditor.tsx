import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from "@headlessui/react";
import { PlusIcon, TrashIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import type { GatingChildCondition, GatingComparison, GatingField, GatingOperand, GatingOperator } from "@/api/types";
import type { GatingChildOption } from "../model/conditionalGating";
import { emptySelectionDescription, fieldNames, operatorNames, quantifierNames, stateNames } from "../model/gatingRuleLabels";
import { inputClass as baseInputClass } from "./FormFields";

const inputClass = `${baseInputClass} !mt-0 min-h-11 rounded-lg border-gray-200 shadow-none`;
const labelClass = "block min-w-0 space-y-2 text-xs font-medium text-gray-600";
const removeClass = "shrink-0 rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600";
const comparison = (): GatingComparison => ({ kind: "comparison", field: "score", operator: "<", right: { kind: "literal", value: 0.7 } });
function LiteralInput({ value, onChange, field, operator, selected }: { value: unknown; onChange: (value: unknown) => void; field: GatingField; operator: GatingOperator; selected: GatingChildOption[] }) {
  const q = selected[0]?.question;
  const na = !!value && typeof value === "object" && !Array.isArray(value) && "notApplicable" in value;
  const options = selected.flatMap(child => child.question?.choices?.map(choice => ({ id: choice.id ?? "", label: `${choice.label}${selected.length > 1 ? ` (${child.code})` : ""}` })) ?? []);
  let control;
  if (field === "state") control = <select aria-label="State value" className={inputClass} value={String(value)} onChange={e => onChange(e.target.value)}>{["computed", "withheld", "flagForReview", ...(q ? ["unanswered", "unscored"] : [])].map(state => <option key={state} value={state}>{stateNames[state]}</option>)}</select>;
  else if (field === "answered" || field === "answer" && q?.type === "boolean") control = <select aria-label="Answer value" className={inputClass} disabled={na} value={String(value)} onChange={e => onChange(e.target.value === "true")}><option value="true">{field === "answered" ? "Answered" : "Yes"}</option><option value="false">{field === "answered" ? "Not answered" : "No"}</option></select>;
  else if (field === "answer" && ["multiple_choice", "multiple_selection"].includes(q?.type ?? "")) {
    const multiple = operator === "containsAny" || operator === "containsAll";
    control = <select aria-label="Answer option" multiple={multiple} disabled={na} className={inputClass} value={multiple ? Array.isArray(value) ? value as string[] : [] : typeof value === "string" ? value : ""} onChange={e => onChange(multiple ? Array.from(e.target.selectedOptions, option => option.value) : e.target.value)}>{!multiple && <option value="">Select an answer</option>}{options.map((option, i) => <option key={`${option.id}-${i}`} value={option.id}>{option.label}</option>)}</select>;
  } else if (field === "answer" && q?.type === "open_answer") control = <input aria-label="Answer text" disabled={na} className={inputClass} value={typeof value === "string" ? value : ""} onChange={e => onChange(e.target.value)} />;
  else control = <input aria-label="Numeric value" type="number" disabled={na} className={inputClass} step={field === "answer" ? 1 : "any"} min={field === "answer" ? q?.type === "likert" ? 1 : q?.rangeMin : 0} max={field === "score" ? 100 : field === "answer" ? q?.type === "likert" ? q.scalePointCount : q?.rangeMax : 100} value={typeof value === "number" && Number.isFinite(value) ? field === "score" ? Number((value * 100).toFixed(8)) : value : ""} onChange={e => onChange(field === "score" ? e.target.valueAsNumber / 100 : e.target.valueAsNumber)} />;
  return <div className="space-y-2">{control}{field === "state" && value === "computed" && <p className="text-xs font-normal leading-4 text-gray-500">Includes flagged scores.</p>}{field === "answer" && selected.length > 0 && selected.every(child => child.question?.allowNotApplicable) && <label className="flex items-center gap-2 text-xs font-normal text-gray-500"><input type="checkbox" checked={na} onChange={e => onChange(e.target.checked ? { notApplicable: true } : q?.type === "boolean" ? true : "")} />Compare with N/A response</label>}</div>;
}

function ReferenceField({ code, options, childType, onChange }: { code: string; options: GatingChildOption[]; childType: string; onChange: (code: string) => void }) {
  const selected = options.find(option => option.code === code);
  return <div className="mt-4 space-y-2 border-t border-gray-200/70 pt-4">
    <p className="text-xs font-medium text-gray-500">Reference {childType} <span className="sr-only">— Full code identifier</span></p>
    <Listbox value={code} onChange={onChange}>
      <ListboxButton aria-label={`Reference ${childType} — Full code identifier`} className={`${inputClass} flex items-center justify-between gap-3 text-left`}>
        <span className="min-w-0"><span className={`block text-sm font-medium ${selected ? "text-gray-900" : "text-red-700"}`}>{selected?.name || (selected ? "Unnamed element" : "Choose a valid reference")}</span><span className="mt-1 block break-all font-mono text-xs leading-5 text-gray-500">{code || "Select an element"}</span></span>
        <ChevronDownIcon className="h-4 w-4 shrink-0 text-gray-400" />
      </ListboxButton>
      <ListboxOptions anchor="bottom start" className="z-[60] max-h-72 w-[var(--button-width)] overflow-auto rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl [--anchor-gap:6px] focus:outline-none">
        {options.map(option => <ListboxOption key={option.code} value={option.code} className="cursor-pointer rounded-lg px-3 py-2.5 data-[focus]:bg-blue-50 data-[selected]:bg-blue-50/60">
          <span className="block text-sm font-medium text-gray-900">{option.name || "Unnamed element"}</span><span className="mt-0.5 block break-all font-mono text-xs leading-5 text-gray-500">{option.code}</span>
        </ListboxOption>)}
      </ListboxOptions>
    </Listbox>
  </div>;
}


export type ConditionPart = "selection" | "match" | "comparisons";
export default function GatingConditionEditor({ condition, part, childOptions: options, childType, groupIndex = 0, legacyState = false, onChange }: {
  condition: GatingChildCondition;
  part: ConditionPart;
  childOptions: GatingChildOption[];
  childType: string;
  groupIndex?: number;
  legacyState?: boolean;
  onChange: (condition: GatingChildCondition) => void;
}) {
  const c = groupIndex;
  const plural = `${childType}s`;
  const selected = condition.selection.codes ? options.filter(option => condition.selection.codes!.includes(option.code)) : options;
  const comparisons = condition.where.conditions;
  const updateComparison = (index: number, next: GatingComparison) => onChange({
    ...condition, where: { kind: "and", conditions: comparisons.map((old, i) => i === index ? next : old) },
  });
  if (legacyState && part === "selection") return <p className="text-sm text-gray-600">This child-state rule checks all visible {plural}.</p>;
  if (legacyState && part === "comparisons") return <label className={labelClass}>State
    <select className={inputClass} aria-label="State value" value={String(comparisons[0].right.kind === "literal" ? comparisons[0].right.value : "computed")}
      onChange={event => onChange({ ...condition, where: { kind: "and", conditions: [{ kind: "comparison", field: "state", operator: "is", right: { kind: "literal", value: event.target.value } }] } })}>
      <option value="computed">Score computed</option><option value="withheld">Withheld</option>
    </select><span className="block text-xs text-gray-500">Computed includes results flagged for review.</span>
  </label>;
  if (part === "selection") return <div className="space-y-3">
                <label className={labelClass}>Which {plural} should this group check?
                  <select aria-label={`Condition ${c + 1} selection`} className={inputClass} value={condition.selection.codes ? "specific" : "all"} onChange={event => onChange({ ...condition, selection: event.target.value === "all" ? {} : { codes: [] } })}><option value="all">All visible {plural}</option><option value="specific">Selected {plural}</option></select>
                </label>

              {condition.selection.codes && <fieldset className="space-y-2"><legend className="mb-2 text-xs font-medium text-gray-500">Select {plural} <span className="font-normal">({condition.selection.codes.length} selected)</span></legend><div className="max-h-52 space-y-1 overflow-y-auto rounded-lg border border-gray-200 p-1">
                {options.map(option => <label key={option.code} className={`flex cursor-pointer items-start gap-3 rounded-md px-3 py-2.5 ${condition.selection.codes!.includes(option.code) ? "bg-blue-50/70" : "hover:bg-gray-50"}`}><input type="checkbox" className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300 accent-blue-600" checked={condition.selection.codes!.includes(option.code)} onChange={event => onChange({ ...condition, selection: { codes: event.target.checked ? [...condition.selection.codes!, option.code] : condition.selection.codes!.filter(code => code !== option.code) } })} /><span className="min-w-0"><span className="block text-sm font-medium text-gray-800">{option.name || "Unnamed element"}</span><span className="mt-0.5 block break-all font-mono text-xs leading-5 text-gray-500">{option.code}</span></span></label>)}
              </div></fieldset>}
              {condition.selection.codes?.filter(code => !options.some(option => option.code === code)).map(code => <p key={code} className="break-all text-sm text-red-700">Missing reference: {code} <button type="button" className="underline" onClick={() => onChange({ ...condition, selection: { codes: condition.selection.codes!.filter(candidate => candidate !== code) } })}>Remove reference</button></p>)}
              {!options.length ? <p className="text-xs text-gray-600">Add {plural} to this element before defining a condition.</p> : !selected.length && <p className="text-xs text-gray-600">Select at least one {childType} to continue.</p>}

    <p className="text-xs text-gray-500">Only visible elements are checked. All visible elements includes future additions.</p>
  </div>;
  if (part === "match") return <div className="space-y-3">
    <label className={labelClass}>How many must meet all comparisons?
      <select aria-label={`Condition ${c + 1} match`} className={inputClass} value={condition.quantifier} onChange={event => onChange({ ...condition, quantifier: event.target.value as GatingChildCondition["quantifier"] })}>
        {Object.entries(quantifierNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
    </label>
    <p className="text-xs leading-5 text-gray-500">{emptySelectionDescription(condition.quantifier, childType)}</p>
  </div>;
  return <div className="space-y-3">
    <p className="text-xs text-gray-500">All comparisons apply to the same {childType}.</p>
                {condition.where.conditions.map((item, p) => {
                  const fields: GatingField[] = options[0]?.question ? ["score", "state", "answer", "answered"] : ["score", "state", "coverage", "includedCount"];
                  const questionType = selected[0]?.question?.type;
                  const operators: GatingOperator[] = item.field === "answer" && questionType === "multiple_selection" ? ["contains", "containsAny", "containsAll", ...(selected.every(option => option.question?.allowNotApplicable) ? ["==", "!="] as GatingOperator[] : [])] : item.field === "answer" && ["boolean", "multiple_choice", "open_answer"].includes(questionType ?? "") ? ["==", "!="] : item.field === "state" ? ["is", "isNot"] : item.field === "answered" ? ["==", "!="] : ["<", "<=", "==", "!=", ">=", ">"];
                  const numeric = ["score", "coverage", "includedCount"].includes(item.field);
                  return <div key={p}>
                    {p > 0 && <p className="mb-3 ml-3 text-[10px] font-semibold tracking-widest text-gray-400">AND</p>}
                    <div role="group" aria-label={`Condition ${c + 1}, comparison ${p + 1}`} className="rounded-xl bg-slate-50 p-3.5 sm:p-4">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span className="mr-auto text-xs font-medium text-gray-500">Comparison {p + 1}</span>
                        {numeric && <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5" role="group" aria-label={`Comparison ${p + 1} target`}>
                          {(["literal", "field"] as const).map(kind => <button key={kind} type="button" aria-pressed={item.right.kind === kind} className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${item.right.kind === kind ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:text-gray-900"}`} onClick={() => {
                            if (item.right.kind === kind) return;
                            updateComparison(p, { ...item, right: kind === "field" ? { kind: "field", code: options[0]?.code ?? "", field: item.field as "score" | "coverage" | "includedCount" } : { kind: "literal", value: item.field === "score" ? 0.7 : 70 } });
                          }}>{kind === "literal" ? "A value" : `Another ${childType}`}</button>)}
                        </div>}
                        {condition.where.conditions.length > 1 && <button type="button" aria-label={`Remove comparison ${p + 1} from condition ${c + 1}`} title="Remove comparison" className={removeClass} onClick={() => onChange({ ...condition, where: { kind: "and", conditions: condition.where.conditions.filter((_, i) => i !== p) } })}><TrashIcon className="h-4 w-4" /></button>}
                      </div>
                      <div className={`grid items-start gap-3 ${item.right.kind === "field" ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
                        <label className={labelClass}>Property
                          <select aria-label={`Condition ${c + 1} comparison ${p + 1} property`} className={inputClass} value={item.field} onChange={event => {
                            const field = event.target.value as GatingField, q = selected[0]?.question;
                            const answer = q?.type === "boolean" ? true : q?.type === "multiple_choice" || q?.type === "multiple_selection" ? q.choices?.[0]?.id ?? "" : q?.type === "likert" ? 1 : ["numeric", "percentage"].includes(q?.type ?? "") ? q?.rangeMin ?? 0 : "";
                            updateComparison(p, { kind: "comparison", field, operator: field === "state" ? "is" : field === "answer" && q?.type === "multiple_selection" ? "contains" : "==", right: { kind: "literal", value: field === "state" ? "computed" : field === "answered" ? true : field === "answer" ? answer : field === "score" ? 0.7 : 70 } });
                          }}>{fields.map(field => <option key={field} value={field}>{fieldNames[field]}</option>)}</select>
                        </label>
                        <label className={labelClass}>Comparison
                          <select aria-label={`Condition ${c + 1} comparison ${p + 1} operator`} className={inputClass} value={item.operator} onChange={event => updateComparison(p, { ...item, operator: event.target.value as GatingOperator })}>{!operators.includes(item.operator) && <option value={item.operator}>{operatorNames[item.operator]} (choose a valid comparison)</option>}{operators.map(operator => <option key={operator} value={operator}>{operatorNames[operator]}</option>)}</select>
                        </label>
                        {item.right.kind === "literal" && <div className={labelClass}><span>{item.field === "score" ? "Value (%)" : ["coverage", "includedCount"].includes(item.field) ? "Value (%)" : "Value"}</span><LiteralInput key={`${item.field}:${item.operator}`} field={item.field} operator={item.operator} selected={selected} value={item.right.value} onChange={newValue => updateComparison(p, { ...item, right: { kind: "literal", value: newValue } as GatingOperand })} /></div>}
                      </div>
                      {item.right.kind === "field" && <ReferenceField code={item.right.code} options={options} childType={childType} onChange={code => updateComparison(p, { ...item, right: { kind: "field", code, field: item.field as "score" | "coverage" | "includedCount" } })} />}
                    </div>
                  </div>;
                })}
                <button type="button" disabled={comparisons.length >= 50} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold text-blue-600 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50" onClick={() => onChange({ ...condition, where: { kind: "and", conditions: [...comparisons, comparison()] } })}><PlusIcon className="h-3.5 w-3.5" />{comparisons.length ? "Add comparison to this group" : "Add first comparison"}</button>

  </div>;
}
