import { useState } from "react";
import { CloseButton, Popover, PopoverBackdrop, PopoverButton, PopoverPanel } from "@headlessui/react";
import { ChevronRightIcon, PencilSquareIcon, PlusIcon } from "@heroicons/react/24/outline";
import type { ConditionalGatingRule, GatingChildCondition } from "@/api/types";
import { conditionalGatingIssues, type GatingChildOption } from "../model/conditionalGating";
import { comparisonLabel, gatingConsequence } from "../model/gatingRuleLabels";
import GatingConditionEditor, { type ConditionPart } from "./GatingConditionEditor";

export const emptyCondition = (): GatingChildCondition => ({
  kind: "children", quantifier: "any", selection: {}, where: { kind: "and", conditions: [] },
});

export function selectionLabel(group: GatingChildCondition, options: GatingChildOption[], childType: string) {
  if (!group.selection.codes) return `All visible ${childType}s`;
  return group.selection.codes.map(code => options.find(option => option.code === code)?.name || code).join(", ") || "Select elements";
}

export function matchLabel(group: GatingChildCondition, childType: string) {
  return { any: `At least one ${childType}`, every: `Every ${childType}`, no: `None of the ${childType}s` }[group.quantifier];
}

const laneClass = "lg:grid lg:grid-cols-[6rem_minmax(0,1fr)_1rem_minmax(0,1fr)_1rem_minmax(0,1.2fr)] lg:items-stretch lg:gap-2";
const summaryValueClass = "rounded bg-blue-50 px-1 py-0.5 font-medium text-blue-800";
const parts: ConditionPart[] = ["selection", "match", "comparisons"];

