import type { EvidenceRequirement } from "@/api/types";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { inputClass, labelClass } from "../../components/FormFields";
import { TEXT_LIMITS } from "@/config/textLimits";
import { EVIDENCE_AGE_DEFAULTS, effectiveMaxAgeDays } from "@/app/assessment/evidenceLifecycle";

export default function PracticeEvidenceEditor({ requirements, onChange }: {
  requirements: EvidenceRequirement[];
  onChange: (requirements: EvidenceRequirement[]) => void;
}) {
  const update = (index: number, patch: Partial<EvidenceRequirement>) =>
    onChange(requirements.map((item, i) => i === index ? { ...item, ...patch } : item));
  return <div className="space-y-4">
    <p className="text-sm leading-6 text-slate-600">Define what respondents should provide and how long it stays current. Each requirement appears as a separate evidence field in the practice.</p>
    {!requirements.length && <p className="rounded-xl border border-dashed p-5 text-sm text-slate-500">No specific evidence requirements. Respondents can still add supporting evidence.</p>}
    {requirements.map((item, index) => {
      const frequency = item.frequency ?? "adhoc";
      const defaultAge = EVIDENCE_AGE_DEFAULTS[frequency];
      const age = effectiveMaxAgeDays(item);
      const custom = item.maxAgeDays != null;
      return <fieldset key={item.code} className="@container space-y-5 rounded-xl border border-slate-200 bg-white p-5">
      <legend className="px-1 text-sm font-semibold text-slate-800">Evidence requirement {index + 1}</legend>
      <label className={labelClass}>Name <span aria-hidden="true">*</span>
        <input className={inputClass} value={item.name} required maxLength={TEXT_LIMITS.name}
          placeholder="e.g. Monthly incident report" onChange={event => update(index, { name: event.target.value })} />
      </label>
      <label className={labelClass}>Acceptance criteria <span className="font-normal text-slate-400">(optional)</span>
        <textarea className={inputClass} rows={3} value={item.instructions} maxLength={TEXT_LIMITS.evidenceDescription}
          placeholder="e.g. Covers the latest completed month, including incident totals, severity and resolution status."
          onChange={event => update(index, { instructions: event.target.value })} />
        <span className="text-xs font-normal text-slate-500">Informational guidance for respondents and evaluators during manual review.</span>
      </label>
      <section aria-label={`Evidence freshness for requirement ${index + 1}`} className="space-y-4 rounded-lg border border-slate-200 bg-slate-50/70 p-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Evidence freshness</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">Age is measured in days from the evidence date.</p>
        </div>
        <div className="grid gap-4 @lg:grid-cols-2">
          <label className={labelClass}>Frequency
            <select className={inputClass} value={frequency}
              onChange={event => update(index, { frequency: event.target.value as EvidenceRequirement["frequency"] })}>
              <option value="adhoc">Ad hoc</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
            <span className="mt-1 block text-xs font-normal text-slate-500">{defaultAge == null ? "No default expiry." : `Default expiry: ${defaultAge} days.`}</span>
          </label>
          <label className={labelClass}>Custom age limit <span className="font-normal text-slate-400">(optional)</span>
            <div className="relative">
              <input type="number" min={0} max={2147483647} step={1} className={`${inputClass} pr-14`}
                value={item.maxAgeDays ?? ""} placeholder="e.g. 60"
                onChange={event => update(index, { maxAgeDays: event.target.value === "" ? null : Number(event.target.value) })} />
              <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-3 flex items-center pt-1 text-xs font-normal text-slate-500">days</span>
            </div>
            <span className="mt-1 block text-xs font-normal text-slate-500">Leave empty to use the frequency default.</span>
          </label>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3" aria-live="polite">
          <div>
            <p className="text-sm font-medium text-slate-800">{age == null ? "No expiry" : age === 0 ? "Outdated from the next day" : `Outdated after ${age} days`}</p>
            <p className="mt-0.5 text-xs text-slate-500">{custom ? "Custom age limit" : "Frequency default"} · Warnings only; scores stay unchanged.</p>
          </div>
          {custom && <button type="button" className="rounded px-1 py-1 text-xs font-medium text-indigo-700 hover:underline focus-visible:outline-indigo-600"
            onClick={() => update(index, { maxAgeDays: null })}>{defaultAge == null ? "Remove age limit" : `Use ${defaultAge}-day default`}</button>}
        </div>
      </section>
      <div className="grid items-end gap-4 @lg:grid-cols-2">
        <label className={labelClass}>Accepted formats
          <select className={inputClass} value={item.format} onChange={event => update(index, { format: event.target.value as EvidenceRequirement["format"] })}>
            <option value="FILE_OR_URL">Files or secure links</option><option value="FILE">Files only</option>
            <option value="URL">Secure links only</option><option value="ANY">Files, secure links or notes</option>
          </select>
        </label>
        <label className="flex min-h-10 cursor-pointer items-center gap-2 py-2 text-sm text-slate-700"><input type="checkbox" checked={item.required}
          onChange={event => update(index, { required: event.target.checked })} />Required for submission</label>
      </div>
      <div className="flex justify-end border-t border-slate-100 pt-3">
        <button type="button" className="inline-flex items-center gap-2 rounded px-2 py-1 text-xs text-red-700 hover:bg-red-50"
          aria-label={`Remove ${item.name || `evidence requirement ${index + 1}`}`}
          onClick={() => onChange(requirements.filter((_, i) => i !== index))}><TrashIcon className="h-4 w-4" />Remove</button>
      </div>
    </fieldset>;
    })}
    <button type="button" disabled={requirements.length >= 50} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium disabled:opacity-50"
      onClick={() => onChange([...requirements, { code: `E_${crypto.randomUUID()}`, name: "", instructions: "", required: true, format: "FILE_OR_URL" }])}>
      <PlusIcon className="h-4 w-4" />Add evidence requirement
    </button>
  </div>;
}
