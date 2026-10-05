import { Listbox, ListboxButton, ListboxLabel, ListboxOption, ListboxOptions } from "@headlessui/react";
import { ArrowDownIcon, ArrowUpIcon, ChevronDownIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import type { GatingComparisonOperator, GatingRule, GatingScoreOperation, GatingSelection } from "@/api/types";
import { inputClass, labelClass } from "./FormFields";

type ChildOption = { code: string; name: string };
function ChildReference({ name, code }: ChildOption) {
  return <span className="flex min-w-0 flex-1 items-baseline gap-2">
    <span className="truncate">{name || "Unnamed"}</span>
    <span className="truncate font-mono text-xs font-normal text-gray-400">{code}</span>
  </span>;
}
const actionClass = "rounded-md p-2 text-gray-500 outline-none hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-30";
const comparisons: Array<[GatingComparisonOperator, string]> = [
  ["<", "Less than (<)"], ["<=", "At most (≤)"], ["==", "Equal to (=)"],
  [">=", "At least (≥)"], [">", "Greater than (>)"],
];

function ordered(rules: GatingRule[]) {
  return rules.map((rule, order) => ({ ...rule, order }));
}

export default function GatingRuleField({
  idPrefix, childLabel, childOptions, value, onChange,
}: {
  idPrefix: string;
  childLabel: string;
  childOptions: ChildOption[];
  value: GatingRule[];
  onChange: (rules: GatingRule[]) => void;
}) {
  const child = childLabel.toLowerCase().slice(0, -1);
  const parent = child === "module" ? "dimension" : child === "practice" ? "module" : "practice";
  const preview = (rule: GatingRule) => {
    const selected = childOptions.find((option) => option.code === rule.childCode);
    const subject = rule.selection === "allChildren"
      ? `all ${childLabel.toLowerCase()} have scores`
      : rule.selection === "anyChild"
        ? `any ${child} has a score`
        : `${child} ${selected?.name || selected?.code || "(select an element)"} has a score`;
    const comparison = { "<": "below", "<=": "at most", "==": "equal to", ">=": "at least", ">": "above" }[rule.operator];
    const operation = { set: "set to", add: "increased by", subtract: "decreased by" }[rule.operation];
    return `When ${subject} ${comparison} ${rule.threshold}, then this ${parent} score is ${operation} ${rule.value}.`;
  };
  const update = (index: number, rule: GatingRule) =>
    onChange(ordered(value.map((candidate, i) => (i === index ? rule : candidate))));
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= value.length) return;
    const copy = [...value];
    [copy[index], copy[target]] = [copy[target], copy[index]];
    onChange(ordered(copy));
  };

  return (
    <fieldset className="@container min-w-0 md:col-span-2">
      <legend className="sr-only">Gating rules</legend>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1 basis-64">
          <h3 className="text-lg font-semibold tracking-tight text-gray-950">Gating rules</h3>
          <p className="mt-1 text-sm leading-6 text-gray-500">
            Adjust the score when a condition is met. Rules run from top to bottom after aggregation, using scored {childLabel.toLowerCase()} only.
          </p>
        </div>
        <button
          type="button"
          disabled={!childOptions.length}
          onClick={() => onChange([...value, {
            order: value.length, selection: "specificChild", childCode: childOptions[0]?.code,
            operator: "<", threshold: 0.5, operation: "set", value: 0.5,
          }])}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white outline-none hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <PlusIcon className="h-4 w-4" /> Add rule
        </button>
      </div>
      {!childOptions.length && (
        <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Add a {child} before creating a gating rule.</p>
      )}
      {!value.length ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50/70 px-6 py-10 text-center">
          <p className="text-sm font-semibold text-gray-900">No gating rules</p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-gray-500">The aggregated score is used as it is. Add a rule when a condition should change that score.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs leading-5 text-gray-500">Scores use a 0–1 scale. For example, 0.5 represents 50%.</p>
          {value.map((rule, index) => (
            <div key={`${idPrefix}-gating-${index}`} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <div className="flex items-center justify-between gap-3 border-b border-gray-100 bg-gray-50/70 px-4 py-2.5">
                <div className="flex min-w-0 flex-1 flex-col gap-2 @2xl:flex-row @2xl:items-center @2xl:gap-4">
                  <h4 className="flex shrink-0 items-center gap-2 text-sm font-semibold text-gray-900">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white text-xs tabular-nums text-gray-600">{index + 1}</span>
                    Rule {index + 1}
                  </h4>
                  <p className="text-xs leading-5 text-gray-500">{preview(rule)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button type="button" aria-label={`Move rule ${index + 1} up`} title="Move up" disabled={index === 0} onClick={() => move(index, -1)} className={actionClass}><ArrowUpIcon className="h-4 w-4" /></button>
                  <button type="button" aria-label={`Move rule ${index + 1} down`} title="Move down" disabled={index === value.length - 1} onClick={() => move(index, 1)} className={actionClass}><ArrowDownIcon className="h-4 w-4" /></button>
                  <button type="button" aria-label={`Delete rule ${index + 1}`} title="Delete rule" onClick={() => onChange(ordered(value.filter((_, i) => i !== index)))} className={`${actionClass} ml-2 text-red-600 hover:bg-red-50`}><TrashIcon className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="space-y-5 p-4 @lg:p-5">
                <fieldset>
                  <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">When</legend>
                  <div className="grid gap-4 @lg:grid-cols-2">
                    <label className={`${labelClass} ${rule.selection !== "specificChild" ? "@lg:col-span-2" : ""}`}>
                      Check scores from
                      <select
                        aria-label={`Rule ${index + 1} child selection`}
                        className={inputClass}
                        value={rule.selection}
                        onChange={(event) => {
                          const selection = event.target.value as GatingSelection;
                          update(index, { ...rule, selection, childCode: selection === "specificChild" ? rule.childCode || childOptions[0]?.code : undefined });
                        }}
                      >
                        <option value="specificChild">A specific {child}</option>
                        <option value="anyChild">Any {child}</option>
                        <option value="allChildren">All {childLabel.toLowerCase()}</option>
                      </select>
                    </label>
                    {rule.selection === "specificChild" && (
                      <Listbox as="div" className={labelClass} value={rule.childCode ?? ""} onChange={(childCode) => update(index, { ...rule, childCode })}>
                        <ListboxLabel>{childLabel.slice(0, -1)}</ListboxLabel>
                        <ListboxButton aria-label={`Rule ${index + 1} specific child`} className={`${inputClass} flex items-center gap-2 text-left`}>
                          {rule.childCode ? <ChildReference code={rule.childCode} name={childOptions.find((option) => option.code === rule.childCode)?.name ?? ""} /> : <span className="flex-1">Select {child}</span>}
                          <ChevronDownIcon className="h-4 w-4 shrink-0 text-gray-400" />
                        </ListboxButton>
                        <ListboxOptions anchor="bottom start" className="z-50 max-h-64 w-[var(--button-width)] overflow-auto rounded-md border border-gray-200 bg-white p-1 shadow-lg [--anchor-gap:4px] focus:outline-none">
                          {childOptions.map((option) => (
                            <ListboxOption key={option.code} value={option.code} className="flex cursor-pointer items-center rounded px-2 py-2 text-sm text-gray-900 data-[focus]:bg-blue-50 data-[selected]:font-semibold">
                              <ChildReference {...option} />
                            </ListboxOption>
                          ))}
                        </ListboxOptions>
                      </Listbox>
                    )}
                    <label className={labelClass}>
                      Score comparison
                      <select aria-label={`Rule ${index + 1} comparison`} className={inputClass} value={rule.operator} onChange={(event) => update(index, { ...rule, operator: event.target.value as GatingComparisonOperator })}>
                        {comparisons.map(([operator, label]) => <option key={operator} value={operator}>{label}</option>)}
                      </select>
                    </label>
                    <label className={labelClass}>
                      Threshold (0–1)
                      <input aria-label={`Rule ${index + 1} threshold`} type="number" min="0" max="1" step="0.01" className={inputClass} value={rule.threshold} onChange={(event) => update(index, { ...rule, threshold: Number(event.target.value) })} />
                    </label>
                  </div>
                </fieldset>
                <fieldset className="border-t border-gray-100 pt-5">
                  <legend className="sr-only">Then</legend>
                  <p aria-hidden="true" className="mb-3 text-xs font-semibold uppercase tracking-wider text-blue-700">Then</p>
                  <div className="grid gap-4 @lg:grid-cols-2">
                    <label className={labelClass}>
                      Adjust the score
                      <select aria-label={`Rule ${index + 1} score operation`} className={inputClass} value={rule.operation} onChange={(event) => update(index, { ...rule, operation: event.target.value as GatingScoreOperation })}>
                        <option value="set">Set score to</option>
                        <option value="add">Add to score</option>
                        <option value="subtract">Subtract from score</option>
                      </select>
                    </label>
                    <label className={labelClass}>
                      Value (0–1)
                      <input aria-label={`Rule ${index + 1} operation value`} type="number" min="0" max="1" step="0.01" className={inputClass} value={rule.value} onChange={(event) => update(index, { ...rule, value: Number(event.target.value) })} />
                    </label>
                  </div>
                </fieldset>
              </div>
            </div>
          ))}
        </div>
      )}
    </fieldset>
  );
}
