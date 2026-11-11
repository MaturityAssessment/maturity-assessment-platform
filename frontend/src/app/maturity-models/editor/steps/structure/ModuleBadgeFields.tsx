import type { ModelEditorDimension, ModelEditorModule } from "@/api/types";
import { MODULE_BADGE_REFERENCE_FIELDS } from "../../model/moduleBadges";

export default function ModuleBadgeFields({ dimension, module, onChange }: {
  dimension: ModelEditorDimension;
  module: ModelEditorModule;
  onChange: (module: ModelEditorModule) => void;
}) {
  const candidates = dimension.modules.filter((candidate) => candidate.clientKey !== module.clientKey);
  return <section aria-label="Informational badge settings" className="space-y-4 rounded-xl border border-violet-100 bg-violet-50/30 p-4 @lg:p-5">
    <div>
      <h3 className="text-base font-semibold text-gray-900">Informational badges</h3>
      <p className="mt-1 text-sm leading-6 text-gray-500">Notes for future model editors. These badges do not change visibility, prerequisites, required answers, or scoring. They appear only on this module’s editor page.</p>
    </div>
    <label className="flex items-start gap-3 rounded-lg bg-white p-3">
      <input type="checkbox" checked={module.mandatoryBadge === true} onChange={(event) => onChange({ ...module, mandatoryBadge: event.target.checked })}
        className="mt-1 h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500" />
      <span className="text-sm"><span className="block font-medium text-gray-900">Mandatory</span><span className="mt-0.5 block text-gray-500">An editorial label; it does not make the module required.</span></span>
    </label>
    {MODULE_BADGE_REFERENCE_FIELDS.map((field) => {
      const values = module[field] ?? [];
      const title = field === "reinforcesModuleCodes" ? "Reinforces" : "Substitutes";
      return <fieldset key={field} className="rounded-lg border border-gray-200 bg-white p-3">
        <legend className="px-1 text-sm font-semibold text-gray-900">{title}</legend>
        <p className="mb-2 text-sm leading-6 text-gray-500">Select any modules in this dimension. Hidden and later modules are available. This note applies in the selected direction only.</p>
        {!candidates.length && <p className="text-sm text-gray-500">Add another module to this dimension to select a target.</p>}
        <div className="max-h-64 space-y-1 overflow-y-auto">
          {candidates.map((candidate) => {
            const selected = values.some((code) => code.toLowerCase() === candidate.code.toLowerCase());
            return <label key={candidate.clientKey} className="flex items-start gap-3 rounded-lg p-2 hover:bg-gray-50">
              <input type="checkbox" checked={selected} onChange={() => onChange({ ...module, [field]: selected
                ? values.filter((code) => code.toLowerCase() !== candidate.code.toLowerCase()) : [...values, candidate.code] })}
                className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300 text-violet-600 focus:ring-violet-500" />
              <span className="min-w-0 text-sm"><span className="font-medium text-gray-900">{candidate.name || "Untitled module"}</span>
                <span className="ml-2 font-mono text-xs text-gray-500">{candidate.code}</span>
                {candidate.visible === false && <span className="ml-2 text-xs text-gray-500">Hidden</span>}
              </span>
            </label>;
          })}
        </div>
        {values.filter((code) => !candidates.some((candidate) => candidate.code.toLowerCase() === code.toLowerCase())).map((code) => (
          <div key={code} className="mt-2 flex items-center justify-between gap-3 rounded-lg bg-gray-50 p-2 text-sm text-gray-600">
            <span>{title} {code}</span>
            <button type="button" className="font-medium underline" onClick={() => onChange({ ...module, [field]: values.filter((reference) => reference !== code) })}>Remove</button>
          </div>
        ))}
      </fieldset>;
    })}
  </section>;
}
