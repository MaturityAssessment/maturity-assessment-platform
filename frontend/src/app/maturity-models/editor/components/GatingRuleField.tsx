import CompletionThresholdFields from "./CompletionThresholdFields";
import ScoreLimitFields from "./ScoreLimitFields";
import type { ScoreLimit } from "@/api/types";
import { useState } from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { PlusIcon, PencilSquareIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import ConditionalGatingField, { emptyCondition } from "./ConditionalGatingField";
import { conditionalGatingIssues, type GatingChildOption } from "../model/conditionalGating";
import { comparisonLabel, quantifierDescription } from "../model/gatingRuleLabels";
import type { AggregationRule, ChildStateGatingRule, ConditionalGatingRule } from "@/api/types";
import { inputClass } from "./FormFields";

type Values = { minimumCoverage: number; minimumIncludedCount: number; conditionalGatingRules?: ConditionalGatingRule[]; childStateGatingRules?: ChildStateGatingRule[]; scoreLimits?: ScoreLimit[]; completionGatingMetadata?: { name?: string; description?: string } };
type Draft = { kind: "state" | "conditional"; index: number | null; name: string; description: string; state: ChildStateGatingRule; conditional: ConditionalGatingRule };
const defaultRule = (): ConditionalGatingRule => ({ version: 1, effect: "flagForReview", when: { kind: "and", conditions: [emptyCondition()] } });
const effectName = (effect: string) => effect === "withheld" ? "Withhold" : "Flag for review";

export function conditionalSummary(rule: ConditionalGatingRule, childType: string, options: GatingChildOption[] = []) {
  return rule.when.conditions.map(group => {
    const selection = group.selection.codes?.join(", ") || `all visible ${childType}s`;
    const comparisons = group.where.conditions.map(comparison => comparisonLabel(comparison, options)).join(" AND ");
    return `${selection}: ${quantifierDescription(group.quantifier, childType).toLowerCase()} (${comparisons})`;
  }).join(" AND ");
}

export default function GatingRuleField({ idPrefix, aggregationRule, isPractice, childType = "question", childOptions = [], onChange, ...values }: Values & {
  idPrefix: string; aggregationRule: AggregationRule; isPractice: boolean; childType?: "question" | "practice" | "module"; childOptions?: GatingChildOption[]; onChange: (values: Values) => void;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [showDescription, setShowDescription] = useState(false);
  const stateRules = values.childStateGatingRules ?? [], conditionalRules = values.conditionalGatingRules ?? [];
  const open = (kind: Draft["kind"], index: number | null = null) => {
    const state = kind === "state" && index != null ? stateRules[index] : { quantifier: "any" as const, state: "withheld" as const, effect: "flagForReview" as const };
    const conditional = kind === "conditional" && index != null ? conditionalRules[index] : defaultRule();
    const metadata = kind === "state" ? state : conditional;
    setDraft(structuredClone({ kind, index, name: metadata?.name ?? (index == null ? "" : kind === "state" ? `Child-state rule ${index + 1}` : `Conditional rule ${index + 1}`), description: metadata?.description ?? "", state, conditional })); setShowDescription(!!metadata.description);
  };
  const detailsValid = !!draft?.name.trim() && draft.name.length <= 255 && draft.description.length <= 2000;
  const errors = !draft ? [] : draft.kind === "conditional" ? conditionalGatingIssues([draft.conditional], childOptions) : [];
  const close = () => setDraft(null);
  const save = () => {
    if (!draft || !detailsValid || errors.length > 0) return;
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
    <ScoreLimitFields owner={values} onChange={scoreLimits => onChange({ ...values, scoreLimits })} />
    <Dialog open={!!draft} onClose={close} className="relative z-50">
      <div className="fixed inset-0 bg-slate-900/40" aria-hidden="true" />
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-2 sm:p-6">
          <DialogPanel className="flex max-h-[95dvh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            {draft && <>
              <header className="flex shrink-0 items-start justify-between gap-4 border-b border-gray-100 px-5 py-5 sm:px-7">
                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-blue-600">{draft.index == null ? "Create a rule" : "Edit rule"}</p>
                  <DialogTitle className="sr-only">{draft.index == null ? "Create a gating rule" : "Edit gating rule"}</DialogTitle>
                  <input autoFocus aria-label="Rule name" required maxLength={255} value={draft.name} placeholder="Rule name"
                    onChange={event => setDraft({ ...draft, name: event.target.value })}
                    className="w-full max-w-xl border-0 border-b border-dashed border-slate-300 bg-transparent px-0 py-1 text-lg font-semibold text-gray-950 placeholder:font-normal focus:border-blue-600 focus:ring-0" />
                  {showDescription ? <textarea aria-label="Rule description" maxLength={2000} rows={2} value={draft.description} placeholder="Describe the purpose of this rule"
                    onChange={event => setDraft({ ...draft, description: event.target.value })}
                    className={`${inputClass} mt-2 max-w-xl shadow-none`} /> : <button type="button" onClick={() => setShowDescription(true)} className="mt-2 block text-xs text-blue-700 hover:underline">+ Add description</button>}
                </div>
                <button type="button" aria-label="Close rule editor" onClick={close} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"><XMarkIcon className="h-5 w-5" /></button>
              </header>
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7">
                <ConditionalGatingField embedded legacyState={draft.kind === "state"} childOptions={childOptions} childType={childType}
                  value={[draft.kind === "conditional" ? draft.conditional : {
                    version: 1, effect: draft.state.effect, when: { kind: "and", conditions: [{ kind: "children", selection: {}, quantifier: draft.state.quantifier,
                      where: { kind: "and", conditions: [{ kind: "comparison", field: "state", operator: "is", right: { kind: "literal", value: draft.state.state } }] } }] },
                  }]}
                  onChange={rules => {
                    const rule = rules[0];
                    if (draft.kind === "conditional") setDraft({ ...draft, conditional: rule });
                    else {
                      const group = rule.when.conditions[0];
                      const right = group.where.conditions[0].right;
                      setDraft({ ...draft, state: { ...draft.state, quantifier: group.quantifier, effect: rule.effect, state: right.kind === "literal" ? right.value as ChildStateGatingRule["state"] : draft.state.state } });
                    }
                  }} />
              </div>
              <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-gray-100 bg-white px-5 py-4 sm:px-7">
                <button type="button" onClick={close} className="rounded-lg px-2 py-2 text-sm text-gray-600">Cancel</button>
                <button type="button" disabled={!detailsValid || errors.length > 0} onClick={save} className="min-h-11 rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40 max-sm:flex-1">Save rule</button>
              </footer>
            </>}
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  </section>;
}
