import type { AggregationRule } from "@/api/types";
import { inputClass, labelClass } from "./FormFields";

const AGGREGATION_RULES: Array<{
  value: AggregationRule;
  label: string;
  description: string;
}> = [
  { value: "AVERAGE", label: "Average", description: "Give every child score equal importance." },
  { value: "WEIGHTED_AVERAGE", label: "Weighted average", description: "Use each child's weight when combining scores." },
  { value: "MINIMUM", label: "Minimum", description: "Use the lowest child score." },
  { value: "MAXIMUM", label: "Maximum", description: "Use the highest child score." },
  { value: "SUM", label: "Sum", description: "Add all child scores together." },
  { value: "MEDIAN", label: "Median", description: "Use the middle value of the sorted scores." },
];

export default function AggregationRuleField({
  id,
  label = "Aggregation rule",
  value,
  onChange,
  cards = false,
}: {
  id: string;
  label?: string;
  value: AggregationRule;
  onChange: (rule: AggregationRule) => void;
  cards?: boolean;
}) {
  if (cards) {
    return (
      <fieldset>
        <legend className="mb-3 text-sm font-semibold text-gray-900">{label}</legend>
        <div className="grid gap-3 @lg:grid-cols-2">
          {AGGREGATION_RULES.map((rule) => (
            <label key={rule.value} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition focus-within:ring-2 focus-within:ring-blue-500 ${value === rule.value ? "border-blue-500 bg-blue-50/60" : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"}`}>
              <input
                type="radio"
                name={id}
                value={rule.value}
                checked={value === rule.value}
                onChange={() => onChange(rule.value)}
                className="mt-0.5 h-4 w-4 shrink-0 border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>
                <span className="block text-sm font-semibold text-gray-900">{rule.label}</span>
                <span className="mt-1 block text-xs leading-5 text-gray-500">{rule.description}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
    );
  }
  return (
    <label className={labelClass} htmlFor={id}>
      {label}
      <select
        id={id}
        className={inputClass}
        value={value}
        onChange={(event) => onChange(event.target.value as AggregationRule)}
      >
        {AGGREGATION_RULES.map((rule) => (
          <option key={rule.value} value={rule.value}>
            {rule.label}
          </option>
        ))}
      </select>
    </label>
  );
}
