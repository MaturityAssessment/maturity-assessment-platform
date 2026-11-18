"use client";

import type { MaturityLevel, TargetProfileComparison } from "@/api/types";
import { targetReasonLabel, targetStatusLabel } from "@/lib/targetProfiles";

const percentage = (value: number) => (Math.round(value * 1000) / 10).toLocaleString() + "%";
export default function TargetProfileResults({ comparison, levels }: { comparison: TargetProfileComparison; levels?: MaturityLevel[] }) {
  const format = (value: number, overall: boolean) => overall ? (levels?.find(level => level.number === value)?.name || "Level " + value) : percentage(value);
  return <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7" aria-label="Target profile comparison">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Target profile comparison</p><h2 className="mt-1 text-xl font-semibold text-slate-950">{comparison.profileName || "No target profile"}</h2></div>
      <span className={"rounded-full px-3 py-1.5 text-sm font-semibold " + (comparison.status === "MET" ? "bg-emerald-100 text-emerald-900" : comparison.status === "NOT_MET" ? "bg-rose-100 text-rose-900" : "bg-slate-100 text-slate-700")}>{targetStatusLabel(comparison.status)}</span>
    </div>
    {comparison.reason && <p className="mt-3 text-sm leading-6 text-slate-600">{targetReasonLabel(comparison.reason)}</p>}
    {comparison.requirements.length > 0 && <>
      <p className="mt-3 text-sm leading-6 text-slate-600">Each result must reach its minimum. Any failed target makes the profile outcome “not met”; unavailable scores remain “not evaluated.”</p>
      <div className="mt-5 flex flex-wrap gap-4 text-xs text-slate-600" aria-hidden="true"><span className="inline-flex items-center gap-2"><span className="h-2 w-5 rounded bg-indigo-500" />Actual score</span><span className="inline-flex items-center gap-2"><span className="h-4 border-l-2 border-slate-800" />Minimum target</span></div>
      <div className="mt-5 space-y-5">
        {comparison.requirements.map((requirement, index) => {
          const overall = requirement.elementType === "overall";
          return <div key={index} className="rounded-xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2"><div><span className="text-xs capitalize text-slate-500">{overall ? "Overall maturity level" : requirement.elementType}</span><h3 className="text-sm font-semibold text-slate-950">{requirement.name}</h3></div><span className={"text-xs font-semibold " + (requirement.status === "MET" ? "text-emerald-700" : requirement.status === "NOT_MET" ? "text-rose-700" : "text-slate-500")}>{targetStatusLabel(requirement.status)}</span></div>
            {!overall && <div className="relative mb-2 mt-4 h-3 rounded-full bg-slate-100" aria-hidden="true">
              {requirement.actual != null && <div className="h-full rounded-full bg-indigo-500" style={{ width: Math.max(0, Math.min(1, requirement.actual)) * 100 + "%" }} />}
              <span className="absolute -top-1 h-5 border-l-2 border-slate-800" style={{ left: requirement.target * 100 + "%", transform: "translateX(-1px)" }} />
            </div>}
            <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-slate-600">
              <span>Actual: <strong className="font-semibold text-slate-900">{requirement.actual == null ? targetReasonLabel(requirement.reason) || "Unavailable" : format(requirement.actual, overall)}</strong></span>
              <span>Minimum: <strong className="font-semibold text-slate-900">{format(requirement.target, overall)}</strong></span>
            </div>
          </div>;
        })}
      </div>
    </>}
  </section>;
}
