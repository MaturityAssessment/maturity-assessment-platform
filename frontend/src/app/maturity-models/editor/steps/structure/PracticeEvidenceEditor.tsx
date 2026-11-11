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
    <p className="text-sm leading-6 text-slate-600">Name the evidence respondents should provide. Each requirement gets a dedicated field in the practice. Explain which document date or reporting-period end they should enter.</p>
    {!requirements.length && <p className="rounded-xl border border-dashed p-5 text-sm text-slate-500">No specific evidence requirements. Respondents can still add supporting evidence.</p>}
    {requirements.map((item, index) => <fieldset key={item.code} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
      <legend className="px-1 text-sm font-semibold text-slate-800">Evidence requirement {index + 1}</legend>
      <label className={labelClass}>Name <span aria-hidden="true">*</span>
        <input className={inputClass} value={item.name} required maxLength={TEXT_LIMITS.name}
          placeholder="e.g. Monthly incident report" onChange={event => update(index, { name: event.target.value })} />
      </label>
      <label className={labelClass}>Instructions <span className="font-normal text-slate-400">(optional)</span>
        <textarea className={inputClass} rows={3} value={item.instructions} maxLength={TEXT_LIMITS.evidenceDescription}
          placeholder="Provide the latest completed monthly report. Use the last day of its reporting period as the evidence date."
          onChange={event => update(index, { instructions: event.target.value })} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>Evidence frequency
          <select className={inputClass} value={item.frequency ?? "adhoc"}
            onChange={event => update(index, { frequency: event.target.value as EvidenceRequirement["frequency"], maxAgeDays: null })}>
            <option value="adhoc">Ad hoc (no default expiry)</option>
            <option value="monthly">Monthly (31 days)</option>
            <option value="quarterly">Quarterly (92 days)</option>
            <option value="yearly">Yearly (366 days)</option>
          </select>
        </label>
        <label className={labelClass}>Maximum evidence age (days)
          <input type="number" min={0} max={2147483647} step={1} className={inputClass}
            value={item.maxAgeDays ?? ""} placeholder={String(EVIDENCE_AGE_DEFAULTS[item.frequency ?? "adhoc"] ?? "No maximum")}
            onChange={event => update(index, { maxAgeDays: event.target.value === "" ? null : Number(event.target.value) })} />
          <span className="text-xs font-normal text-slate-500">{effectiveMaxAgeDays(item) == null
            ? "No expiry. Set a day limit to override."
            : `Valid through day ${effectiveMaxAgeDays(item)} after the evidence date; outdated from the following day.`} Leave blank to use the frequency default.</span>
        </label>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <label className={labelClass}>Accepted formats
          <select className={inputClass} value={item.format} onChange={event => update(index, { format: event.target.value as EvidenceRequirement["format"] })}>
            <option value="FILE_OR_URL">Files or secure links</option><option value="FILE">Files only</option>
            <option value="URL">Secure links only</option><option value="ANY">Files, secure links or notes</option>
          </select>
        </label>
        <label className="flex items-center gap-2 py-2 text-sm text-slate-700"><input type="checkbox" checked={item.required}
          onChange={event => update(index, { required: event.target.checked })} />Required for submission</label>
        <button type="button" className="inline-flex items-center gap-2 rounded px-2 py-2 text-sm text-red-700 hover:bg-red-50"
          aria-label={`Remove ${item.name || `evidence requirement ${index + 1}`}`}
          onClick={() => onChange(requirements.filter((_, i) => i !== index))}><TrashIcon className="h-4 w-4" />Remove</button>
      </div>
    </fieldset>)}
    <button type="button" disabled={requirements.length >= 50} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium disabled:opacity-50"
      onClick={() => onChange([...requirements, { code: `E_${crypto.randomUUID()}`, name: "", instructions: "", required: true, format: "FILE_OR_URL" }])}>
      <PlusIcon className="h-4 w-4" />Add evidence requirement
    </button>
  </div>;
}
