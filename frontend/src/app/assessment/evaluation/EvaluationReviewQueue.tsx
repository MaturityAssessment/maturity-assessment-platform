"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2, Circle, Flag, Search } from "lucide-react";
import type { MaturityModel } from "@/api/types";
import type { EvaluationController } from "./useEvaluation";

export default function EvaluationReviewQueue({ model, evaluation, onQuestion }: {
  model: MaturityModel;
  evaluation: EvaluationController;
  onQuestion: (key: string) => void;
}) {
  const [filter, setFilter] = useState("attention");
  const [search, setSearch] = useState("");
  const { questions, outstanding, progress, reviews } = evaluation;
  const outstandingKeys = new Set(outstanding.map(question => question.responseKey));
  const ready = questions.length - outstanding.length;
  const percent = questions.length ? Math.round(progress.reviewed / questions.length * 100) : 0;
  const reviewedPercent = questions.length ? (progress.reviewed - progress.flagged) / questions.length * 100 : 0;
  const flaggedPercent = questions.length ? progress.flagged / questions.length * 100 : 0;
  const query = search.trim().toLocaleLowerCase();
  const visible = questions.filter(question => {
    const matches = filter === "all" || (filter === "attention" && outstandingKeys.has(question.responseKey)) ||
      (filter === "ready" && !outstandingKeys.has(question.responseKey)) || (filter === "flagged" && reviews[question.responseKey]?.validationStatus === "FLAGGED");
    return matches && (!query || [question.question.text, question.question.code, question.dimensionName, question.moduleName, question.practiceName].join(" ").toLocaleLowerCase().includes(query));
  });
  const filters = [
    { key: "attention", label: "Needs review", count: outstanding.length },
    { key: "flagged", label: "Flagged", count: progress.flagged },
    { key: "ready", label: "Ready", count: ready },
    { key: "all", label: "All questions", count: questions.length },
  ];
  return (
    <section aria-labelledby="evaluation-progress-heading" className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 id="evaluation-progress-heading" className="text-lg font-semibold text-slate-900">Review progress</h2>
            <p className="mt-1 text-sm text-slate-500">{outstanding.length ? `${outstanding.length} question${outstanding.length === 1 ? "" : "s"} still need attention. Pick up where you left off.` : questions.length ? "All questions are ready. Review your final remarks before finishing." : "There are no submitted responses to review."}</p>
          </div>
          {outstanding[0] && <button type="button" onClick={() => onQuestion(outstanding[0].responseKey)} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 focus-visible:outline-indigo-600">Next question needing review <ArrowRight aria-hidden="true" className="h-4 w-4" /></button>}
        </div>
        <div className="mt-6 flex items-end justify-between gap-3">
          <p className="text-sm text-slate-500"><span className="text-2xl font-semibold tabular-nums text-slate-900">{progress.reviewed}</span> / {questions.length} reviewed</p>
          <span className="text-sm font-medium tabular-nums text-indigo-700">{percent}%</span>
        </div>
        <div role="progressbar" aria-label="Questions reviewed" aria-valuemin={0} aria-valuemax={questions.length || 1} aria-valuenow={progress.reviewed} aria-valuetext={`${progress.reviewed} of ${questions.length} reviewed, ${progress.flagged} flagged`} className="mt-3 flex h-2 overflow-hidden rounded-full bg-slate-100">
          <div style={{ width: `${reviewedPercent}%` }} className="h-full bg-indigo-500 transition-all" />
          <div style={{ width: `${flaggedPercent}%` }} className="h-full bg-amber-500 transition-all" />
        </div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500"><span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-2 w-2 rounded-full bg-indigo-500" />{progress.reviewed - progress.flagged} reviewed without flags</span><span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-2 w-2 rounded-full bg-amber-500" />{progress.flagged} flagged</span><span>{progress.missingManualScores} missing scores</span><span>{progress.missingNotes} missing notes</span></div>
      </div>
      <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/60 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div role="group" aria-label="Filter questions" className="flex flex-wrap gap-1">
          {filters.map(item => <button key={item.key} type="button" aria-pressed={filter === item.key} onClick={() => setFilter(item.key)} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium focus-visible:outline-indigo-600 ${filter === item.key ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200" : "text-slate-600 hover:bg-slate-100"}`}>{item.label}<span className="text-xs tabular-nums opacity-75">{item.count}</span></button>)}
        </div>
        <div className="relative sm:w-64"><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" /><input type="search" aria-label="Search questions" placeholder="Search questions…" value={search} onChange={event => setSearch(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100" /></div>
      </div>
      <div className="divide-y divide-slate-100">
        {model.dimensions.map(dimension => {
          const all = questions.filter(question => question.dimensionId === dimension.id);
          const rows = visible.filter(question => question.dimensionId === dimension.id);
          if (!rows.length) return null;
          const dimensionReviewed = all.filter(question => !!reviews[question.responseKey]?.validationStatus).length;
          return <section key={dimension.id} className="p-4 sm:p-6" aria-label={dimension.name}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold text-slate-900">{dimension.name}</h3><span className="text-xs tabular-nums text-slate-500">{dimensionReviewed}/{all.length} reviewed</span></div>
            <ul className="space-y-2">{rows.map(question => {
              const review = reviews[question.responseKey];
              const isReady = !outstandingKeys.has(question.responseKey);
              const flagged = review?.validationStatus === "FLAGGED";
              const labels: string[] = [];
              if (!review?.validationStatus) labels.push("Not reviewed");
              if (flagged) labels.push("Flagged");
              if ((question.requiresManualScore || review?.validationStatus === "ADJUSTED") && typeof review?.manualScore !== "number") labels.push("Score needed");
              if ((review?.validationStatus === "ADJUSTED" || flagged) && !review?.reviewerNote.trim()) labels.push("Note needed");
              const Icon = isReady ? CheckCircle2 : flagged ? Flag : Circle;
              return <li key={question.responseKey}><button type="button" onClick={() => onQuestion(question.responseKey)} className="group flex w-full items-start gap-3 rounded-lg border border-slate-200 px-4 py-3 text-left transition hover:border-indigo-300 hover:bg-indigo-50/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 sm:items-center">
                <Icon aria-hidden="true" className={`mt-0.5 h-4 w-4 shrink-0 sm:mt-0 ${isReady ? "text-emerald-600" : flagged ? "text-amber-600" : "text-slate-400"}`} />
                <div className="min-w-0 flex-1"><p className="text-xs text-slate-500">{question.moduleName} / {question.practiceName}</p><p className="mt-1 text-sm font-medium leading-relaxed text-slate-900">{question.question.code && <span className="mr-2 text-slate-500">{question.question.code}</span>}{question.question.text}</p><div className="mt-2 flex flex-wrap gap-1.5">{(isReady ? ["Ready"] : labels).map(label => <span key={label} className={`rounded-md px-2 py-0.5 text-xs font-medium ${isReady ? "bg-emerald-50 text-emerald-700" : label === "Flagged" ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-600"}`}>{label}</span>)}</div></div>
                <ArrowRight aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-slate-400 group-hover:text-indigo-600 sm:mt-0" />
              </button></li>;
            })}</ul>
          </section>;
        })}
      </div>
      {!visible.length && <div role="status" className="px-6 py-12 text-center"><CheckCircle2 aria-hidden="true" className="mx-auto mb-3 h-7 w-7 text-slate-400" /><p className="text-sm font-medium text-slate-900">{query ? "No matching questions" : filter === "attention" ? "Nothing left to review" : "No questions in this view"}</p><p className="mt-1 text-sm text-slate-500">{query ? "Try a different question, practice or dimension name." : "Use the filters to browse the other questions."}</p></div>}
    </section>
  );
}
