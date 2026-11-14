import type { AssessmentElementResult } from "@/api/types";

export default function AssessmentCompletionResults({ elements }: {
  elements?: AssessmentElementResult[] | null;
}) {
  const aggregates = elements?.filter(element => element.elementType !== "question") ?? [];
  if (!aggregates.length) return null;
  return <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 sm:p-6" aria-label="Completion and gating">
    <h3 className="font-bold text-slate-950">Completion and gating</h3>
    <p className="mt-1 text-sm leading-6 text-slate-500">Included count measures completion. Coverage uses child weights for weighted mean. Withheld children contribute zero to parent completion and no score to aggregation.</p>
    <div className="mt-4 overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 text-xs text-slate-500"><tr>
          <th scope="col" className="px-3 py-3">Element</th>
          <th scope="col" className="px-3 py-3">State</th>
          <th scope="col" className="px-3 py-3 text-right">Included count</th>
          <th scope="col" className="px-3 py-3 text-right">Coverage</th>
        </tr></thead>
        <tbody>{aggregates.map((element, index) => <tr key={index} className="border-b border-slate-100 last:border-0">
          <th scope="row" className="px-3 py-3 font-medium text-slate-900">
            <span className="block">{element.name}</span>
            <span className="text-xs font-normal capitalize text-slate-500">{element.elementType} · {[element.dimensionId, element.moduleCode, element.practiceCode].filter(Boolean).join(" / ") || "Overall"}</span>
          </th>
          <td className="px-3 py-3"><span className={element.state === "withheld" ? "font-medium text-amber-700" : "text-slate-600"}>{element.state === "withheld" ? "Withheld" : "Computed"}</span></td>
          <td className="px-3 py-3 text-right tabular-nums">{element.includedCount.toFixed(1)}%</td>
          <td className="px-3 py-3 text-right tabular-nums">{element.coverage.toFixed(1)}%</td>
        </tr>)}</tbody>
      </table>
    </div>
  </section>;
}
