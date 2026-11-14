import type { AggregationRule } from "@/api/types";
import { inputClass, labelClass } from "./FormFields";

type Thresholds = { minimumCoverage: number; minimumIncludedCount: number };

export default function GatingRuleField({
  idPrefix, aggregationRule, isPractice, minimumCoverage, minimumIncludedCount, onChange,
}: Thresholds & {
  idPrefix: string;
  aggregationRule: AggregationRule;
  isPractice: boolean;
  onChange: (thresholds: Thresholds) => void;
}) {
  const weightedMean = aggregationRule === "WEIGHTED_AVERAGE";
  return (
    <fieldset className="min-w-0">
      <legend className="text-lg font-semibold tracking-tight text-gray-950">Gating rules</legend>
      <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">
        Withhold this element when either active minimum is not met. A withheld element has no score or maturity level and its score is excluded from parent aggregation. Set a minimum to 0% to disable it.
      </p>
      <div className="mt-5 grid gap-6 rounded-xl border border-gray-200 bg-white p-4 @lg:p-5 @2xl:grid-cols-2">
        <label className={labelClass} htmlFor={`${idPrefix}-minimum-coverage`}>
          Minimum coverage (%)
          <input id={`${idPrefix}-minimum-coverage`} type="number" min="0" max="100" step="any"
            disabled={!weightedMean} className={`${inputClass} disabled:bg-gray-100 disabled:text-gray-500`}
            value={Number.isNaN(minimumCoverage) ? "" : minimumCoverage} onChange={(event) => onChange({ minimumCoverage: event.target.valueAsNumber, minimumIncludedCount })}
            aria-describedby={`${idPrefix}-coverage-help`} />
          <span id={`${idPrefix}-coverage-help`} className="text-xs font-normal leading-5 text-gray-500">
            {weightedMean ? "Coverage measures completion using direct-child weights." : "Coverage gating applies only to weighted mean. This minimum is retained if you change the aggregation method."}
          </span>
        </label>
        <label className={labelClass} htmlFor={`${idPrefix}-minimum-included-count`}>
          Minimum included count (%)
          <input id={`${idPrefix}-minimum-included-count`} type="number" min="0" max="100" step="any"
            className={inputClass} value={Number.isNaN(minimumIncludedCount) ? "" : minimumIncludedCount}
            onChange={(event) => onChange({ minimumCoverage, minimumIncludedCount: event.target.valueAsNumber })}
            aria-describedby={`${idPrefix}-included-count-help`} />
          <span id={`${idPrefix}-included-count-help`} className="text-xs font-normal leading-5 text-gray-500">
            {isPractice
              ? "Answered questions divided by all questions visible to the respondent. Required and optional questions both count; untriggered dependent questions do not."
              : "The mean of direct-child included-count percentages. Every child counts, including withheld children, which contribute zero."}
          </span>
        </label>
      </div>
      <p className="mt-3 text-xs leading-5 text-gray-500">A result equal to the minimum passes. An element with no included children is withheld even when both minima are disabled.</p>
    </fieldset>
  );
}
