"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  Megaphone,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import type { CampaignSummary } from "@/api/types";
import { DashboardPanel } from "../dashboard/components/DashboardPrimitives";
import { isCampaignExpired } from "./campaignForm";

type CampaignStatusFilter = "all" | "active" | "ended";

function formatCampaignDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function CampaignIcon() {
  return (
    <span
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"
      aria-hidden="true"
    >
      <Megaphone className="h-5 w-5" strokeWidth={1.9} />
    </span>
  );
}

function CampaignStatusBadge({ ended }: { ended: boolean }) {
  return ended ? (
    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
      Ended
    </span>
  ) : (
    <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
      Active
    </span>
  );
}

export default function CampaignsPanel({
  campaigns,
  deletingCampaignId,
  onDelete,
}: {
  campaigns: CampaignSummary[];
  deletingCampaignId: number | null;
  onDelete: (campaign: CampaignSummary) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<CampaignStatusFilter>("all");

  const visibleCampaigns = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
    return campaigns.filter((campaign) => {
      const ended = isCampaignExpired(campaign.endsAt);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "ended" ? ended : !ended);
      const matchesSearch =
        !normalizedQuery ||
        [
          campaign.name,
          campaign.maturityModelName,
          `version ${campaign.maturityModelVersion}`,
        ].some((value) =>
          value.toLocaleLowerCase().includes(normalizedQuery)
        );
      return matchesStatus && matchesSearch;
    });
  }, [campaigns, searchQuery, statusFilter]);

  const hasActiveFilters =
    searchQuery.trim().length > 0 || statusFilter !== "all";

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
  };

  return (
    <DashboardPanel
      id="campaign-list"
      title="Campaign overview"
      description={`${campaigns.length} campaign${
        campaigns.length === 1 ? "" : "s"
      } created`}
    >
      {campaigns.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
          <span className="mx-auto flex w-fit">
            <CampaignIcon />
          </span>
          <h3 className="mt-3 font-semibold text-slate-900">
            No campaigns yet
          </h3>
          <p className="mx-auto mt-1 max-w-lg text-sm text-slate-500">
            Create a campaign to invite participants and track their assessment
            completion in one place.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Search campaigns</span>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search campaigns or models"
                className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-9 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  aria-label="Clear campaign search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </label>

            <label>
              <span className="sr-only">Filter campaigns by status</span>
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as CampaignStatusFilter)
                }
                className="h-10 w-full min-w-40 rounded-lg border border-slate-200 bg-white px-3 pr-8 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 sm:w-auto"
              >
                <option value="all">Any status</option>
                <option value="active">Active</option>
                <option value="ended">Ended</option>
              </select>
            </label>
          </div>

          <div className="mb-2 flex min-h-6 items-center justify-between gap-4 text-xs text-slate-500">
            <span aria-live="polite">
              Showing {visibleCampaigns.length} of {campaigns.length} campaign
              {campaigns.length === 1 ? "" : "s"}
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="font-semibold text-indigo-600 hover:text-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                Clear filters
              </button>
            )}
          </div>

          {visibleCampaigns.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center">
              <h3 className="font-semibold text-slate-900">
                No campaigns found
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Try adjusting your search or status filter.
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 text-sm font-semibold text-indigo-600 hover:text-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[940px] border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="pb-3 pr-5">Campaign</th>
                    <th className="px-5 pb-3">Maturity model</th>
                    <th className="px-5 pb-3">Schedule</th>
                    <th className="px-5 pb-3">Completion</th>
                    <th className="px-5 pb-3">Status</th>
                    <th className="pb-3 pl-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleCampaigns.map((campaign) => {
                    const ended = isCampaignExpired(campaign.endsAt);
                    const deleting = deletingCampaignId === campaign.id;
                    const completionPercentage = campaign.participantCount
                      ? Math.round(
                          (campaign.completedParticipantCount /
                            campaign.participantCount) *
                            100
                        )
                      : 0;

                    return (
                      <tr key={campaign.id} className="group">
                        <td className="py-4 pr-5">
                          <Link
                            href={`/campaigns/${campaign.id}`}
                            className="flex max-w-sm items-center gap-3 rounded focus:outline-none focus:ring-2 focus:ring-indigo-300"
                          >
                            <CampaignIcon />
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-slate-900 transition group-hover:text-indigo-700">
                                {campaign.name}
                              </span>
                              <span className="mt-0.5 block text-xs text-slate-500">
                                Campaign #{campaign.id}
                              </span>
                            </span>
                          </Link>
                        </td>
                        <td className="px-5 py-4">
                          <span className="block max-w-56 truncate text-sm font-medium text-slate-700">
                            {campaign.maturityModelName}
                          </span>
                          <span className="mt-0.5 block text-xs text-slate-500">
                            Version {campaign.maturityModelVersion}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-5 py-4">
                          <span className="flex items-center gap-2 text-sm text-slate-600">
                            <CalendarClock
                              className="h-4 w-4 text-slate-400"
                              aria-hidden="true"
                            />
                            {formatCampaignDate(campaign.endsAt)}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex min-w-40 items-center gap-3">
                            <div
                              className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100"
                              aria-hidden="true"
                            >
                              <div
                                className="h-full rounded-full bg-indigo-600"
                                style={{ width: `${completionPercentage}%` }}
                              />
                            </div>
                            <span className="w-9 text-right text-xs font-medium text-slate-600">
                              {completionPercentage}%
                            </span>
                          </div>
                          <span className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
                            <Users className="h-3.5 w-3.5" aria-hidden="true" />
                            {campaign.completedParticipantCount} of{" "}
                            {campaign.participantCount} completed
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <CampaignStatusBadge ended={ended} />
                        </td>
                        <td className="py-4 pl-5">
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              href={`/campaigns/${campaign.id}`}
                              className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                            >
                              View
                              <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                            <button
                              type="button"
                              onClick={() => onDelete(campaign)}
                              disabled={deleting}
                              className="rounded-md p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:opacity-50"
                              aria-label={`Delete campaign ${campaign.name}`}
                              title="Delete campaign"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </DashboardPanel>
  );
}
