"use client";

import { BarChart3, Download, Trophy, Users } from "lucide-react";
import type { CampaignDetail, CampaignResults } from "@/api/types";
import { formatScore1ToN } from "@/lib/maturityFormat";

export default function CampaignResultsTab({
  campaign,
  results,
  scaleMax,
  exporting,
  onExport,
}: {
  campaign: CampaignDetail;
  results: CampaignResults;
  scaleMax: number;
  exporting: boolean;
  onExport: () => void;
}) {
  if (results.evaluatedParticipantCount === 0) {
    return (
      <div
        id="campaign-panel-results"
        role="tabpanel"
        aria-labelledby="campaign-tab-results"
        className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-sm"
      >
        <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
          <BarChart3 className="h-6 w-6" />
        </span>
        <h2 className="mt-4 text-lg font-bold text-slate-950">
          No evaluated results yet
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">
          Aggregated results will appear after at least one submitted response
          has completed evaluation.
        </p>
      </div>
    );
  }

  const evaluatedPercentage = results.participantCount
    ? Math.round(
        (results.evaluatedParticipantCount / results.participantCount) * 100
      )
    : 0;

  return (
    <div
      id="campaign-panel-results"
      role="tabpanel"
      aria-labelledby="campaign-tab-results"
      className="space-y-6"
    >
      <section className="relative overflow-hidden rounded-3xl bg-slate-950 px-6 py-7 text-white shadow-xl shadow-slate-950/10 sm:px-8 sm:py-9">
        <div className="absolute -right-24 -top-32 h-72 w-72 rounded-full bg-indigo-500/25 blur-3xl" />
        <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-200">
              Aggregated campaign result
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              {formatScore1ToN(results.overallAverage, scaleMax)}
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Average final score across {results.evaluatedParticipantCount}{" "}
              evaluated response{results.evaluatedParticipantCount === 1 ? "" : "s"}.
            </p>
          </div>
          <button
            type="button"
            onClick={onExport}
            disabled={exporting}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/15 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {exporting ? "Exporting..." : "Export aggregate XLSX"}
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <ResultMetric icon={Users} label="Evaluated responses" value={`${results.evaluatedParticipantCount} / ${results.participantCount}`} />
        <ResultMetric icon={Trophy} label="Evaluation coverage" value={`${evaluatedPercentage}%`} />
        <ResultMetric icon={BarChart3} label="Dimensions reported" value={String(results.dimensions.length)} />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <ResultPanel title="Average by dimension" description="Mean final score for every evaluated response.">
          <div className="space-y-5">
            {results.dimensions.map((dimension) => {
              const percentage = Math.min(100, Math.max(0, (dimension.averageScore / scaleMax) * 100));
              return (
                <div key={dimension.dimensionId}>
                  <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                    <span className="font-semibold text-slate-700">{dimension.dimensionName}</span>
                    <span className="whitespace-nowrap text-slate-500">{formatScore1ToN(dimension.averageScore, scaleMax)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-indigo-600" style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </ResultPanel>

        <ResultPanel title="Maturity-level distribution" description="Final maturity levels across evaluated participants.">
          <div className="space-y-4">
            {results.maturityLevels.map((level) => (
              <div key={level.maturityLevel} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-semibold text-slate-800">{level.maturityLevel}</span>
                  <span className="text-sm font-semibold text-indigo-700">{level.participantCount} · {Math.round(level.percentage)}%</span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${level.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </ResultPanel>
      </section>

      <ResultPanel title="Evaluated participants" description={`Final results included in the ${campaign.name} aggregate.`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="pb-3 pr-5">Participant</th>
                <th className="px-5 pb-3">Assessment</th>
                <th className="px-5 pb-3">Maturity level</th>
                <th className="pb-3 pl-5 text-right">Final score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {results.participants.map((participant) => (
                <tr key={participant.assessmentId}>
                  <td className="py-4 pr-5 text-sm font-semibold text-slate-900">{participant.email}</td>
                  <td className="px-5 py-4 text-sm text-slate-600">#{participant.assessmentId}</td>
                  <td className="px-5 py-4 text-sm text-slate-600">{participant.overallMaturityLevel || "Not available"}</td>
                  <td className="py-4 pl-5 text-right text-sm font-semibold text-slate-800">{formatScore1ToN(participant.overallScore, scaleMax)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ResultPanel>
    </div>
  );
}

function ResultMetric({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><Icon className="h-5 w-5" /></span>
      <div><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p><p className="mt-1 text-xl font-bold text-slate-950">{value}</p></div>
    </div>
  );
}

function ResultPanel({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-bold text-slate-950">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      <div className="mt-6">{children}</div>
    </section>
  );
}
