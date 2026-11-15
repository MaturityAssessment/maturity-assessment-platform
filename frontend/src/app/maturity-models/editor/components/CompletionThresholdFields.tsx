import type { AggregationRule } from "@/api/types";
import { inputClass, labelClass } from "./FormFields";

type Thresholds = { minimumCoverage: number; minimumIncludedCount: number };

export default function CompletionThresholdFields({
  idPrefix, aggregationRule, isPractice, minimumCoverage, minimumIncludedCount, onChange,
}: Thresholds & {
  idPrefix: string;
  aggregationRule: AggregationRule;
  isPractice: boolean;
  onChange: (thresholds: Thresholds) => void;
}) {
  const weighted = aggregationRule === "WEIGHTED_AVERAGE";
  return <section aria-labelledby={`${idPrefix}-thresholds-title`} className="rounded-xl border border-slate-200 bg-slate-50/70 p-5">
    <h3 id={`${idPrefix}-thresholds-title`} className="text-base font-semibold text-gray-950">Completion thresholds</h3>
    <p className="mt-1 text-sm leading-6 text-gray-500">Baseline requirements for calculating a result. Falling below an active minimum withholds the score. Set a minimum to 0% to disable it.</p>
    <div className="mt-5 grid gap-5 sm:grid-cols-2">
      <label className={labelClass} htmlFor={`${idPrefix}-minimum-included-count`}>
        Minimum included count (%)
        <input id={`${idPrefix}-minimum-included-count`} type="number" min={0} max={100} step="any" className={inputClass}
          value={Number.isFinite(minimumIncludedCount) ? minimumIncludedCount : ""}
          aria-describedby={`${idPrefix}-count-help`}
          onChange={event => onChange({ minimumCoverage, minimumIncludedCount: event.target.valueAsNumber })} />
        <span id={`${idPrefix}-count-help`} className="text-xs font-normal leading-5 text-gray-500">
          {isPractice ? "Answered questions as a percentage of all questions shown, required and optional." : "Average completion of direct children; withheld children contribute zero."}
        </span>
      </label>
      <label className={labelClass} htmlFor={`${idPrefix}-minimum-coverage`}>
        Minimum coverage (%)
        <input id={`${idPrefix}-minimum-coverage`} type="number" min={0} max={100} step="any" disabled={!weighted}
          className={`${inputClass} disabled:bg-slate-100 disabled:text-gray-400`}
          value={Number.isFinite(minimumCoverage) ? minimumCoverage : ""}
          aria-describedby={`${idPrefix}-coverage-help`}
          onChange={event => onChange({ minimumCoverage: event.target.valueAsNumber, minimumIncludedCount })} />
        <span id={`${idPrefix}-coverage-help`} className="text-xs font-normal leading-5 text-gray-500">
          {weighted ? "Completion using direct-child weights." : "Applies to weighted mean only. The value is retained when you switch methods."}
        </span>
      </label>
    </div>
    <p className="mt-4 text-xs leading-5 text-gray-500">Equality with a minimum passes. A result without any scored children is always withheld.</p>
  </section>;
}
