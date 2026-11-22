"use client";

import { ChevronDown, Target } from "lucide-react";
import type { MaturityLevel, TargetProfileComparison, TargetProfileStatus } from "@/api/types";
import { targetReasonLabel, targetStatusLabel } from "@/lib/targetProfiles";
import { cn } from "@/lib/utils";

const percentage = (value: number) => (Math.round(value * 1000) / 10).toLocaleString() + "%";

const statusStyles: Record<TargetProfileStatus, string> = {
  MET: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  NOT_MET: "bg-rose-50 text-rose-700 ring-rose-600/15",
  NOT_EVALUATED: "bg-slate-100 text-slate-600 ring-slate-500/10",
};

function StatusBadge({ status }: { status: TargetProfileStatus }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset", statusStyles[status])}>
      {targetStatusLabel(status)}
    </span>
  );
}

export default function TargetProfileResults({ comparison, levels }: { comparison: TargetProfileComparison; levels?: MaturityLevel[] }) {
  const format = (value: number, overall: boolean) => overall ? (levels?.find(level => level.number === value)?.name || "Level " + value) : percentage(value);
  const metCount = comparison.requirements.filter(requirement => requirement.status === "MET").length;
  const unavailableCount = comparison.requirements.filter(requirement => requirement.status === "NOT_EVALUATED").length;
  const summary = comparison.requirements.length
    ? `${metCount} of ${comparison.requirements.length} ${comparison.requirements.length === 1 ? "target" : "targets"} met${unavailableCount ? ` · ${unavailableCount} not evaluated` : ""}`
    : targetReasonLabel(comparison.reason) || "No target requirements to compare.";

  return (
    <section className="mt-6" aria-label="Target profile comparison">
      <details className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <summary className="flex cursor-pointer list-none items-center gap-3 rounded-2xl px-4 py-4 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 sm:gap-4 sm:px-6 [&::-webkit-details-marker]:hidden">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500 ring-1 ring-inset ring-slate-200/70">
            <Target className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-slate-500">Target profile</p>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <h2 className="min-w-0 break-words text-sm font-semibold text-slate-900">{comparison.profileName || "No target profile"}</h2>
              <StatusBadge status={comparison.status} />
              <span className="text-xs leading-5 text-slate-500">{summary}</span>
            </div>
          </div>
          <span className="hidden shrink-0 text-xs font-medium text-slate-500 sm:block" aria-hidden="true">
            <span className="group-open:hidden">View details</span>
            <span className="hidden group-open:inline">Hide details</span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
        </summary>

        <div className="border-t border-slate-100 px-4 pb-1 pt-4 sm:px-6">
          {comparison.reason && comparison.requirements.length > 0 && (
            <p className="mb-3 text-xs leading-5 text-slate-600">{targetReasonLabel(comparison.reason)}</p>
          )}
          {comparison.requirements.length > 0 ? (
            <>
              <div className="mb-1 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
                <p className="text-xs leading-5 text-slate-500">Every minimum must be met. Unavailable scores remain not evaluated.</p>
                <div className="flex items-center gap-4 text-[11px] text-slate-500" aria-hidden="true">
                  <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-4 rounded-full bg-indigo-500" />Actual</span>
                  <span className="inline-flex items-center gap-1.5"><span className="h-3 border-l-2 border-slate-600" />Minimum</span>
                </div>
              </div>
              <ul className="divide-y divide-slate-100">
                {comparison.requirements.map((requirement, index) => {
                  const overall = requirement.elementType === "overall";
                  return (
                    <li key={index} className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-center sm:gap-8">
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="break-words text-sm font-medium text-slate-900">{requirement.name}</h3>
                          {!overall && <p className="mt-0.5 text-[11px] capitalize text-slate-500">{requirement.elementType}</p>}
                        </div>
                        <StatusBadge status={requirement.status} />
                      </div>
                      <div className="min-w-0">
                        <dl className="grid grid-cols-2 gap-3 text-xs leading-5">
                          <div><dt className="inline text-slate-500">Actual: </dt><dd className="inline font-medium text-slate-900">{requirement.actual == null ? targetReasonLabel(requirement.reason) || "Unavailable" : format(requirement.actual, overall)}</dd></div>
                          <div className="text-right"><dt className="inline text-slate-500">Minimum: </dt><dd className="inline font-medium text-slate-900">{format(requirement.target, overall)}</dd></div>
                        </dl>
                        {!overall && (
                          <div className="relative mb-1 mt-2 h-1.5 rounded-full bg-slate-100" aria-hidden="true">
                            {requirement.actual != null && <div className="h-full rounded-full bg-indigo-500" style={{ width: Math.max(0, Math.min(1, requirement.actual)) * 100 + "%" }} />}
                            <span className="absolute -top-1 h-3.5 border-l-2 border-slate-600" style={{ left: requirement.target * 100 + "%", transform: "translateX(-1px)" }} />
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <p className="pb-3 text-xs leading-5 text-slate-600">{targetReasonLabel(comparison.reason) || "This profile has no target requirements to compare."} Your final evaluation is shown above.</p>
          )}
        </div>
      </details>
    </section>
  );
}
