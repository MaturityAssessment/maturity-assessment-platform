import ModuleBadgeFields from "./ModuleBadgeFields";
import type { ModelEditorDimension, ModelEditorModule } from "@/api/types";
import { moduleRelationshipIssues, synchronizeModuleRelationships } from "../../model/moduleRelationships";

const sections = [
  { field: "prerequisiteModuleCodes", title: "Prerequisites", description: "Must be completed first. Select earlier modules in this dimension. Only required answers and required evidence determine completion." },
  { field: "coRequisiteModuleCodes", title: "Co-requisites", description: "Visible together. Showing or hiding a module changes its whole co-requisite group. This relationship does not require completing another module." },
  { field: "mutexModuleCodes", title: "Mutually exclusive", description: "Cannot be visible together. Both modules may be hidden. Showing one offers a visibility switch when the other is visible." },
] as const;

export default function ModuleRelationshipsField({ dimension, module, onChange }: {
  dimension: ModelEditorDimension;
  module: ModelEditorModule;
  onChange: (module: ModelEditorModule) => void;
}) {
  const index = dimension.modules.findIndex((candidate) => candidate.clientKey === module.clientKey);
  return <div className="space-y-5">
    <div>
      <h3 className="text-lg font-semibold tracking-tight text-gray-950">Module relationships</h3>
      <p className="mt-1 text-sm leading-6 text-gray-500">Relationships apply within this dimension. Co-requisite and mutually exclusive selections are reflected on both modules. Visibility changes are shown before applying them.</p>
    </div>
    {sections.map(({ field, title, description }) => {
      const values = module[field] ?? [];
      const candidates = field === "prerequisiteModuleCodes" ? dimension.modules.slice(0, index)
        : dimension.modules.filter((candidate) => candidate.clientKey !== module.clientKey);
      const toggle = (code: string) => {
        const selected = values.some((value) => value.toLowerCase() === code.toLowerCase());
        return { ...module, [field]: selected ? values.filter((value) => value.toLowerCase() !== code.toLowerCase()) : [...values, code] };
      };
      return <fieldset key={field} className="rounded-xl border border-gray-200 bg-white p-4 @lg:p-5">
        <legend className="px-1 text-sm font-semibold text-gray-900">{title} <span className="ml-1 text-xs font-normal text-gray-500">{values.length}</span></legend>
        <p className="mb-3 text-sm leading-6 text-gray-500">{description}</p>
        {!candidates.length && <p className="text-sm text-gray-500">{field === "prerequisiteModuleCodes" ? "The first module has no earlier modules to select." : "Add another module to this dimension to define this relationship."}</p>}
        <div className="max-h-80 space-y-1 overflow-y-auto">
          {candidates.map((candidate) => {
            const selected = values.some((value) => value.toLowerCase() === candidate.code.toLowerCase());
            const next = toggle(candidate.code);
            const proposed = synchronizeModuleRelationships(dimension.modules.map((item) => item.clientKey === module.clientKey ? next : item), next.code);
            const conflict = selected ? undefined : moduleRelationshipIssues(proposed, { firstStructuralIssueOnly: true }).find((issue) => issue.kind === "structure");
            return <label key={candidate.clientKey} className={`flex items-start gap-3 rounded-lg px-2 py-2 ${conflict ? "text-gray-400" : "hover:bg-gray-50"}`}>
              <input type="checkbox" checked={selected} disabled={Boolean(conflict)}
                className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-40"
                onChange={() => onChange(next)} />
              <span className="min-w-0 text-sm">
                <span className="font-medium">{candidate.name || "Untitled module"}</span>
                <span className="ml-2 font-mono text-xs text-gray-500">{candidate.code}</span>
                {candidate.visible === false && <span className="ml-2 text-xs text-gray-500">Hidden</span>}
                {conflict && <span className="mt-1 block text-xs leading-5 text-amber-700">{conflict.message}</span>}
              </span>
            </label>;
          })}
        </div>
        {values.filter((code) => !candidates.some((candidate) => candidate.code.toLowerCase() === code.toLowerCase())).map((code) => (
          <div key={code} role="alert" className="mt-2 flex items-center justify-between gap-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">
            <span>Unavailable relationship: {code}. Remove this reference or choose a module in this dimension.</span>
            <button type="button" className="font-semibold underline" onClick={() => onChange(toggle(code))}>Remove</button>
          </div>
        ))}
      </fieldset>;
    })}
    <ModuleBadgeFields dimension={dimension} module={module} onChange={onChange} />
  </div>;
}
