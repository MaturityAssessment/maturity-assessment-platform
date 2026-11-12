"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronRight, FileClock, Filter, Loader2 } from "lucide-react";
import apiClient from "@/api/axios";
import type { AssessmentLog, AssessmentLogPage, MaturityModel } from "@/api/types";
import { assessmentLogAction, assessmentLogTarget, buildLogQuestions, describeAssessmentLog, formatLogValue, changeLogFilter, logEntryFilters, emptyLogFilters, logFilterOptions, type LogFilters, type LogQuestion } from "./assessmentLogs";

type Props = { assessmentId?: number; campaignId?: string; model: MaturityModel | null };

export default function AssessmentLogsTab({ assessmentId, campaignId, model }: Props) {
  const [filters, setFilters] = useState<LogFilters>(emptyLogFilters);
  const options = logFilterOptions(model, filters);
  const filterFields = [
    { key: "dimensionId", label: "Dimension", disabled: false, options: options.dimensions.map(d => ({ value: d.id || "", label: `${d.id} — ${d.name}` })) },
    { key: "moduleCode", label: "Module", disabled: !filters.dimensionId, options: options.modules.map(m => ({ value: m.code || "", label: `${m.code} — ${m.name}` })) },
    { key: "practiceId", label: "Practice", disabled: !filters.moduleCode, options: options.practices.map(p => ({ value: String(p.id), label: `${p.code} — ${p.name}` })) },
    { key: "questionId", label: "Question", disabled: !filters.practiceId, options: options.questions.map(q => ({ value: String(q.id), label: `${q.code} — ${q.text}` })) },
  ] as const;
  const questions = useMemo(() => buildLogQuestions(model), [model]);
  return (
    <main id="assessment-panel-logs" role="tabpanel" aria-labelledby="assessment-tab-logs"
      className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-10">
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-6">
          <div>
            <h1 className="flex items-center gap-2 text-lg font-bold text-slate-950"><FileClock className="h-5 w-5 text-indigo-600" aria-hidden="true" /> Activity log</h1>
            <p className="mt-1 text-xs text-slate-500">Newest first · Local time · Expand a row for details</p>
          </div>
        </div>
        <div className="grid gap-3 border-b border-slate-200 bg-slate-50/60 px-4 py-3 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          {filterFields.map(field => <div key={field.key} className="min-w-0">
            <label htmlFor={`log-filter-${field.key}`} className="mb-1 block text-xs font-medium text-slate-600">{field.label}</label>
            <select id={`log-filter-${field.key}`} value={filters[field.key]} disabled={field.disabled}
              onChange={event => setFilters(current => changeLogFilter(current, field.key, event.target.value))}
              className="w-full min-w-0 rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-8 text-xs text-slate-800 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400">
              <option value="">{field.disabled ? `Select ${field.key === "moduleCode" ? "dimension" : field.key === "practiceId" ? "module" : "practice"} first` : `All ${field.label.toLowerCase()}s`}</option>
              {field.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>)}
          {filters.dimensionId && <button type="button" onClick={() => setFilters(emptyLogFilters)} className="w-fit text-xs font-semibold text-indigo-700 hover:underline">Clear filters</button>}
        </div>
        <LogEntries key={`${assessmentId}-${campaignId}-${JSON.stringify(filters)}`} assessmentId={assessmentId} campaignId={campaignId}
          filters={filters} questions={questions} model={model} onFilter={setFilters} />
      </section>
    </main>
  );
}

