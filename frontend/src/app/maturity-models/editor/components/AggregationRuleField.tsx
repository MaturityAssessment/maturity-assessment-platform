import type { AggregationRule } from "@/api/types";
import { inputClass, labelClass } from "./FormFields";

const AGGREGATION_RULES: Array<{
  value: AggregationRule;
  label: string;
}> = [
  { value: "AVERAGE", label: "Average" },
  { value: "WEIGHTED_AVERAGE", label: "Weighted average" },
  { value: "MINIMUM", label: "Minimum" },
  { value: "MAXIMUM", label: "Maximum" },
  { value: "SUM", label: "Sum" },
  { value: "MEDIAN", label: "Median" },
];

export default function AggregationRuleField({
  id,
  label = "Aggregation rule",
  value,
  onChange,
}: {
  id: string;
  label?: string;
  value: AggregationRule;
  onChange: (rule: AggregationRule) => void;
}) {
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
