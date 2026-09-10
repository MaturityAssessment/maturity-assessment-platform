import {
  BarChart3,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Users,
} from "lucide-react";
import type { CampaignDetail, CampaignResults } from "@/api/types";
import { isCampaignExpired } from "../campaignForm";

export default function CampaignOverviewTab({
  campaign,
  results,
}: {
  campaign: CampaignDetail;
  results: CampaignResults;
}) {
  const submittedPercentage = results.participantCount
    ? Math.round(
        (results.submittedParticipantCount / results.participantCount) * 100
      )
    : 0;

  return (
    <div
      id="campaign-panel-overview"
      role="tabpanel"
      aria-labelledby="campaign-tab-overview"
      className="space-y-6"
    >
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Campaign status"
          value={isCampaignExpired(campaign.endsAt) ? "Ended" : "Active"}
          detail={`Ends ${formatDate(campaign.endsAt)}`}
          icon={CalendarClock}
        />
        <SummaryCard
          label="Participants"
          value={String(results.participantCount)}
          detail="Invited respondents"
          icon={Users}
        />
        <SummaryCard
          label="Submitted"
          value={`${results.submittedParticipantCount} / ${results.participantCount}`}
          detail={`${submittedPercentage}% response rate`}
          icon={ClipboardList}
        />
        <SummaryCard
          label="Evaluated"
          value={String(results.evaluatedParticipantCount)}
          detail="Final results available"
          icon={CheckCircle2}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">
            Campaign progress
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Submission and evaluation progress across all invited participants.
          </p>

          <div className="mt-7 space-y-6">
            <ProgressRow
              label="Responses submitted"
              value={results.submittedParticipantCount}
              total={results.participantCount}
              color="bg-indigo-600"
            />
            <ProgressRow
              label="Evaluations completed"
              value={results.evaluatedParticipantCount}
              total={results.participantCount}
              color="bg-emerald-500"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-950">
              Campaign details
            </h2>
          </div>
          <dl className="mt-5 space-y-4 text-sm">
            <DetailRow label="Maturity model" value={campaign.maturityModelName} />
            <DetailRow label="Model version" value={`Version ${campaign.maturityModelVersion}`} />
            <DetailRow label="Created" value={formatDate(campaign.createdAt)} />
            <DetailRow label="End date" value={formatDate(campaign.endsAt)} />
          </dl>
        </div>
      </section>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Users;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{detail}</p>
        </div>
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
    </div>
  );
}

function ProgressRow({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const percentage = total ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-4 text-sm">
        <span className="font-semibold text-slate-700">{label}</span>
        <span className="text-slate-500">
          {value} of {total} · {percentage}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-5 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-semibold text-slate-800">{value}</dd>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
