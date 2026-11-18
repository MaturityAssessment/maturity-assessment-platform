import type { ScoreLimit } from "@/api/types";
import { scoreLimitIssues, scoreLimitLinked, type LimitOwner } from "../model/scoreLimits.ts";
import { inputClass } from "./FormFields";

export default function ScoreLimitFields({ owner, onChange }: { owner: LimitOwner; onChange: (limits: ScoreLimit[]) => void }) {
  const limits = owner.scoreLimits ?? [];
  const options = [
    ...(owner.childStateGatingRules ?? []).map((rule, i) => ({ label: rule.name || `Child-state rule ${i + 1}`, childStateRule: rule, conditionalRule: undefined })),
    ...(owner.conditionalGatingRules ?? []).map((rule, i) => ({ label: rule.name || `Conditional rule ${i + 1}`, childStateRule: undefined, conditionalRule: rule })),
  ].filter(option => (option.childStateRule ?? option.conditionalRule)?.effect === "flagForReview");
  const update = (index: number, limit: ScoreLimit) => onChange(limits.map((current, i) => i === index ? limit : current));
  return <section aria-label="Score limits" className="space-y-3 border-t border-gray-100 pt-5">
    <h3 className="text-lg font-semibold text-gray-950">Score limits</h3>
    <p className="text-sm text-gray-500">Link a floor or ceiling (0–1) to a Flag for Review rule. Matching rules apply the highest floor and lowest ceiling. A ceiling below the floor withholds the score. Editing a linked rule requires relinking its limits.</p>
    {limits.map((limit, i) => {
      const selected = options.findIndex(option => scoreLimitLinked(limit, {
        childStateGatingRules: option.childStateRule ? [option.childStateRule] : [],
        conditionalGatingRules: option.conditionalRule ? [option.conditionalRule] : [],
      }));
      return <div key={i} className="flex flex-wrap items-center gap-2">
        <select aria-label={`Score limit ${i + 1} rule`} className={`${inputClass} max-w-sm`} value={selected < 0 ? "" : selected}
          onChange={event => { const option = options[Number(event.target.value)]; if (option) update(i, { ...limit, childStateRule: structuredClone(option.childStateRule), conditionalRule: structuredClone(option.conditionalRule) }); }}>
          <option value="" disabled>Rule changed or removed — choose a flag rule</option>
          {options.map((option, index) => <option key={index} value={index}>{option.label}</option>)}
        </select>
        <select aria-label={`Score limit ${i + 1} type`} className={`${inputClass} max-w-32`} value={limit.kind}
          onChange={event => update(i, { ...limit, kind: event.target.value as ScoreLimit["kind"] })}>
          <option value="floor">Floor</option><option value="ceiling">Ceiling (cap)</option>
        </select>
        <input aria-label={`Score limit ${i + 1} value`} className={`${inputClass} max-w-28`} type="number" min={0} max={1} step="any"
          value={Number.isFinite(limit.value) ? limit.value : ""} onChange={event => update(i, { ...limit, value: event.target.value === "" ? NaN : Number(event.target.value) })} />
        <button type="button" className="text-sm text-red-700" aria-label={`Remove score limit ${i + 1}`} onClick={() => onChange(limits.filter((_, index) => index !== i))}>Remove</button>
      </div>;
    })}
    {scoreLimitIssues(owner).map(message => <p key={message} role="alert" className="text-sm text-red-700">{message}</p>)}
    <button type="button" disabled={!options.length || limits.length >= 100} className="text-sm font-medium text-blue-700 disabled:opacity-40"
      onClick={() => { const option = options[0]; if (option) onChange([...limits, { kind: "ceiling", value: 0.5, childStateRule: structuredClone(option.childStateRule), conditionalRule: structuredClone(option.conditionalRule) }]); }}>Add score limit</button>
    {!options.length && <p className="text-sm text-gray-500">Create a Flag for Review rule to add a score limit.</p>}
  </section>;
}
