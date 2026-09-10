"use client";

import { useMemo, useState } from "react";
import { Search, Trash2, X } from "lucide-react";
import type { AssessmentResponse } from "@/api/types";
import {
  buildAssessmentView,
  type ModelDetails,
} from "../../dashboard/dashboardAssessments";
import type { DashboardAssessmentView } from "../../dashboard/types";
import {
  AssessmentIcon,
  DashboardPanel,
  StatusBadge,
} from "../../dashboard/components/DashboardPrimitives";
import { formatScore1ToN } from "@/lib/maturityFormat";

type AssessmentMode = "NORMAL" | "CAMPAIGN";

type AssessmentItem = {
  assessment: AssessmentResponse;
  view: DashboardAssessmentView;
};

function isCampaignAssessment(assessment: AssessmentResponse) {
  return assessment.campaignId != null;
}

function resultSummary(item: AssessmentItem, models: ModelDetails) {
  const { assessment, view } = item;

  if (view.isCompleted) {
    const scaleMax = assessment.maturityModelId
      ? (models[assessment.maturityModelId]?.levelCount ?? 5)
      : 5;
    return {
      primary: formatScore1ToN(assessment.overallAverage, scaleMax),
      secondary: assessment.overallMaturityLevel || "Maturity level unavailable",
    };
  }
  if (view.status === "pending-review") {
    return { primary: "Awaiting evaluation", secondary: "Results pending" };
  }
  if (view.status === "changes-requested") {
    return { primary: "Changes requested", secondary: "Awaiting resubmission" };
  }
  return {
    primary: `${view.progress}% complete`,
    secondary: "Draft assessment",
  };
}

