"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Search,
  Trash2,
  X,
} from "lucide-react";
import type { AssessmentResponse, MaturityModelSummary } from "@/api/types";
import {
  formatRelativeDate,
  getAssessmentDomain,
  getAssessmentModel,
  getAssessmentName,
  getAssessmentVersion,
  type ModelDetails,
} from "../dashboard/dashboardAssessments";
import {
  AssessmentIcon,
  DashboardPanel,
  EmptyState,
  StatusBadge,
} from "../dashboard/components/DashboardPrimitives";
import { formatScore1ToN } from "@/lib/maturityFormat";

type SortKey = "name" | "submitter" | "domain" | "score" | "submitted";
type SortDirection = "asc" | "desc";

type EvaluationQueueItem = {
  assessment: AssessmentResponse;
  model?: MaturityModelSummary;
  name: string;
  domain: string;
  version?: number;
  submitter: string;
  submittedAt: string;
  submittedAtTime: number;
};

function SortableHeader({
  label,
  sortKey,
  activeSortKey,
  direction,
  onSort,
  className = "",
}: {
  label: string;
  sortKey: SortKey;
  activeSortKey: SortKey;
  direction: SortDirection;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const isActive = sortKey === activeSortKey;
  const SortIcon = !isActive
    ? ArrowUpDown
    : direction === "asc"
      ? ArrowUp
      : ArrowDown;

  return (
    <th
      className={className}
      aria-sort={
        isActive ? (direction === "asc" ? "ascending" : "descending") : "none"
      }
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="group/sort inline-flex items-center gap-1.5 rounded py-1 text-left transition hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
      >
        {label}
        <SortIcon
          className={`h-3.5 w-3.5 ${
            isActive
              ? "text-indigo-600"
              : "text-slate-300 group-hover/sort:text-slate-500"
          }`}
          aria-hidden="true"
        />
      </button>
    </th>
  );
}

export default function EvaluationQueuePanel({
  assessments,
  models,
  deletingAssessmentId,
  onReview,
  onDelete,
}: {
  assessments: AssessmentResponse[];
  models: ModelDetails;
  deletingAssessmentId: number | null;
  onReview: (assessmentId: number) => void;
  onDelete: (assessmentId: number) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [domainFilter, setDomainFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("submitted");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const queueItems = useMemo<EvaluationQueueItem[]>(
    () =>
      assessments.map((assessment) => {
        const submittedAt = assessment.updatedAt || assessment.createdAt;
        return {
          assessment,
          model: getAssessmentModel(assessment, models),
          name: getAssessmentName(assessment, models),
          domain: getAssessmentDomain(assessment, models),
          version: getAssessmentVersion(assessment, models),
          submitter: assessment.userEmail || "Unknown submitter",
          submittedAt,
          submittedAtTime: new Date(submittedAt).getTime(),
        };
      }),
    [assessments, models]
  );

  const domains = useMemo(
    () =>
      Array.from(new Set(queueItems.map((item) => item.domain))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [queueItems]
  );

  const visibleItems = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
    const filtered = queueItems.filter((item) => {
      const matchesSearch =
        !normalizedQuery ||
        [
          item.name,
          item.domain,
          item.submitter,
          item.assessment.overallMaturityLevel,
          `assessment ${item.assessment.id}`,
          item.version == null ? "" : `version ${item.version}`,
        ].some((value) =>
          value.toLocaleLowerCase().includes(normalizedQuery)
        );
      const matchesDomain =
        domainFilter === "all" || item.domain === domainFilter;
      return matchesSearch && matchesDomain;
    });

    return [...filtered].sort((a, b) => {
      let comparison = 0;
      switch (sortKey) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "submitter":
          comparison = a.submitter.localeCompare(b.submitter);
          break;
        case "domain":
          comparison = a.domain.localeCompare(b.domain);
          break;
        case "score":
          comparison =
            (a.assessment.overallAverage ?? 0) -
            (b.assessment.overallAverage ?? 0);
          break;
        case "submitted":
          comparison = a.submittedAtTime - b.submittedAtTime;
          break;
      }
      if (comparison === 0) comparison = a.name.localeCompare(b.name);
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [domainFilter, queueItems, searchQuery, sortDirection, sortKey]);

  const hasActiveFilters =
    searchQuery.trim().length > 0 || domainFilter !== "all";

  const handleSort = (nextSortKey: SortKey) => {
    if (nextSortKey === sortKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(nextSortKey);
    setSortDirection(nextSortKey === "submitted" ? "desc" : "asc");
  };

  const clearFilters = () => {
    setSearchQuery("");
    setDomainFilter("all");
  };

  return (
    <DashboardPanel
      id="evaluation-queue"
      title="Evaluation queue"
      description={`${assessments.length} assessment${
        assessments.length === 1 ? "" : "s"
      } awaiting review`}
    >
      {assessments.length === 0 ? (
        <EmptyState
          title="The evaluation queue is clear"
          description="There are no submitted assessments waiting for review."
        />
      ) : (
        <>
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Search pending assessments</span>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search assessments or submitters"
                className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-9 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </label>

            <label>
              <span className="sr-only">Filter by domain</span>
              <select
                value={domainFilter}
                onChange={(event) => setDomainFilter(event.target.value)}
                className="h-10 w-full min-w-40 rounded-lg border border-slate-200 bg-white px-3 pr-8 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 sm:w-auto"
              >
                <option value="all">Any domain</option>
                {domains.map((domain) => (
                  <option key={domain} value={domain}>
                    {domain}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mb-2 flex min-h-6 items-center justify-between gap-4 text-xs text-slate-500">
            <span aria-live="polite">
              Showing {visibleItems.length} of {assessments.length} assessment
              {assessments.length === 1 ? "" : "s"}
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
                No assessments found
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Try adjusting your search or domain filter.
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
              <table className="w-full min-w-[980px] border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <SortableHeader
                      label="Assessment"
                      sortKey="name"
                      activeSortKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                      className="pb-2 pr-5"
                    />
                    <SortableHeader
                      label="Submitter"
                      sortKey="submitter"
                      activeSortKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                      className="px-5 pb-2"
                    />
                    <SortableHeader
                      label="Domain"
                      sortKey="domain"
                      activeSortKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                      className="px-5 pb-2"
                    />
                    <SortableHeader
                      label="Submitted score"
                      sortKey="score"
                      activeSortKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                      className="px-5 pb-2"
                    />
                    <SortableHeader
                      label="Submitted"
                      sortKey="submitted"
                      activeSortKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                      className="px-5 pb-2"
                    />
                    <th className="px-5 pb-3">Status</th>
                    <th className="pb-3 pl-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleItems.map((item) => {
                    const scaleN = item.model?.levelCount ?? 5;
                    const deleting = deletingAssessmentId === item.assessment.id;
                    return (
                      <tr key={item.assessment.id} className="group">
                        <td className="py-4 pr-5">
                          <button
                            type="button"
                            onClick={() => onReview(item.assessment.id)}
                            disabled={deleting}
                            className="flex max-w-sm items-center gap-3 text-left focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:opacity-50"
                          >
                            <AssessmentIcon
                              iconKey={item.model?.domainIconKey}
                              colorKey={item.model?.domainColorKey}
                              domainName={item.domain}
                            />
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-slate-900 group-hover:text-indigo-700">
                                {item.name}
                              </span>
                              <span className="mt-0.5 block text-xs text-slate-500">
                                {item.version != null
                                  ? `Version ${item.version} · `
                                  : ""}
                                Assessment #{item.assessment.id}
                              </span>
                            </span>
                          </button>
                        </td>
                        <td className="max-w-56 px-5 py-4 text-sm text-slate-600">
                          <span className="block truncate" title={item.submitter}>
                            {item.submitter}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-600">
                          {item.domain}
                        </td>
                        <td className="px-5 py-4">
                          <span className="block text-sm font-semibold text-slate-800">
                            {formatScore1ToN(
                              item.assessment.overallAverage,
                              scaleN
                            )}
                          </span>
                          <span className="mt-0.5 block max-w-40 truncate text-xs text-slate-500">
                            {item.assessment.overallMaturityLevel ||
                              "Not calculated"}
                          </span>
                        </td>
                        <td
                          className="whitespace-nowrap px-5 py-4 text-sm text-slate-600"
                          title={new Date(item.submittedAt).toLocaleString()}
                        >
                          {formatRelativeDate(item.submittedAt)}
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge status="pending-review" />
                        </td>
                        <td className="py-4 pl-5">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => onReview(item.assessment.id)}
                              disabled={deleting}
                              className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:opacity-50"
                            >
                              Review
                            </button>
                            <button
                              type="button"
                              onClick={() => onDelete(item.assessment.id)}
                              disabled={deleting}
                              className="rounded-md p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:opacity-50"
                              aria-label={`Delete assessment ${item.assessment.id}`}
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