function LogEntries({ assessmentId, campaignId, filters, questions, model, onFilter }: {
  assessmentId?: number; campaignId?: string; filters: LogFilters; questions: Map<number, LogQuestion>;
  model: MaturityModel | null; onFilter: (filters: LogFilters) => void;
}) {
  const { dimensionId, moduleCode, practiceId, questionId } = filters;
  const [entries, setEntries] = useState<AssessmentLog[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!assessmentId) { setLoading(false); return; }
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    const url = campaignId ? `/api/v1/campaign-response/${campaignId}/logs` : `/api/v1/assessments/${assessmentId}/logs`;
    apiClient.get<AssessmentLogPage>(url, { params: { page, dimensionId: dimensionId || undefined, moduleCode: moduleCode || undefined, practiceId: practiceId || undefined, questionId: questionId || undefined }, signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        setEntries(current => page === 0 ? data.entries :
          [...current, ...data.entries.filter(entry => !current.some(existing => existing.id === entry.id))]);
        setHasMore(data.hasMore);
      })
      .catch(() => { if (!controller.signal.aborted) setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [assessmentId, campaignId, dimensionId, moduleCode, practiceId, questionId, page, retry]);

  return <div aria-busy={loading}>
    {!loading && !error && entries.length === 0 && (
      <p role="status" className="px-6 py-12 text-center text-sm text-slate-500">{dimensionId
        ? "No activity matches these filters."
        : "No activity has been recorded yet. Changes made before activity logging was introduced are not included."}</p>
    )}
    <ol className="divide-y divide-slate-100">
      {entries.map(entry => {
        const target = assessmentLogTarget(entry, questions);
        const actor = entry.actorName?.trim() || entry.actorEmail || "Respondent";
        const fullTime = new Date(entry.occurredAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "long" });
        const shortcut = logEntryFilters(entry, model);
        const filterLabel = entry.targetType === "QUESTION" ? "Filter by this question" : "Filter by this practice";
        return <li key={entry.id} className="relative">
          <details className="group">
            <summary className="grid cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto_16px] items-center gap-x-3 gap-y-1 pl-4 pr-14 py-2.5 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 lg:grid-cols-[150px_minmax(130px,1fr)_minmax(180px,1.5fr)_minmax(80px,0.7fr)_16px] sm:pl-6 sm:pr-16 xl:pr-52 [&::-webkit-details-marker]:hidden">
              <time dateTime={entry.occurredAt} title={fullTime} className="text-xs tabular-nums text-slate-500 lg:col-start-1 lg:row-start-1">
                {new Date(entry.occurredAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </time>
              <span title={target} className="col-start-1 row-start-2 truncate font-mono text-xs font-medium text-indigo-700 lg:col-start-2 lg:row-start-1">{target}</span>
              <span title={assessmentLogAction(entry.action)} className="col-start-2 row-start-2 max-w-36 lg:max-w-none truncate text-xs font-medium text-slate-800 lg:col-start-3 lg:row-start-1">{assessmentLogAction(entry.action)}</span>
              <span title={actor} className="col-start-2 row-start-1 max-w-32 truncate text-xs text-slate-500 lg:col-start-4 lg:row-start-1 lg:max-w-none">{actor}</span>
              <ChevronRight className="col-start-3 row-start-1 h-4 w-4 justify-self-end text-slate-400 transition-transform group-open:rotate-90 lg:col-start-5" aria-hidden="true" />
            </summary>
            <div className="border-t border-slate-100 bg-slate-50 px-4 py-4 sm:px-6">
              <p className="mb-1 break-words font-mono text-xs font-medium text-indigo-700">{target}</p>
              <p className="break-words text-sm leading-6 text-slate-800">{describeAssessmentLog(entry)}</p>
              <p className="mt-1 text-xs text-slate-500">{fullTime}{entry.actorEmail ? ` · ${entry.actorEmail}` : ""}</p>
              <dl className="mt-3 grid gap-4 sm:grid-cols-2">
                {([['Before', entry.beforeValue], ['After', entry.afterValue]] as const).map(([label, value]) => (
                  <div key={label} className="min-w-0 rounded-lg border border-slate-200 bg-white p-3">
                    <dt className="text-xs font-semibold text-slate-500">{label}</dt>
                    <dd className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-800">{formatLogValue(entry, value, questions.get(entry.targetId)?.question)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </details>
          {shortcut && <button type="button" title={filterLabel} aria-label={filterLabel}
            onClick={() => onFilter(shortcut)}
            className="absolute right-3 top-1.5 inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-indigo-700 hover:bg-indigo-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 sm:right-4">
            <Filter className="h-3.5 w-3.5" aria-hidden="true" /><span className="hidden xl:inline">{filterLabel}</span>
          </button>}
        </li>;
      })}
    </ol>
    {error && <div role="alert" className="px-6 py-4 text-sm text-red-700">
      <span>Activity could not be loaded.</span>{" "}
      <button type="button" className="font-semibold underline" onClick={() => setRetry(value => value + 1)}>Try again</button>
    </div>}
    {loading && <p role="status" className="flex items-center justify-center gap-2 py-5 text-sm text-slate-500">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading activity…
    </p>}
    {!loading && !error && hasMore && <div className="border-t border-slate-100 px-6 py-3">
      <button type="button" onClick={() => setPage(value => value + 1)} className="text-xs font-semibold text-indigo-700 hover:underline">Load older activity</button>
    </div>}
  </div>;
}
