"use client";

import { ArrowRight, CheckCircle2, ClipboardCheck, Flag, Layers3 } from "lucide-react";
import type { MaturityModel } from "@/api/types";
import type { EvaluationController } from "./useEvaluation";

export default function EvaluatorOverview({ model, evaluation, onQuestion }: {
  model: MaturityModel;
  evaluation: EvaluationController;
  onQuestion: (responseKey: string) => void;
}) {
  const { questions, reviews, outstanding, progress } = evaluation;
  const percent = progress.total ? Math.round(progress.reviewed / progress.total * 100) : 0;
  return (
    <main id="assessment-panel-overview" role="tabpanel" aria-labelledby="assessment-tab-overview" className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-6 lg:px-10 lg:py-9">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section aria-labelledby="assessment-dimensions-title">
          <h1 id="assessment-dimensions-title" className="text-xl font-bold tracking-tight text-slate-950">Assessment dimensions</h1>
          <p className="mt-1 text-sm leading-6 text-slate-600">Review each dimension’s submitted responses. Continue directly to the next question needing attention.</p>
          <div className="mt-4 space-y-3">
            {model.dimensions.map((dimension, index) => {
              const items = questions.filter(question => question.dimensionId === dimension.id);
              const remaining = outstanding.filter(question => question.dimensionId === dimension.id);
              const reviewed = items.filter(question => !!reviews[question.responseKey]?.validationStatus).length;
              const flagged = items.filter(question => reviews[question.responseKey]?.validationStatus === "FLAGGED").length;
              const dimensionPercent = items.length ? Math.round(reviewed / items.length * 100) : 0;
              const next = remaining[0] || items[0];
              return (
                <section id={`assessment-dimension-${dimension.id}`} key={dimension.id || index} aria-label={dimension.name} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${remaining.length ? "bg-indigo-50 text-indigo-600" : "bg-slate-50 text-slate-500"}`}><Layers3 aria-hidden="true" className="h-5 w-5" /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-semibold text-slate-950">{dimension.name}</h2>
                        {remaining.length ? <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">{remaining.length} need review</span> : <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600">{items.length ? <><CheckCircle2 aria-hidden="true" className="h-3 w-3" />Ready</> : "No submitted responses"}</span>}
                        {flagged > 0 && <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700"><Flag aria-hidden="true" className="h-3 w-3" />{flagged} flagged</span>}
                      </div>
                      {dimension.description && <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-500">{dimension.description}</p>}
                      <div className="mt-3 flex items-center gap-3">
                        <div role="progressbar" aria-label={`${dimension.name} review progress`} aria-valuemin={0} aria-valuemax={items.length || 1} aria-valuenow={reviewed} className="h-1.5 max-w-48 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${dimensionPercent}%` }} /></div>
                        <span className="text-xs tabular-nums text-slate-600"><strong>{reviewed}/{items.length}</strong> reviewed</span>
                      </div>
                    </div>
                    {next && <button type="button" onClick={() => onQuestion(next.responseKey)} aria-label={`${remaining.length ? "Review" : "View review for"} ${dimension.name}`} className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${remaining.length ? "bg-indigo-600 text-white hover:bg-indigo-700" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                      {remaining.length ? <><ClipboardCheck aria-hidden="true" className="h-4 w-4" />Review dimension</> : "View review"}<ArrowRight aria-hidden="true" className="h-4 w-4" />
                    </button>}
                  </div>
                </section>
              );
            })}
            {!model.dimensions.length && <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">No dimensions available</p>}
          </div>
        </section>
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Review progress</h2>
            <p className="mt-5 text-3xl font-semibold tabular-nums text-slate-950">{percent}<span className="text-lg">%</span></p>
            <p className="mt-1 text-sm text-slate-500">{progress.reviewed}/{progress.total} questions reviewed</p>
            <div role="progressbar" aria-label="Overall review progress" aria-valuemin={0} aria-valuemax={progress.total || 1} aria-valuenow={progress.reviewed} className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${percent}%` }} /></div>
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between gap-2"><dt className="text-slate-600">Reviewed</dt><dd className="font-semibold tabular-nums text-slate-900">{progress.reviewed}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-slate-600">Not reviewed</dt><dd className="font-semibold tabular-nums text-slate-900">{progress.total - progress.reviewed}</dd></div>
              <div className="flex justify-between gap-2 border-t border-slate-100 pt-3"><dt className="text-slate-600">Needs attention</dt><dd className="font-semibold tabular-nums text-indigo-700">{outstanding.length}</dd></div>
            </dl>
            <p className="mt-4 text-xs leading-5 text-slate-500">Reviewed questions have an evaluation status. Flagged questions and incomplete scores or notes still need attention.</p>
          </section>
        </aside>
      </div>
    </main>
  );
}
