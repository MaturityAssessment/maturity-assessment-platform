"use client";

import type { AssessmentResponse } from "@/api/types";
import type { AssessmentPracticeStep } from "@/app/assessment/AssessmentStep";
import { buildAssessmentPracticeHref, type AssessmentRouteContext } from "@/app/assessment/assessmentRoutes";
import { freshnessLabel, freshnessWarning } from "@/app/assessment/evidenceLifecycle";
import { evidenceToday } from "@/app/assessment/assessmentEvidence";

export default function EvidenceLifecyclePanel({ assessment, referenceDate, onReferenceDateChange, readOnly = true,
  practiceSteps = [], routeContext = null, refreshingError, pending = false }: {
  assessment: AssessmentResponse; referenceDate?: string; onReferenceDateChange?: (date: string) => void;
  readOnly?: boolean; practiceSteps?: AssessmentPracticeStep[]; routeContext?: AssessmentRouteContext | null;
  refreshingError?: string | null; pending?: boolean;
}) {
  const historical = assessment.historicalEvidenceValidity;
  const current = assessment.currentEvidenceFreshness;
  const warning = freshnessWarning(current);
  const date = referenceDate ?? assessment.referenceDate ?? "";
  return <section aria-label="Evidence lifecycle" className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-xl">
        <h2 className="text-sm font-semibold text-slate-900">Evidence lifecycle</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">Historical validity uses the assessment reference date. Current freshness uses today. Evidence age does not change scores.</p>
      </div>
      <label className="text-xs font-medium text-slate-700">Assessment reference date
        {readOnly ? <span className="mt-1 block text-sm">{date || "Unknown (legacy)"}</span> : <input type="date" required max={evidenceToday()}
          value={date} className="mt-1 block rounded-lg border border-slate-300 p-2 text-sm" onChange={event => { if (event.target.value) onReferenceDateChange?.(event.target.value); }} />}
        {assessment.referenceDateInferred && <span className="mt-1 block max-w-56 text-xs font-normal text-amber-700">Legacy date inferred from assessment creation.</span>}
      </label>
    </div>
    {pending || (historical && historical.evaluatedOn !== date) ? <p className="mt-3 text-xs text-slate-500">Validity will refresh after your changes are saved.</p>
      : historical && <p className="mt-3 text-xs text-slate-600">At reference date ({historical.evaluatedOn}): {historical.outdatedIndicatorCount} outdated · {historical.unknownDateIndicatorCount} with unknown dates · {historical.missingIndicatorCount} missing required indicators.</p>}
    {current && <details className="mt-3 rounded-lg bg-slate-50 p-3">
      <summary className={`cursor-pointer text-sm font-medium ${warning ? "text-amber-800" : "text-slate-700"}`}>
        Current evidence ({current.evaluatedOn}): {warning || "No outdated required indicators"}
      </summary>
      <p className="mt-2 text-xs text-slate-500">Last checked {new Date(current.calculatedAt).toLocaleString()}. Completed results remain unchanged.</p>
      <ul className="mt-3 space-y-2">
        {current.indicators.map(indicator => {
          const step = practiceSteps.find(step => step.practice.id === indicator.practiceId);
          return <li key={`${indicator.practiceId}:${indicator.requirementCode}`} className="rounded-lg border border-slate-200 bg-white p-3 text-xs">
            <span className="font-medium text-slate-800">{indicator.requirementName}</span>
            <span className={`ml-2 ${indicator.status === "OUTDATED" ? "text-amber-800" : "text-slate-600"}`}>{freshnessLabel[indicator.status]}</span>
            <p className="mt-1 text-slate-500">{indicator.practiceName}{indicator.validThrough ? ` · Latest validity date: ${indicator.validThrough}` : ""}{indicator.required ? " · Required" : " · Optional"}</p>
            {step && step.dimension.id && step.module.code && step.practice.code && <a className="mt-2 inline-block font-medium text-indigo-700 underline" href={buildAssessmentPracticeHref(step, routeContext)}>View practice evidence</a>}
          </li>;
        })}
        {!current.indicators.length && <li className="text-xs text-slate-500">No applicable named evidence indicators.</li>}
      </ul>
    </details>}
    {refreshingError && <p role="status" className="mt-3 text-xs text-amber-800">{refreshingError} Freshness values are from the last successful check.</p>}
  </section>;
}