export default function AssessmentsPanel({
  assessments,
  models,
  deletingAssessmentId,
  onOpen,
  onReview,
  onDelete,
}: {
  assessments: AssessmentResponse[];
  models: ModelDetails;
  deletingAssessmentId: number | null;
  onOpen: (assessmentId: number) => void;
  onReview: (assessmentId: number) => void;
  onDelete: (assessment: AssessmentResponse) => void;
}) {
  const [activeMode, setActiveMode] = useState<AssessmentMode>("NORMAL");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const items = useMemo<AssessmentItem[]>(
    () =>
      assessments
        .map((assessment) => ({
          assessment,
          view: buildAssessmentView(assessment, models),
        }))
        .sort((left, right) => right.view.updatedAtTime - left.view.updatedAtTime),
    [assessments, models]
  );

  const normalItems = useMemo(
    () => items.filter((item) => !isCampaignAssessment(item.assessment)),
    [items]
  );
  const campaignItems = useMemo(
    () => items.filter((item) => isCampaignAssessment(item.assessment)),
    [items]
  );
  const sourceItems = activeMode === "NORMAL" ? normalItems : campaignItems;

  const visibleItems = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase();

    return sourceItems.filter((item) => {
      const matchesStatus =
        statusFilter === "all" || item.view.status === statusFilter;
      const matchesSearch =
        !normalizedQuery ||
        [
          item.view.name,
          item.view.domain,
          item.assessment.userEmail,
          item.assessment.campaignName,
          item.assessment.overallMaturityLevel,
          `assessment ${item.assessment.id}`,
          item.view.version == null ? "" : `version ${item.view.version}`,
        ].some((value) =>
          value?.toLocaleLowerCase().includes(normalizedQuery)
        );
      return matchesStatus && matchesSearch;
    });
  }, [searchQuery, sourceItems, statusFilter]);

  const hasActiveFilters =
    Boolean(searchQuery.trim()) || statusFilter !== "all";

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
  };

  return (
    <DashboardPanel
      id="all-assessments"
      title="All assessments"
      description={`${assessments.length} assessment${
        assessments.length === 1 ? "" : "s"
      } across the platform`}
    >
      <div
        role="tablist"
        aria-label="Assessment type"
        className="-mx-5 mb-5 flex gap-7 border-b border-slate-200 px-5 sm:-mx-6 sm:px-6"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeMode === "NORMAL"}
          onClick={() => setActiveMode("NORMAL")}
          className={`relative pb-3 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 ${
            activeMode === "NORMAL"
              ? "text-indigo-700 after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full after:bg-indigo-600"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Normal assessments
          <span
            className={`ml-2 tabular-nums ${
              activeMode === "NORMAL" ? "text-indigo-500" : "text-slate-400"
            }`}
          >
            {normalItems.length}
          </span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeMode === "CAMPAIGN"}
          onClick={() => setActiveMode("CAMPAIGN")}
          className={`relative pb-3 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 ${
            activeMode === "CAMPAIGN"
              ? "text-indigo-700 after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full after:bg-indigo-600"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Campaign assessments
          <span
            className={`ml-2 tabular-nums ${
              activeMode === "CAMPAIGN"
                ? "text-indigo-500"
                : "text-slate-400"
            }`}
          >
            {campaignItems.length}
          </span>
        </button>
      </div>

      <div className="mb-2 grid gap-3 sm:grid-cols-[minmax(0,1fr)_190px]">
        <label className="relative block min-w-0">
          <span className="sr-only">Search assessments</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search assessments, users, or campaigns"
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-9 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </label>

        <label>
          <span className="sr-only">Filter by status</span>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          >
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="pending-review">Pending review</option>
            <option value="changes-requested">Changes requested</option>
            <option value="completed">Completed</option>
          </select>
        </label>
      </div>

      <div className="mb-2 flex min-h-6 items-center justify-between gap-4 text-xs text-slate-500">
        <span aria-live="polite">
          Showing {visibleItems.length} of {sourceItems.length} assessment
          {sourceItems.length === 1 ? "" : "s"}
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

      {visibleItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center">
          <h3 className="font-semibold text-slate-900">
            {hasActiveFilters
              ? "No assessments match these filters"
              : activeMode === "NORMAL"
                ? "No normal assessments"
                : "No campaign assessments"}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {hasActiveFilters
              ? "Try adjusting your search or status filter."
              : activeMode === "NORMAL"
                ? "Individual user assessments will appear here."
                : "Assessments submitted through campaigns will appear here."}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 text-sm font-semibold text-indigo-600 hover:text-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1020px] border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="pb-3 pr-5">Assessment</th>
                {activeMode === "NORMAL" ? (
                  <>
                    <th className="px-5 pb-3">User</th>
                    <th className="px-5 pb-3">Domain</th>
                  </>
                ) : (
                  <>
                    <th className="px-5 pb-3">Campaign</th>
                    <th className="px-5 pb-3">Participant</th>
                  </>
                )}
                <th className="px-5 pb-3">Status</th>
                <th className="px-5 pb-3">Result</th>
                <th className="px-5 pb-3">Updated</th>
                <th className="pb-3 pl-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleItems.map((item) => {
                const { assessment, view } = item;
                const result = resultSummary(item, models);
                const deleting = deletingAssessmentId === assessment.id;

                return (
                  <tr key={assessment.id} className="group">
                    <td className="py-4 pr-5">
                      <div className="flex max-w-sm items-center gap-3">
                        <AssessmentIcon
                          iconKey={view.domainIconKey}
                          colorKey={view.domainColorKey}
                          domainName={view.domain}
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-slate-900">
                            {view.name}
                          </span>
                          <span className="mt-0.5 block text-xs text-slate-500">
                            {view.version != null ? `Version ${view.version} · ` : ""}
                            Assessment #{assessment.id}
                          </span>
                        </span>
                      </div>
                    </td>
                    {activeMode === "NORMAL" ? (
                      <>
                        <td className="max-w-56 px-5 py-4 text-sm text-slate-600">
                          <span
                            className="block truncate"
                            title={assessment.userEmail || undefined}
                          >
                            {assessment.userEmail || "Unknown user"}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-600">
                          {view.domain}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="max-w-56 px-5 py-4 text-sm text-slate-600">
                          <span
                            className="block truncate font-medium text-slate-700"
                            title={assessment.campaignName || undefined}
                          >
                            {assessment.campaignName ||
                              `Campaign #${assessment.campaignId}`}
                          </span>
                        </td>
                        <td className="max-w-56 px-5 py-4 text-sm text-slate-600">
                          <span
                            className="block truncate"
                            title={assessment.userEmail || undefined}
                          >
                            {assessment.userEmail || "Unknown participant"}
                          </span>
                        </td>
                      </>
                    )}
                    <td className="px-5 py-4">
                      <StatusBadge status={view.status} />
                    </td>
                    <td className="px-5 py-4">
                      <span className="block text-sm font-semibold text-slate-800">
                        {result.primary}
                      </span>
                      <span className="mt-0.5 block max-w-44 truncate text-xs text-slate-500">
                        {result.secondary}
                      </span>
                    </td>
                    <td
                      className="whitespace-nowrap px-5 py-4 text-sm text-slate-600"
                      title={new Date(
                        assessment.updatedAt || assessment.createdAt
                      ).toLocaleString()}
                    >
                      {view.updatedLabel}
                    </td>
                    <td className="py-4 pl-5">
                      <div className="flex items-center justify-end gap-1">
                        {view.status === "pending-review" && (
                          <button
                            type="button"
                            onClick={() => onReview(assessment.id)}
                            disabled={deleting}
                            className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:opacity-50"
                          >
                            Review
                          </button>
                        )}
                        {view.isCompleted && (
                          <button
                            type="button"
                            onClick={() => onOpen(assessment.id)}
                            disabled={deleting}
                            className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:opacity-50"
                          >
                            View results
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onDelete(assessment)}
                          disabled={deleting}
                          className="rounded-md p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:cursor-wait disabled:opacity-50"
                          aria-label={`Delete assessment ${assessment.id}`}
                          title="Delete assessment"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
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
    </DashboardPanel>
  );
}
