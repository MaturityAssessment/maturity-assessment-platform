import ConditionalGatingField from "./ConditionalGatingField";
import type { GatingChildOption } from "../model/conditionalGating";
import type { AggregationRule, ChildStateGatingRule, ConditionalGatingRule } from "@/api/types";
import { inputClass, labelClass } from "./FormFields";

type Thresholds = { minimumCoverage: number; minimumIncludedCount: number; conditionalGatingRules?: ConditionalGatingRule[]; childStateGatingRules?: ChildStateGatingRule[] };

export default function GatingRuleField({
  idPrefix, aggregationRule, isPractice, minimumCoverage, minimumIncludedCount, childType = "question", childStateGatingRules = [], conditionalGatingRules = [], childOptions = [], onChange,
}: Thresholds & {
  idPrefix: string;
  aggregationRule: AggregationRule;
  isPractice: boolean;
  childOptions?: GatingChildOption[];
  childType?: "question" | "practice" | "module";
  onChange: (thresholds: Thresholds) => void;
}) {
  const weightedMean = aggregationRule === "WEIGHTED_AVERAGE";
  const updateRules = (rules: ChildStateGatingRule[]) => onChange({ minimumCoverage, minimumIncludedCount, childStateGatingRules: rules });
  const updateRule = (index: number, change: Partial<ChildStateGatingRule>) => updateRules(childStateGatingRules.map((rule, position) => position === index ? { ...rule, ...change } : rule));
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
      <section className="mt-6 space-y-4" aria-label="Child-state gating rules">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-semibold text-gray-950">Child-state rules</h3>
          <button type="button" className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            onClick={() => updateRules([...childStateGatingRules, { quantifier: "any", state: "withheld", effect: "flagForReview" }])}>Add child-state rule</button>
        </div>
        <p className="text-sm leading-6 text-gray-500">Check visible direct children. Flag for review retains scoring and counts as score computed. Withhold always takes precedence, including when a minimum fails.</p>
        {childStateGatingRules.length === 0 && <p className="text-sm text-gray-500">No child-state rules.</p>}
        {childStateGatingRules.map((rule, index) => <fieldset key={index} className="rounded-xl border border-gray-200 bg-white p-4">
          <legend className="px-1 text-sm font-semibold">Rule {index + 1}</legend>
          <div className="flex flex-wrap items-end gap-3">
            <label className={labelClass}>If
              <select className={inputClass} aria-label={`Rule ${index + 1} quantifier`} value={rule.quantifier} onChange={event => updateRule(index, { quantifier: event.target.value as ChildStateGatingRule["quantifier"] })}>
                <option value="any">Any {childType}</option><option value="every">Every {childType}</option><option value="no">No {childType}</option>
              </select>
            </label>
            <label className={labelClass}>Has state equal to
              <select className={inputClass} aria-label={`Rule ${index + 1} child state`} value={rule.state} onChange={event => updateRule(index, { state: event.target.value as ChildStateGatingRule["state"] })}>
                <option value="computed">Score computed</option><option value="withheld">Withhold</option>
              </select>
            </label>
            <label className={labelClass}>Set this element’s state to
              <select className={inputClass} aria-label={`Rule ${index + 1} effect`} value={rule.effect} onChange={event => updateRule(index, { effect: event.target.value as ChildStateGatingRule["effect"] })}>
                <option value="withheld">Withhold</option><option value="flagForReview">Flag for review</option>
              </select>
            </label>
            <button type="button" className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50" aria-label={`Delete child-state rule ${index + 1}`} onClick={() => updateRules(childStateGatingRules.filter((_, position) => position !== index))}>Delete</button>
          </div>
        </fieldset>)}
      </section>
      <ConditionalGatingField value={conditionalGatingRules} childOptions={childOptions} childType={childType} onChange={rules => onChange({ minimumCoverage, minimumIncludedCount, childStateGatingRules, conditionalGatingRules: rules })} />
      <p className="mt-3 text-xs leading-5 text-gray-500">A result equal to the minimum passes. An element with no included children is withheld even when both minima are disabled.</p>
    </fieldset>
  );
}
