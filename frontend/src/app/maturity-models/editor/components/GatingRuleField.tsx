import CompletionThresholdFields from "./CompletionThresholdFields";
import { useState } from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { PlusIcon, PencilSquareIcon, TrashIcon, XMarkIcon, ArrowRightIcon } from "@heroicons/react/24/outline";
import ConditionalGatingField from "./ConditionalGatingField";
import { conditionalGatingIssues, type GatingChildOption } from "../model/conditionalGating";
import type { AggregationRule, ChildStateGatingRule, ConditionalGatingRule } from "@/api/types";
import { inputClass, labelClass } from "./FormFields";

type Values = { minimumCoverage: number; minimumIncludedCount: number; conditionalGatingRules?: ConditionalGatingRule[]; childStateGatingRules?: ChildStateGatingRule[]; completionGatingMetadata?: { name?: string; description?: string } };
type Draft = { kind: "state" | "conditional"; index: number | null; name: string; description: string; state: ChildStateGatingRule; conditional: ConditionalGatingRule };
const defaultRule = (): ConditionalGatingRule => ({ version: 1, effect: "flagForReview", when: { kind: "and", conditions: [{ kind: "children", quantifier: "any", selection: {}, where: { kind: "and", conditions: [{ kind: "comparison", field: "score", operator: "<", right: { kind: "literal", value: 0.7 } }] } }] } });
const effectName = (effect: string) => effect === "withheld" ? "Withhold" : "Flag for review";
export function conditionalSummary(rule: ConditionalGatingRule, childType: string, options: GatingChildOption[] = []) {
  const literal = (value: unknown, field: string): string => {
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (typeof value === "object" && value && "notApplicable" in value) return "N/A";
    if (Array.isArray(value)) return value.map(v => literal(v, field)).join(", ");
    if (field === "score" && typeof value === "number") return `${Number((value * 100).toFixed(4))}%`;
    if (typeof value === "string") return options.flatMap(option => option.question?.choices ?? []).find(choice => choice.id === value)?.label ?? value;
    return String(value);
  };
  return rule.when.conditions.map(clause => `${{ any: "Any", every: "Every", no: "No" }[clause.quantifier]} ${clause.selection.codes?.join(", ") || childType} has (${clause.where.conditions.map(c => `${c.field === "includedCount" ? "included count" : c.field} ${c.operator === "isNot" ? "is not" : c.operator} ${c.right.kind === "field" ? `${c.right.field} of ${c.right.code}` : literal(c.right.value, c.field)}${["coverage", "includedCount"].includes(c.field) && c.right.kind === "literal" ? "%" : ""}`).join(" AND ")})`).join(" AND ");
}
export default function GatingRuleField({ idPrefix, aggregationRule, isPractice, childType = "question", childOptions = [], onChange, ...values }: Values & {
  idPrefix: string; aggregationRule: AggregationRule; isPractice: boolean; childType?: "question" | "practice" | "module"; childOptions?: GatingChildOption[]; onChange: (values: Values) => void;
}) {
  const [draft, setDraft] = useState<Draft | null>(null), [step, setStep] = useState(0);
  const stateRules = values.childStateGatingRules ?? [], conditionalRules = values.conditionalGatingRules ?? [];
  const open = (kind: Draft["kind"], index: number | null = null) => {
    const state = kind === "state" && index != null ? stateRules[index] : { quantifier: "any" as const, state: "withheld" as const, effect: "flagForReview" as const };
    const conditional = kind === "conditional" && index != null ? conditionalRules[index] : defaultRule();
    const metadata = kind === "state" ? state : conditional;
    setDraft(structuredClone({ kind, index, name: metadata?.name ?? (index == null ? "" : kind === "state" ? `Child-state rule ${index + 1}` : `Conditional rule ${index + 1}`), description: metadata?.description ?? "", state, conditional })); setStep(0);
  };
  const detailsValid = !!draft?.name.trim() && draft.name.length <= 255 && draft.description.length <= 2000;
  const errors = !draft ? [] : draft.kind === "conditional" ? conditionalGatingIssues([draft.conditional], childOptions) : [];
  const save = () => {
    if (!draft || !detailsValid || errors.length) return;
    const metadata = { name: draft.name.trim(), description: draft.description.trim() };
    const next = { ...values };
    if (draft.kind === "state") next.childStateGatingRules = draft.index == null ? [...stateRules, { ...draft.state, ...metadata }] : stateRules.map((r, i) => i === draft.index ? { ...draft.state, ...metadata } : r);
    else next.conditionalGatingRules = draft.index == null ? [...conditionalRules, { ...draft.conditional, ...metadata }] : conditionalRules.map((r, i) => i === draft.index ? { ...draft.conditional, ...metadata } : r);
    onChange(next); setDraft(null);
  };
  const row = (name: string, description: string, summary: string, effect: string, edit: () => void, remove?: () => void) => <div className="flex items-center gap-4 px-4 py-4 sm:px-5">
    <div className="min-w-0 flex-1"><p className="truncate font-semibold text-gray-950">{name}</p><p className="mt-1 line-clamp-2 text-sm leading-5 text-gray-500" title={description || summary}>{summary}</p></div>
    <span className={`hidden shrink-0 rounded-full px-2.5 py-1 text-xs font-medium sm:inline-flex ${effect === "Withhold" ? "bg-amber-50 text-amber-800" : "bg-blue-50 text-blue-700"}`}>{effect}</span>
    <button type="button" onClick={edit} aria-label={`Edit ${name}`} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"><PencilSquareIcon className="h-5 w-5" /></button>
    {remove && <button type="button" onClick={remove} aria-label={`Delete ${name}`} className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-700"><TrashIcon className="h-5 w-5" /></button>}
  </div>;
  return <section aria-label="Gating rules" className="space-y-5">
    <CompletionThresholdFields idPrefix={idPrefix} aggregationRule={aggregationRule} isPractice={isPractice}
      minimumCoverage={values.minimumCoverage} minimumIncludedCount={values.minimumIncludedCount}
      onChange={thresholds => onChange({ ...values, ...thresholds })} />
    <section aria-label="Custom gating rules" className="space-y-5 border-t border-gray-100 pt-6">
    <div className="flex items-start justify-between gap-4"><div><h3 className="text-lg font-semibold text-gray-950">Custom gating rules</h3><p className="mt-1 text-sm text-gray-500">Define when a result should be withheld or flagged for review.</p></div><button type="button" onClick={() => open("conditional")} className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"><PlusIcon className="h-4 w-4" />Create rule</button></div>
    {(stateRules.length > 0 || conditionalRules.length > 0) && <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
      {stateRules.map((rule, i) => <div key={`state-${i}`}>{row(rule.name || `Child-state rule ${i + 1}`, rule.description || "", `${rule.quantifier} ${childType} has state ${rule.state}`, effectName(rule.effect), () => open("state", i), () => onChange({ ...values, childStateGatingRules: stateRules.filter((_, j) => j !== i) }))}</div>)}
      {conditionalRules.map((rule, i) => <div key={`conditional-${i}`}>{row(rule.name || `Conditional rule ${i + 1}`, rule.description || "", conditionalSummary(rule, childType, childOptions), effectName(rule.effect), () => open("conditional", i), () => onChange({ ...values, conditionalGatingRules: conditionalRules.filter((_, j) => j !== i) }))}</div>)}
    </div>}
    {!stateRules.length && !conditionalRules.length && <p className="text-sm text-gray-400">No custom rules yet. Create a rule to add a condition.</p>}
    </section>
    <Dialog open={!!draft} onClose={() => setDraft(null)} className="relative z-50"><div className="fixed inset-0 bg-gray-950/40 backdrop-blur-sm" aria-hidden="true" /><div className="fixed inset-0 overflow-y-auto"><div className="flex min-h-full items-center justify-center p-4 sm:p-8"><DialogPanel className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
      {draft && <><div className="flex items-start justify-between border-b border-gray-100 px-6 py-5"><div><p className="text-xs font-medium uppercase tracking-wide text-blue-600">{draft.index == null ? "Create a rule" : "Edit rule"}</p><DialogTitle className="mt-1 text-xl font-semibold text-gray-950">{["Give your rule a purpose", "Define the condition", "Choose the outcome"][step]}</DialogTitle></div><button type="button" aria-label="Close rule editor" onClick={() => setDraft(null)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"><XMarkIcon className="h-5 w-5" /></button></div>
      <ol className="flex gap-6 border-b border-gray-100 px-6 py-4 text-sm">{["Details", "Conditions", "Outcome"].map((label, i) => <li key={label} aria-current={step === i ? "step" : undefined} className={step === i ? "font-semibold text-blue-700" : "text-gray-400"}><span className="mr-2">{i + 1}.</span>{label}</li>)}</ol>
      <div className="max-h-[60vh] overflow-y-auto px-6 py-6">
        {step === 0 && <div className="space-y-5"><label className={labelClass}>Rule name <span className="sr-only">(required)</span><input autoFocus required maxLength={255} className={inputClass} value={draft.name} placeholder="e.g. Flag incomplete practices" onChange={event => setDraft({ ...draft, name: event.target.value })} /></label><label className={labelClass}>Description <span className="text-xs font-normal text-gray-400">Optional</span><textarea rows={3} maxLength={2000} className={inputClass} value={draft.description} placeholder="Explain why this rule matters and when to use it." onChange={event => setDraft({ ...draft, description: event.target.value })} /></label>{draft.index == null && <fieldset><legend className="mb-2 text-sm font-medium">What should this rule check?</legend><div className="grid gap-3 sm:grid-cols-2">{(["conditional", "state"] as const).map(kind => <button key={kind} type="button" onClick={() => setDraft({ ...draft, kind })} aria-pressed={draft.kind === kind} className={`rounded-xl border p-4 text-left ${draft.kind === kind ? "border-blue-500 bg-blue-50" : "border-gray-200"}`}><span className="block font-medium">{kind === "conditional" ? "Compare child properties" : "Check child states"}</span><span className="mt-1 block text-xs leading-5 text-gray-500">{kind === "conditional" ? "Scores, answers and completion, with AND conditions." : "A simple Any / Every / No state condition."}</span></button>)}</div></fieldset>}</div>}
        {step === 1 && (draft.kind === "state" ? <div className="grid gap-5 sm:grid-cols-2"><label className={labelClass}>If<select className={inputClass} value={draft.state.quantifier} onChange={e => setDraft({ ...draft, state: { ...draft.state, quantifier: e.target.value as ChildStateGatingRule["quantifier"] } })}><option value="any">Any {childType}</option><option value="every">Every {childType}</option><option value="no">No {childType}</option></select></label><label className={labelClass}>Has state<select className={inputClass} value={draft.state.state} onChange={e => setDraft({ ...draft, state: { ...draft.state, state: e.target.value as ChildStateGatingRule["state"] } })}><option value="computed">Score computed</option><option value="withheld">Withhold</option></select></label></div> : <ConditionalGatingField embedded value={[draft.conditional]} childOptions={childOptions} childType={childType} onChange={rules => setDraft({ ...draft, conditional: rules[0] })} />)}
        {step === 2 && <div className="space-y-5"><label className={labelClass}>When the condition matches<select className={inputClass} value={draft.kind === "state" ? draft.state.effect : draft.conditional.effect} onChange={event => setDraft({ ...draft, state: { ...draft.state, effect: event.target.value as ChildStateGatingRule["effect"] }, conditional: { ...draft.conditional, effect: event.target.value as ConditionalGatingRule["effect"] } })}><option value="flagForReview">Flag for review</option><option value="withheld">Withhold</option></select></label><div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4"><h4 className="font-semibold">{draft.name}</h4>{draft.description && <p className="mt-1 text-sm text-gray-500">{draft.description}</p>}<p className="mt-3 break-words text-sm leading-6">{draft.kind === "conditional" ? conditionalSummary(draft.conditional, childType, childOptions) : `${draft.state.quantifier} ${childType} has state ${draft.state.state}`}</p></div><p className="text-xs leading-5 text-gray-500">Withhold always takes precedence. Flag for review keeps the score and its normal contribution to aggregation.</p></div>}
        {errors.length > 0 && step > 0 && <div role="alert" className="mt-4 text-sm text-red-700">{errors.map(error => <p key={error}>{error}</p>)}</div>}
      </div><div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-6 py-4"><button type="button" onClick={() => setDraft(null)} className="text-sm text-gray-500">Cancel</button><div className="flex gap-3">{step > 0 && <button type="button" onClick={() => setStep(step - 1)} className="rounded-lg border bg-white px-4 py-2 text-sm">Back</button>}<button type="button" disabled={!detailsValid || step > 0 && errors.length > 0} onClick={() => step < 2 ? setStep(step + 1) : save()} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{step < 2 ? "Continue" : "Save rule"}{step < 2 && <ArrowRightIcon className="h-4 w-4" />}</button></div></div></>}
    </DialogPanel></div></div></Dialog>
  </section>;
}
