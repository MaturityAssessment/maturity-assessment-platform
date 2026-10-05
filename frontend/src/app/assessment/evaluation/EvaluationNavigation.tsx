"use client";

import { ArrowRight, CheckCircle2, LayoutDashboard } from "lucide-react";
import type { EvaluationController } from "./useEvaluation";

export default function EvaluationNavigation({ evaluation, onSummary, onNext }: {
  evaluation: EvaluationController;
  onSummary: () => void;
  onNext: () => void;
}) {
  const { progress, outstanding, error, busy } = evaluation;
  const percent = progress.total ? Math.round(progress.reviewed / progress.total * 100) : 0;
  const reviewedWidth = progress.total ? (progress.reviewed - progress.flagged) / progress.total * 100 : 0;
  const flaggedWidth = progress.total ? progress.flagged / progress.total * 100 : 0;

  return (
    <nav aria-label="Evaluation navigation" className="z-20 shrink-0 border-t border-slate-200 bg-white px-4 py-3 shadow-[0_-4px_20px_rgba(15,23,42,0.04)] sm:px-6 xl:px-8" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-x-5 gap-y-3">
        <button type="button" onClick={onSummary} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
          <LayoutDashboard aria-hidden="true" className="h-4 w-4" />
          <span>Evaluation summary</span>
        </button>
        <div className="order-last w-full sm:order-none sm:w-auto sm:min-w-48 sm:max-w-sm sm:flex-1">
          <div className="flex items-center justify-between gap-4 text-xs">
            <span className="font-medium text-slate-600"><strong className="font-semibold tabular-nums text-slate-900">{progress.reviewed}/{progress.total}</strong> reviewed</span>
            <span className="font-semibold tabular-nums text-indigo-700">{percent}%</span>
          </div>
          <div role="progressbar" aria-label="Evaluation review progress" aria-valuemin={0} aria-valuemax={progress.total || 1} aria-valuenow={progress.reviewed} aria-valuetext={`${progress.reviewed} of ${progress.total} reviewed, ${progress.flagged} flagged`} className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full bg-indigo-500 transition-all" style={{ width: `${reviewedWidth}%` }} />
            <div className="h-full bg-amber-500 transition-all" style={{ width: `${flaggedWidth}%` }} />
          </div>
          <p className="mt-1.5 text-[11px] text-slate-500">{outstanding.length} need attention{progress.flagged > 0 && <span className="ml-2 text-amber-700">· {progress.flagged} flagged</span>}</p>
        </div>
        {outstanding.length > 0 ? (
          <button type="button" onClick={onNext} disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50">
            Next to review <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </button>
        ) : (
          <span role="status" className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700"><CheckCircle2 aria-hidden="true" className="h-4 w-4" />All questions ready</span>
        )}
      </div>
      {error && <p role="alert" className="mx-auto mt-2 max-w-[1440px] text-xs text-red-700">{error}</p>}
    </nav>
  );
}
