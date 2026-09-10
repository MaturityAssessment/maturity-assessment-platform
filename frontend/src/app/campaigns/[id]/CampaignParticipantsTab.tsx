"use client";

import { useMemo, useState } from "react";
import {
  Check,
  Copy,
  FileSpreadsheet,
  FileText,
  Search,
  X,
} from "lucide-react";
import type { CampaignDetail, CampaignParticipant } from "@/api/types";
import { DashboardPanel } from "../../dashboard/components/DashboardPrimitives";
import { isCampaignExpired } from "../campaignForm";

type ParticipantFilter = "all" | "not-started" | "in-progress" | "submitted" | "evaluated";
type ExportFormat = "pdf" | "xlsx";

export default function CampaignParticipantsTab({
  campaign,
  issuingParticipantId,
  copiedParticipantId,
  exportingParticipant,
  onCopyInvitation,
  onExport,
}: {
  campaign: CampaignDetail;
  issuingParticipantId: number | null;
  copiedParticipantId: number | null;
  exportingParticipant: string | null;
  onCopyInvitation: (participantId: number) => void;
  onExport: (participant: CampaignParticipant, format: ExportFormat) => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ParticipantFilter>("all");

  const participants = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return campaign.participants.filter((participant) => {
      const status = participantStatusKey(participant);
      return (
        (!normalizedQuery || participant.email.toLocaleLowerCase().includes(normalizedQuery)) &&
        (filter === "all" || status === filter)
      );
    });
  }, [campaign.participants, filter, query]);

  const clearFilters = () => {
    setQuery("");
    setFilter("all");
  };

  return (
    <div
      id="campaign-panel-participants"
      role="tabpanel"
      aria-labelledby="campaign-tab-participants"
    >
      <DashboardPanel
        title="Participants"
        description={`${campaign.participants.length} invited respondent${
          campaign.participants.length === 1 ? "" : "s"
        }`}
      >
        <div className="mb-5 flex flex-col gap-3 sm:flex-row">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search participants</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search participant email"
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-9 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Clear participant search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </label>
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value as ParticipantFilter)}
            aria-label="Filter participants by status"
            className="h-10 min-w-44 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          >
            <option value="all">Any status</option>
            <option value="not-started">Not started</option>
            <option value="in-progress">In progress</option>
            <option value="submitted">Awaiting evaluation</option>
            <option value="evaluated">Evaluated</option>
          </select>
        </div>

        <div className="mb-2 flex min-h-6 items-center justify-between text-xs text-slate-500">
          <span>Showing {participants.length} of {campaign.participants.length}</span>
          {(query || filter !== "all") && (
            <button type="button" onClick={clearFilters} className="font-semibold text-indigo-600 hover:text-indigo-800">
              Clear filters
            </button>
          )}
        </div>

        {participants.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-9 text-center">
            <h3 className="font-semibold text-slate-900">No participants found</h3>
            <p className="mt-1 text-sm text-slate-500">Try adjusting the current filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="pb-3 pr-5">Participant</th>
                  <th className="px-5 pb-3">Status</th>
                  <th className="px-5 pb-3">Assessment</th>
                  <th className="px-5 pb-3">Invitation</th>
                  <th className="pb-3 pl-5 text-right">Results</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {participants.map((participant) => {
                  const evaluated = participant.assessmentStatus === "COMPLETED";
                  return (
                    <tr key={participant.id}>
                      <td className="py-4 pr-5">
                        <p className="max-w-72 truncate text-sm font-semibold text-slate-900" title={participant.email}>
                          {participant.email}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">Participant #{participant.id}</p>
                      </td>
                      <td className="px-5 py-4">
                        <ParticipantStatus participant={participant} />
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600">
                        {participant.assessmentId ? `#${participant.assessmentId}` : "Not created"}
                      </td>
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => onCopyInvitation(participant.id)}
                          disabled={issuingParticipantId === participant.id || isCampaignExpired(campaign.endsAt)}
                          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                          title="Generating a new link invalidates the previous one"
                        >
                          {copiedParticipantId === participant.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                          {issuingParticipantId === participant.id
                            ? "Generating..."
                            : copiedParticipantId === participant.id
                              ? "Copied"
                              : "Copy new link"}
                        </button>
                      </td>
                      <td className="py-4 pl-5">
                        <div className="flex items-center justify-end gap-1.5">
                          {evaluated ? (
                            <>
                              <ExportButton participant={participant} format="pdf" label="PDF" icon={FileText} exporting={exportingParticipant} onExport={onExport} />
                              <ExportButton participant={participant} format="xlsx" label="XLSX" icon={FileSpreadsheet} exporting={exportingParticipant} onExport={onExport} />
                            </>
                          ) : (
                            <span className="text-xs text-slate-400">Available after evaluation</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </DashboardPanel>
    </div>
  );
}

function ParticipantStatus({ participant }: { participant: CampaignParticipant }) {
  const key = participantStatusKey(participant);
  const styles = {
    "not-started": "bg-slate-100 text-slate-600",
    "in-progress": "bg-blue-50 text-blue-700",
    submitted: "bg-amber-50 text-amber-700",
    evaluated: "bg-emerald-50 text-emerald-700",
  }[key];
  const label = {
    "not-started": "Not started",
    "in-progress": participant.assessmentStatus === "CHANGES_REQUESTED" ? "Changes requested" : "In progress",
    submitted: "Awaiting evaluation",
    evaluated: "Evaluated",
  }[key];
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${styles}`}>{label}</span>;
}

function participantStatusKey(participant: CampaignParticipant): Exclude<ParticipantFilter, "all"> {
  if (participant.assessmentStatus === "COMPLETED") return "evaluated";
  if (participant.assessmentStatus === "PENDING_REVIEW") return "submitted";
  if (participant.assessmentStatus === "DRAFT" || participant.assessmentStatus === "CHANGES_REQUESTED") return "in-progress";
  return "not-started";
}

function ExportButton({
  participant,
  format,
  label,
  icon: Icon,
  exporting,
  onExport,
}: {
  participant: CampaignParticipant;
  format: ExportFormat;
  label: string;
  icon: typeof FileText;
  exporting: string | null;
  onExport: (participant: CampaignParticipant, format: ExportFormat) => void;
}) {
  const key = `${participant.id}:${format}`;
  return (
    <button
      type="button"
      onClick={() => onExport(participant, format)}
      disabled={exporting !== null}
      className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-50"
    >
      <Icon className="h-3.5 w-3.5" />
      {exporting === key ? "Exporting..." : label}
    </button>
  );
}