export default function ConditionalGatingField({ value = [], childOptions, childType, onChange, embedded = false, legacyState = false }: {
  embedded?: boolean;
  value?: ConditionalGatingRule[];
  childOptions: GatingChildOption[];
  childType: string;
  legacyState?: boolean;
  onChange: (rules: ConditionalGatingRule[]) => void;
}) {
  const [expanded, setExpanded] = useState(0);
  const update = (index: number, rule: ConditionalGatingRule) => onChange(value.map((old, i) => i === index ? rule : old));
  const owner = { question: "practice", practice: "module", module: "dimension" }[childType] || "element";
  const partTitle = (part: ConditionPart) => ({ selection: `Which ${childType}s`, match: "How many", comparisons: "What must be true" })[part];

  return <section aria-label="Conditional gating rules" className="space-y-4">
    {!embedded && <button type="button" onClick={() => onChange([...value, { version: 1, effect: "flagForReview", when: { kind: "and", conditions: [emptyCondition()] } }])}>Add conditional rule</button>}
    {value.map((rule, ruleIndex) => {
      const errors = legacyState ? [] : conditionalGatingIssues([rule], childOptions);
      const singleLane = rule.when.conditions.length === 1;
      return <div key={ruleIndex} className="space-y-4">
        <div className="flex items-baseline justify-between gap-3 lg:hidden"><h3 className="font-semibold">When</h3><p className="text-xs text-gray-500">All conditions must match</p></div>
        <div className={`grid gap-5 ${singleLane ? "lg:grid-cols-1 lg:gap-4" : "lg:grid-cols-[minmax(0,1fr)_2rem_14rem] lg:gap-0"}`}>
          <div className="order-1 min-w-0">
            <div aria-hidden="true" className={`${laneClass} mb-2 hidden text-xs font-medium text-gray-600 lg:grid`}>
              <span /><span>1 · Which {childType}s</span><span /><span>2 · How many</span><span /><span>3 · What must be true</span>
            </div>
            <ol className="space-y-4 lg:space-y-2">
              {rule.when.conditions.map((group, groupIndex) => {
                const selected = group.selection.codes ? childOptions.filter(option => group.selection.codes!.includes(option.code)) : childOptions;
                const selectionReady = selected.length > 0 && (!group.selection.codes || selected.length === group.selection.codes.length);
                const summary = group.where.conditions.map(item => comparisonLabel(item, childOptions)).join(" AND ") || "Add comparison";
                return <li key={groupIndex}>
                  {groupIndex > 0 && <div className="mb-4 flex items-center gap-3 text-xs font-medium text-gray-500 lg:hidden"><span className="h-px flex-1 bg-gray-200" />AND<span className="h-px flex-1 bg-gray-200" /></div>}
                  <div aria-label={`Condition group ${groupIndex + 1}`} className={`${laneClass} rounded-xl border border-slate-200 bg-slate-50/80 p-3`}>
                    <div className="mb-3 flex items-center justify-between gap-2 lg:mb-0 lg:block lg:py-2">
                      <h4 className="text-sm font-semibold text-gray-950">Condition {groupIndex + 1}</h4>
                      <div className="flex gap-3 lg:mt-1">
                        {!legacyState && rule.when.conditions.length > 1 && <button type="button" aria-label={`Remove selection condition ${groupIndex + 1}`} className="rounded-md border border-red-100 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 transition hover:border-red-200 hover:bg-red-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600" onClick={() => {
                          update(ruleIndex, { ...rule, when: { kind: "and", conditions: rule.when.conditions.filter((_, i) => i !== groupIndex) } });
                          setExpanded(Math.min(groupIndex, rule.when.conditions.length - 2));
                        }}>Remove</button>}
                        {expanded !== groupIndex && <button type="button" className="text-xs font-medium text-blue-700 lg:hidden" onClick={() => setExpanded(groupIndex)}>Edit</button>}
                      </div>
                    </div>
                    {parts.map((part, partIndex) => <div key={part} className={`min-w-0 ${partIndex > 0 ? "lg:contents" : ""} ${expanded !== groupIndex ? "hidden lg:block" : ""}`}>
                      {partIndex > 0 && <span aria-hidden="true" className="hidden items-center justify-center text-blue-500 lg:flex">›</span>}
                      <Popover className="relative mb-2 min-w-0 pl-7 last:mb-0 lg:mb-0 lg:pl-0">
                        <span aria-hidden="true" className="absolute left-0 top-6 flex h-5 w-5 items-center justify-center rounded-full border border-blue-600 bg-white text-xs text-blue-700 lg:hidden">{partIndex + 1}</span>
                        <PopoverButton disabled={legacyState && part === "selection" || part !== "selection" && !selectionReady && !legacyState}
                          aria-label={`Edit condition ${groupIndex + 1} ${partTitle(part).toLowerCase()}`}
                          title={part === "selection" ? group.selection.codes?.join(", ") : undefined}
                          className="group flex min-h-[4.5rem] w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white p-3 text-left shadow-sm transition hover:border-blue-400 hover:bg-blue-50/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 disabled:cursor-default disabled:opacity-60 data-[open]:border-blue-600 data-[open]:bg-blue-50/50">
                          <span className="min-w-0">
                            <span className="mb-1 block text-xs text-gray-500">{part === "selection" ? "Applies to" : part === "match" ? "Must match" : `Same ${childType}, all true`}</span>
                            <span className="block break-words text-sm leading-5 text-gray-950">{part === "selection" ? selectionLabel(group, childOptions, childType) : part === "match" ? matchLabel(group, childType) : summary}</span>
                          </span>
                          <PencilSquareIcon aria-hidden="true" className="hidden h-4 w-4 shrink-0 text-gray-400 group-hover:text-blue-600 group-disabled:invisible lg:block" />
                          <ChevronRightIcon aria-hidden="true" className="h-4 w-4 shrink-0 text-blue-600 lg:hidden" />
                        </PopoverButton>
                        <PopoverBackdrop className="fixed inset-0 z-[65] bg-gray-950/40 sm:hidden" />
                        <PopoverPanel anchor="bottom end" focus modal className="z-[70] w-[min(34rem,calc(100vw-2rem))] rounded-xl border border-gray-200 bg-white p-4 shadow-xl [--anchor-gap:10px] max-sm:!fixed max-sm:!inset-x-0 max-sm:!bottom-0 max-sm:!top-auto max-sm:!w-full max-sm:rounded-b-none max-sm:rounded-t-2xl max-sm:pb-[max(1rem,env(safe-area-inset-bottom))]">
                          <div className="mb-4 text-sm font-semibold text-gray-950">Condition {groupIndex + 1} · {partTitle(part)}</div>
                          <div className="max-h-[65dvh] space-y-3 overflow-y-auto p-0.5">
                            <GatingConditionEditor condition={group} part={part} childType={childType} childOptions={childOptions} groupIndex={groupIndex} legacyState={legacyState} onChange={next => update(ruleIndex, {
                              ...rule, when: { kind: "and", conditions: rule.when.conditions.map((old, i) => i === groupIndex ? next : old) },
                            })} />
                          </div>
                          <div className="mt-4 flex justify-end"><CloseButton className="min-h-11 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 max-sm:w-full">Done</CloseButton></div>
                        </PopoverPanel>
                      </Popover>
                    </div>)}
                    {expanded !== groupIndex && <p className="text-sm leading-6 text-gray-600 lg:hidden">{matchLabel(group, childType)} of {selectionLabel(group, childOptions, childType)} must meet {summary.toLowerCase()}.</p>}
                  </div>
                </li>;
              })}
            </ol>

          </div>
          {!singleLane && <div aria-hidden="true" className="relative order-2 hidden items-center justify-center lg:flex">
            <span className="absolute bottom-5 left-0 top-12 w-1/2 rounded-r border-y border-r border-slate-400" />
            <span className="absolute left-1/2 right-0 top-1/2 h-px bg-slate-400" />
            <span className="relative z-10 rounded border border-slate-200 bg-white px-1 py-0.5 text-xs font-semibold text-gray-700">AND</span>
          </div>}
          <fieldset className={`order-3 min-w-0 ${singleLane ? "grid gap-3 sm:grid-cols-2" : "space-y-2"}`}>
            <legend className="mb-2 text-sm font-semibold text-gray-900">Then</legend>
            {(["flagForReview", "withheld"] as const).map(effect => <label key={effect} className={`block cursor-pointer rounded-lg border p-3 focus-within:ring-2 focus-within:ring-blue-600 ${rule.effect === effect ? "border-blue-600 bg-blue-50/30 ring-1 ring-blue-600" : "border-slate-200 bg-white"}`}>
              <input type="radio" name={`gating-effect-${ruleIndex}`} className="sr-only" checked={rule.effect === effect} onChange={() => update(ruleIndex, { ...rule, effect })} />
              <span className="block text-sm font-semibold text-gray-950">{effect === "withheld" ? "Withhold" : "Flag for review"}<span className="sr-only"> this {owner}</span></span>
              <span className="mt-1 block text-xs leading-5 text-gray-600">{effect === "withheld" ? "Removes the score and excludes it from the total." : "Keeps the score and its contribution to the total."}</span>
            </label>)}
            <p className={`text-xs leading-5 text-gray-500 ${singleLane ? "sm:col-span-2" : ""}`}>Withhold rules always take precedence.</p>
          </fieldset>
            <div className={`order-2 lg:order-4 ${singleLane ? "" : "lg:col-span-3 lg:mt-4"}`}>        {!legacyState && <button type="button" disabled={rule.when.conditions.length >= 50} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-2 text-sm text-blue-700 hover:bg-blue-50 disabled:opacity-50" onClick={() => {
          setExpanded(rule.when.conditions.length);
          update(ruleIndex, { ...rule, when: { kind: "and", conditions: [...rule.when.conditions, emptyCondition()] } });
        }}><PlusIcon aria-hidden="true" className="h-4 w-4" />Add condition lane</button>}
            </div>
        </div>
        <div aria-label="Rule in plain words" className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-gray-600">
          <p className="mb-1 font-semibold text-gray-900">In plain words</p>
          {rule.when.conditions.map((group, index) => <p key={index}>
            {index > 0 && <span className="mr-1 font-medium text-gray-600">AND</span>}
            Among <span className={summaryValueClass}>{selectionLabel(group, childOptions, childType)}</span>, {" "}
            <span className={summaryValueClass}>{matchLabel(group, childType).toLowerCase()}</span> must match {" "}
            {group.where.conditions.length ? group.where.conditions.map((item, comparisonIndex) => <span key={comparisonIndex}>
              {comparisonIndex > 0 && " AND "}<span className={summaryValueClass}>{comparisonLabel(item, childOptions)}</span>
            </span>) : <span className={summaryValueClass}>a comparison</span>}.
          </p>)}
          <p>Then {rule.effect === "withheld" ? "withhold" : "flag"} this {owner}{rule.effect === "flagForReview" ? " for review" : ""}.</p>
        </div>
        {errors.length > 0 && <div aria-live="polite" className="text-xs text-red-700">{errors.map(error => <p key={error}>{error}</p>)}</div>}
        <details className="text-xs text-gray-500"><summary className="cursor-pointer">Outcome details</summary><p className="mt-2">{gatingConsequence(rule.effect)}</p></details>
      </div>;
    })}
  </section>;
}
