"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import type { AssessmentResponse } from "@/api/types";
import type {
  DashboardAssessmentStatus,
  DashboardAssessmentView,
} from "../types";
import {
  AssessmentIcon,
  DashboardPanel,
  EmptyState,
  ProgressResult,
  StatusBadge,
} from "./DashboardPrimitives";

type StatusFilter = "all" | DashboardAssessmentStatus;
type SortKey = "name" | "domain" | "status" | "outcome" | "updated";
type SortDirection = "asc" | "desc";

const STATUS_LABELS: Record<DashboardAssessmentStatus, string> = {
  draft: "In progress",
  "changes-requested": "Changes requested",
  "pending-review": "Pending review",
  completed: "Completed",
};

const STATUS_SORT_ORDER: Record<DashboardAssessmentStatus, number> = {
  draft: 0,
  "changes-requested": 1,
  "pending-review": 2,
  completed: 3,
};

function getOutcomeSortValue(assessment: DashboardAssessmentView) {
  const statusValue = STATUS_SORT_ORDER[assessment.status] * 1000;
  if (assessment.status === "draft") {
    return statusValue + assessment.progress;
  }
  if (assessment.status === "completed") {
    return statusValue + assessment.assessment.overallAverage;
  }
  return statusValue;
}

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

export default function AllAssessmentsPanel({
  assessments,
  onOpen,
  onDeleteDraft,
}: {
  assessments: DashboardAssessmentView[];
  onOpen: (assessment: AssessmentResponse) => void;
  onDeleteDraft: (assessment: AssessmentResponse) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [domainFilter, setDomainFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("updated");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const domains = useMemo(
    () =>
      Array.from(new Set(assessments.map((assessment) => assessment.domain)))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [assessments]
  );

  const visibleAssessments = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
    const filtered = assessments.filter((assessment) => {
      const matchesSearch =
        normalizedQuery.length === 0 ||
        [
          assessment.name,
          assessment.domain,
          STATUS_LABELS[assessment.status],
          assessment.status === "completed" ? assessment.maturityLevel : "",
          assessment.version == null ? "" : `version ${assessment.version}`,
        ].some((value) =>
          value.toLocaleLowerCase().includes(normalizedQuery)
        );
      const matchesStatus =
        statusFilter === "all" || assessment.status === statusFilter;
      const matchesDomain =
        domainFilter === "all" || assessment.domain === domainFilter;

      return matchesSearch && matchesStatus && matchesDomain;
    });

    return [...filtered].sort((a, b) => {
      let comparison = 0;
      switch (sortKey) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "domain":
          comparison = a.domain.localeCompare(b.domain);
          break;
        case "status":
          comparison =
            STATUS_SORT_ORDER[a.status] - STATUS_SORT_ORDER[b.status];
          break;
        case "outcome":
          comparison = getOutcomeSortValue(a) - getOutcomeSortValue(b);
          break;
        case "updated":
          comparison = a.updatedAtTime - b.updatedAtTime;
          break;
      }

      if (comparison === 0) comparison = a.name.localeCompare(b.name);
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [
    assessments,
    domainFilter,
    searchQuery,
    sortDirection,
    sortKey,
    statusFilter,
  ]);

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    statusFilter !== "all" ||
    domainFilter !== "all";

  const handleSort = (nextSortKey: SortKey) => {
    if (nextSortKey === sortKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(nextSortKey);
    setSortDirection(nextSortKey === "updated" ? "desc" : "asc");
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setDomainFilter("all");
  };

  return (
    <DashboardPanel
      id="all-assessments"
      title="All assessments"
      description={`${assessments.length} assessment${
        assessments.length === 1 ? "" : "s"
      } in your workspace`}
      helpTourTarget="dashboard-all-assessments"
    >
      {assessments.length === 0 ? (
        <EmptyState
          title="Your assessment workspace is empty"
          description="Create an assessment to begin tracking your maturity journey."
          href="/assessment/setup"
          action="Start assessment"
        />
      ) : (
        <>
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Search assessments</span>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search assessments"
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

            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="relative">
                <span className="sr-only">Filter by status</span>
                <SlidersHorizontal
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as StatusFilter)
                  }
                  className="h-10 w-full min-w-40 rounded-lg border border-slate-200 bg-white pl-9 pr-8 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 sm:w-auto"
                >
                  <option value="all">Any status</option>
                  <option value="draft">In progress</option>
                  <option value="changes-requested">
                    Changes requested
                  </option>
                  <option value="pending-review">Pending review</option>
                  <option value="completed">Completed</option>
                </select>
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
          </div>

          <div className="mb-2 flex min-h-6 items-center justify-between gap-4 text-xs text-slate-500">
            <span aria-live="polite">
              Showing {visibleAssessments.length} of {assessments.length}{" "}
              assessment{assessments.length === 1 ? "" : "s"}
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

          {visibleAssessments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center">
              <h3 className="font-semibold text-slate-900">
                No assessments found
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Try adjusting your search or filters.
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
              <table className="w-full min-w-[850px] border-collapse">
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
                      label="Domain"
                      sortKey="domain"
                      activeSortKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                      className="px-5 pb-2"
                    />
                    <SortableHeader
                      label="Status"
                      sortKey="status"
                      activeSortKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                      className="px-5 pb-2"
                    />
                    <SortableHeader
                      label="Progress / result"
                      sortKey="outcome"
                      activeSortKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                      className="px-5 pb-2"
                    />
                    <SortableHeader
                      label="Last updated"
                      sortKey="updated"
                      activeSortKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                      className="px-5 pb-2"
                    />
                    <th className="pb-3 pl-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleAssessments.map((assessment) => (
                    <tr key={assessment.id} className="group">
                      <td className="py-4 pr-5">
                        <button
                          type="button"
                          disabled={!assessment.canOpen}
                          onClick={() => onOpen(assessment.assessment)}
                          className="flex max-w-sm items-center gap-3 text-left disabled:cursor-default focus:outline-none focus:ring-2 focus:ring-indigo-300"
                        >
                          <AssessmentIcon
                            iconKey={assessment.domainIconKey}
                            colorKey={assessment.domainColorKey}
                            domainName={assessment.domain}
                          />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-slate-900 group-hover:text-indigo-700">
                              {assessment.name}
                            </span>
                            {assessment.version != null && (
                              <span className="mt-0.5 block text-xs text-slate-500">
                                Version {assessment.version}
                              </span>
                            )}
                          </span>
                        </button>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600">
                        {assessment.domain}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={assessment.status} />
                      </td>
                      <td className="px-5 py-4">
                        <ProgressResult assessment={assessment} />
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                        {assessment.updatedLabel}
                      </td>
                      <td className="py-4 pl-5">
                        <div className="flex items-center justify-end gap-1">
                          {assessment.canOpen && (
                            <button
                              type="button"
                              onClick={() => onOpen(assessment.assessment)}
                              className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                            >
                              {assessment.isDraft
                                ? "Continue"
                                : assessment.hasChangesRequested
                                  ? "Review changes"
                                : "View results"}
                            </button>
                          )}
                          {assessment.isDraft && (
                            <button
                              type="button"
                              onClick={() =>
                                onDeleteDraft(assessment.assessment)
                              }
                              className="rounded-md p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-300"
                              aria-label={`Delete draft for ${assessment.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </DashboardPanel>
  );
}
