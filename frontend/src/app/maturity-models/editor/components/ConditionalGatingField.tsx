import { useState, useEffect, useRef } from "react";
import type { ConditionalGatingRule, GatingChildCondition, GatingComparison, GatingField, GatingOperand, GatingOperator } from "@/api/types";
import { conditionalGatingIssues, type GatingChildOption } from "../model/conditionalGating";
import { inputClass, labelClass } from "./FormFields";

const comparison = (): GatingComparison => ({ kind: "comparison", field: "score", operator: "<", right: { kind: "literal", value: 0.7 } });
const clause = (): GatingChildCondition => ({ kind: "children", quantifier: "any", selection: {}, where: { kind: "and", conditions: [comparison()] } });
function LiteralInput({ value, onChange }: { value: unknown; onChange: (value: unknown) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const lastSent = useRef(JSON.stringify(value));
  useEffect(() => { if (JSON.stringify(value) !== lastSent.current) { setDraft(null); setInvalid(false); lastSent.current = JSON.stringify(value); } }, [value]);
  return <div>
    <input aria-label="Literal value (JSON)" className={inputClass} value={draft ?? JSON.stringify(value)} aria-invalid={invalid}
      onChange={event => { const text = event.target.value; setDraft(text); try { const parsed: unknown = JSON.parse(text); lastSent.current = JSON.stringify(parsed); onChange(parsed); setInvalid(false); } catch { lastSent.current = "null"; onChange(null); setInvalid(true); } }}
      onBlur={() => { if (!invalid) setDraft(null); }} />
    {invalid && <p role="alert" className="text-xs text-red-700">Enter a valid JSON value. This rule cannot be saved yet.</p>}
  </div>;
}
export default function ConditionalGatingField({ value = [], childOptions: options, childType, onChange }: {
  value?: ConditionalGatingRule[]; childOptions: GatingChildOption[]; childType: string;
  onChange: (rules: ConditionalGatingRule[]) => void;
}) {
  const errors = conditionalGatingIssues(value, options);
  const update = (r: number, rule: ConditionalGatingRule) => onChange(value.map((existing, i) => i === r ? rule : existing));
  const updateClause = (r: number, c: number, next: GatingChildCondition) => update(r, { ...value[r], when: { kind: "and", conditions: value[r].when.conditions.map((old, i) => i === c ? next : old) } });
  const updateComparison = (r: number, c: number, p: number, next: GatingComparison) => {
    const current = value[r].when.conditions[c];
    updateClause(r, c, { ...current, where: { kind: "and", conditions: current.where.conditions.map((old, i) => i === p ? next : old) } });
  };
  return <section className="mt-8 space-y-4" aria-label="Conditional gating rules">
    <h3 className="font-semibold text-gray-950">Conditional rules</h3>
    <p className="text-sm text-gray-600">All selection conditions must pass. Within one selection, the same {childType} must meet every comparison. Only visible direct children are evaluated. Withhold always takes precedence.</p>
    <button type="button" className="rounded border px-3 py-2 text-sm" onClick={() => onChange([...value, { version: 1, when: { kind: "and", conditions: [clause()] }, effect: "flagForReview" }])}>Add conditional rule</button>
    {errors.length > 0 && <div role="alert" className="space-y-1 text-sm text-red-700">{errors.map((error, i) => <p key={i}>{error}</p>)}</div>}
    {value.map((rule, r) => <fieldset key={r} className="space-y-4 rounded border p-4">
      <legend className="font-medium">Conditional rule {r + 1}</legend>
      {rule.when.conditions.map((condition, c) => <fieldset key={c} className="space-y-3 rounded border p-3">
        <legend>{c > 0 ? "AND — " : "IF — "}selection condition {c + 1}</legend>
        <div className="flex flex-wrap gap-4">
          <label className={labelClass}>Match
            <select className={inputClass} value={condition.quantifier} onChange={event => updateClause(r, c, { ...condition, quantifier: event.target.value as GatingChildCondition["quantifier"] })}>
              <option value="any">Any {childType}</option><option value="every">Every {childType}</option><option value="no">No {childType}</option>
            </select>
          </label>
          <label className={labelClass}>Selection
            <select className={inputClass} value={condition.selection.codes ? "specific" : "all"} onChange={event => updateClause(r, c, { ...condition, selection: event.target.value === "all" ? {} : { codes: [] } })}>
              <option value="all">All visible direct children</option><option value="specific">Specific children</option>
            </select>
          </label>
        </div>
        {condition.selection.codes && <div className="space-y-1">{options.map(option => <label key={option.code} className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={condition.selection.codes!.includes(option.code)} onChange={event => updateClause(r, c, { ...condition, selection: { codes: event.target.checked ? [...condition.selection.codes!, option.code] : condition.selection.codes!.filter(code => code !== option.code) } })} />
          <span className="font-mono">{option.code}</span><span>{option.name}</span>
        </label>)}</div>}
        {condition.selection.codes?.filter(code => !options.some(option => option.code === code)).map(code => <p key={code} className="text-sm text-red-700">Missing reference: {code} <button type="button" onClick={() => updateClause(r, c, { ...condition, selection: { codes: condition.selection.codes!.filter(candidate => candidate !== code) } })}>Remove reference</button></p>)}
        {condition.where.conditions.map((item, p) => {
          const fields: GatingField[] = options[0]?.question ? ["score", "state", "answer", "answered"] : ["score", "state", "coverage", "includedCount"];
          const operators: GatingOperator[] = item.field === "state" ? ["is", "isNot"] : item.field === "answered" ? ["==", "!="] : ["<", "<=", "==", "!=", ">=", ">", ...(item.field === "answer" ? ["contains", "containsAny", "containsAll"] as GatingOperator[] : [])];
          const selected = condition.selection.codes ? options.filter(option => condition.selection.codes!.includes(option.code)) : options;
          const optionIds = selected.flatMap(option => option.question?.choices?.map(choice => `${option.code}: ${choice.label} = ${JSON.stringify(choice.id)}`) ?? []);
          return <div key={p} className="space-y-2 border-t pt-3">
            <p className="text-xs text-gray-600">{p > 0 ? "AND — " : "HAS — "}comparison {p + 1} on the same child</p>
            <div className="grid gap-3 md:grid-cols-3">
              <label className={labelClass}>Field
                <select className={inputClass} value={item.field} onChange={event => {
                  const field = event.target.value as GatingField;
                  updateComparison(r, c, p, { kind: "comparison", field, operator: field === "state" ? "is" : "==", right: { kind: "literal", value: field === "state" ? "computed" : field === "answered" ? true : field === "answer" ? (selected[0]?.question?.type === "boolean" ? true : "") : 0.7 } });
                }}>{fields.map(field => <option key={field} value={field}>{field === "includedCount" ? "Included count (%)" : field === "coverage" ? "Coverage (%)" : field === "score" ? "Normalized score (0–1)" : field}</option>)}</select>
              </label>
              <label className={labelClass}>Operator
                <select className={inputClass} value={item.operator} onChange={event => updateComparison(r, c, p, { ...item, operator: event.target.value as GatingOperator })}>{operators.map(operator => <option key={operator}>{operator}</option>)}</select>
              </label>
              <label className={labelClass}>Compare with
                <select className={inputClass} value={item.right.kind} onChange={event => updateComparison(r, c, p, { ...item, right: event.target.value === "field" ? { kind: "field", code: options[0]?.code ?? "", field: item.field as "score" | "coverage" | "includedCount" } : { kind: "literal", value: 0.7 } })}>
                  <option value="literal">Literal value</option>{["score", "coverage", "includedCount"].includes(item.field) && <option value="field">Same field on another item</option>}
                </select>
              </label>
            </div>
            {item.right.kind === "field" ? <label className={labelClass}>Full code identifier ({item.field})
              <select className={inputClass} value={item.right.code} onChange={event => updateComparison(r, c, p, { ...item, right: { ...item.right, code: event.target.value } as GatingOperand })}>
                {!options.some(option => item.right.kind === "field" && option.code === item.right.code) && <option value={item.right.code}>{item.right.code || "Select a child"} (invalid reference)</option>}
                {options.map(option => <option key={option.code} value={option.code}>{option.code} — {option.name}</option>)}
              </select>
            </label> : <label className={labelClass}>Literal value (JSON)
              <LiteralInput key={`${item.field}:${item.operator}`} value={item.right.value} onChange={newValue => updateComparison(r, c, p, { ...item, right: { kind: "literal", value: newValue } as GatingOperand })} />
              <span className="text-xs font-normal text-gray-500">Numbers: 0.7 or 70. Booleans: true / false. Text and option IDs: quoted strings. Selection membership: an ID or array of IDs. N/A: {'{"notApplicable":true}'}.</span>
            </label>}
            {item.field === "answer" && optionIds.length > 0 && <details className="text-xs"><summary>Answer option identifiers</summary>{optionIds.map((text, i) => <p className="font-mono" key={i}>{text}</p>)}</details>}
            <button type="button" className="text-sm text-red-700" disabled={condition.where.conditions.length === 1} onClick={() => updateClause(r, c, { ...condition, where: { kind: "and", conditions: condition.where.conditions.filter((_, i) => i !== p) } })}>Remove comparison</button>
          </div>;
        })}
        <div className="flex gap-4 text-sm">
          <button type="button" onClick={() => updateClause(r, c, { ...condition, where: { kind: "and", conditions: [...condition.where.conditions, comparison()] } })}>Add comparison for this child</button>
          <button type="button" className="text-red-700" disabled={rule.when.conditions.length === 1} onClick={() => update(r, { ...rule, when: { kind: "and", conditions: rule.when.conditions.filter((_, i) => i !== c) } })}>Remove selection condition</button>
        </div>
      </fieldset>)}
      <button type="button" className="text-sm" onClick={() => update(r, { ...rule, when: { kind: "and", conditions: [...rule.when.conditions, clause()] } })}>AND — add selection condition</button>
      <label className={labelClass}>Then set this element’s state to
        <select className={inputClass} value={rule.effect} onChange={event => update(r, { ...rule, effect: event.target.value as ConditionalGatingRule["effect"] })}><option value="flagForReview">Flag for review</option><option value="withheld">Withhold</option></select>
      </label>
      <button type="button" className="text-sm text-red-700" onClick={() => onChange(value.filter((_, i) => i !== r))}>Delete conditional rule</button>
    </fieldset>)}
  </section>;
}
