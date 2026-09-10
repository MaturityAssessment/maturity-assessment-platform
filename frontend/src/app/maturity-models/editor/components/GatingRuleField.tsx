import {
  ArrowDownIcon,
  ArrowUpIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import type {
  GatingComparisonOperator,
  GatingRule,
  GatingScoreOperation,
  GatingSelection,
} from "@/api/types";
import { inputClass } from "./FormFields";

type ChildOption = { code: string; name: string };

function ordered(rules: GatingRule[]) {
  return rules.map((rule, order) => ({ ...rule, order }));
}

export default function GatingRuleField({
  idPrefix,
  childLabel,
  childOptions,
  value,
  onChange,
}: {
  idPrefix: string;
  childLabel: string;
  childOptions: ChildOption[];
  value: GatingRule[];
  onChange: (rules: GatingRule[]) => void;
}) {
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
    <fieldset className="md:col-span-2 rounded-lg border border-gray-200 p-4">
      <legend className="px-1 text-sm font-semibold text-gray-900">
        Gating rules
      </legend>
      <p className="mb-3 text-sm text-gray-500">
        Apply ordered constraints after aggregation using scored immediate {childLabel.toLowerCase()} only.
      </p>
      <div className="space-y-3">
        {value.map((rule, index) => (
          <div
            key={`${idPrefix}-gating-${index}`}
            className="rounded-md border border-gray-200 bg-gray-50 p-3"
          >
            <div className="flex flex-wrap items-end gap-2">
              <span className="self-center text-sm font-semibold text-gray-700">IF</span>
              <select
                aria-label={`Rule ${index + 1} child selection`}
                className={`${inputClass} w-auto min-w-36`}
                value={rule.selection}
                onChange={(event) => {
                  const selection = event.target.value as GatingSelection;
                  update(index, {
                    ...rule,
                    selection,
                    childCode:
                      selection === "specificChild"
                        ? rule.childCode || childOptions[0]?.code
                        : undefined,
                  });
                }}
              >
                <option value="specificChild">Specific {childLabel.slice(0, -1)}</option>
                <option value="anyChild">Any {childLabel.slice(0, -1)}</option>
                <option value="allChildren">All {childLabel}</option>
              </select>
              {rule.selection === "specificChild" && (
                <select
                  aria-label={`Rule ${index + 1} specific child`}
                  className={`${inputClass} w-auto min-w-40`}
                  value={rule.childCode ?? ""}
                  onChange={(event) =>
                    update(index, { ...rule, childCode: event.target.value })
                  }
                >
                  <option value="" disabled>Select {childLabel.slice(0, -1)}</option>
                  {childOptions.map((child) => (
                    <option key={child.code} value={child.code}>
                      {child.code} — {child.name || "Unnamed"}
                    </option>
                  ))}
                </select>
              )}
              <select
                aria-label={`Rule ${index + 1} comparison`}
                className={`${inputClass} w-20`}
                value={rule.operator}
                onChange={(event) =>
                  update(index, {
                    ...rule,
                    operator: event.target.value as GatingComparisonOperator,
                  })
                }
              >
                {(["<", "<=", "==", ">=", ">"] as const).map((operator) => (
                  <option key={operator} value={operator}>{operator}</option>
                ))}
              </select>
              <input
                aria-label={`Rule ${index + 1} threshold`}
                type="number"
                min="0"
                max="1"
                step="0.01"
                className={`${inputClass} w-24`}
                value={rule.threshold}
                onChange={(event) => update(index, { ...rule, threshold: Number(event.target.value) })}
              />
              <span className="self-center text-sm font-semibold text-gray-700">THEN score</span>
              <select
                aria-label={`Rule ${index + 1} score operation`}
                className={`${inputClass} w-auto`}
                value={rule.operation}
                onChange={(event) =>
                  update(index, {
                    ...rule,
                    operation: event.target.value as GatingScoreOperation,
                  })
                }
              >
                <option value="set">=</option>
                <option value="add">+</option>
                <option value="subtract">−</option>
              </select>
              <input
                aria-label={`Rule ${index + 1} operation value`}
                type="number"
                min="0"
                max="1"
                step="0.01"
                className={`${inputClass} w-24`}
                value={rule.value}
                onChange={(event) => update(index, { ...rule, value: Number(event.target.value) })}
              />
              <div className="ml-auto flex gap-1">
                <button type="button" aria-label={`Move rule ${index + 1} up`} disabled={index === 0} onClick={() => move(index, -1)} className="rounded p-2 text-gray-600 hover:bg-white disabled:opacity-30">
                  <ArrowUpIcon className="h-4 w-4" />
                </button>
                <button type="button" aria-label={`Move rule ${index + 1} down`} disabled={index === value.length - 1} onClick={() => move(index, 1)} className="rounded p-2 text-gray-600 hover:bg-white disabled:opacity-30">
                  <ArrowDownIcon className="h-4 w-4" />
                </button>
                <button type="button" aria-label={`Delete rule ${index + 1}`} onClick={() => onChange(ordered(value.filter((_, i) => i !== index)))} className="rounded p-2 text-red-600 hover:bg-red-50">
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        disabled={!childOptions.length}
        onClick={() =>
          onChange([
            ...value,
            {
              order: value.length,
              selection: "specificChild",
              childCode: childOptions[0]?.code,
              operator: "<",
              threshold: 0.5,
              operation: "set",
              value: 0.5,
            },
          ])
        }
        className="mt-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        <PlusIcon className="mr-1.5 h-4 w-4" /> Add gating rule
      </button>
    </fieldset>
  );
}
