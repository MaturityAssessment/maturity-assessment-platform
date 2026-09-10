"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Play,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import type { Domain, MaturityModelSummary } from "@/api/types";
import {
  AssessmentIcon,
  DashboardPanel,
  EmptyState,
} from "../dashboard/components/DashboardPrimitives";
import type { MaturityModelGroup } from "./catalog";
import { getVersionSummary } from "./catalog";
import { ModelStatus } from "./ModelCatalogMetadata";

type SortKey = "name" | "domain" | "questions" | "versions" | "status";
type SortDirection = "asc" | "desc";
type StatusFilter = "all" | "active" | "inactive";

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

export default function MaturityModelsPanel({
  groups,
  domains,
  canManage,
  checkingModelId,
  onOpen,
  onStart,
}: {
  groups: MaturityModelGroup[];
  domains: Domain[];
  canManage: boolean;
  checkingModelId: number | null;
  onOpen: (modelId: number) => void;
  onStart: (model: MaturityModelSummary) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [domainFilter, setDomainFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const visibleGroups = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
    const filtered = groups.filter((group) => {
      const model = group.representative;
      const matchesSearch =
        normalizedQuery.length === 0 ||
        [model.name, model.description, model.domainName].some((value) =>
          value?.toLocaleLowerCase().includes(normalizedQuery)
        );
      const matchesDomain =
        domainFilter === "all" || String(model.domainId) === domainFilter;
      const matchesStatus =
        !canManage ||
        statusFilter === "all" ||
        (statusFilter === "active"
          ? Boolean(group.activeVersion)
          : !group.activeVersion);

      return matchesSearch && matchesDomain && matchesStatus;
    });

    return [...filtered].sort((a, b) => {
      const aModel = a.representative;
      const bModel = b.representative;
      let comparison = 0;
      switch (sortKey) {
        case "domain":
          comparison = (aModel.domainName ?? "").localeCompare(
            bModel.domainName ?? ""
          );
          break;
        case "questions":
          comparison = aModel.totalQuestions - bModel.totalQuestions;
          break;
        case "versions":
          comparison = a.versions.length - b.versions.length;
          break;
        case "status":
          comparison =
            Number(Boolean(a.activeVersion)) -
            Number(Boolean(b.activeVersion));
          break;
        case "name":
          comparison = aModel.name.localeCompare(bModel.name);
          break;
      }

      if (comparison === 0) {
        comparison = aModel.name.localeCompare(bModel.name);
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [
    canManage,
    domainFilter,
    groups,
    searchQuery,
    sortDirection,
    sortKey,
    statusFilter,
  ]);

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    domainFilter !== "all" ||
    (canManage && statusFilter !== "all");

  const handleSort = (nextSortKey: SortKey) => {
    if (nextSortKey === sortKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(nextSortKey);
    setSortDirection("asc");
  };

  const clearFilters = () => {
    setSearchQuery("");
    setDomainFilter("all");
    setStatusFilter("all");
  };

  return (
    <DashboardPanel
      id="all-maturity-models"
      title="All maturity models"
      description={`${groups.length} model${groups.length === 1 ? "" : "s"} available`}
    >
      {groups.length === 0 ? (
        <EmptyState
          title={canManage ? "No maturity models yet" : "No active models available"}
          description={
            canManage
              ? "Create a model to begin building an assessment structure."
              : "There are currently no maturity models available for assessment."
          }
          href={canManage ? "/maturity-models/new" : undefined}
          action={canManage ? "Create model" : undefined}
        />
      ) : (
        <>
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Search maturity models</span>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search maturity models"
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
              {canManage && (
                <label className="relative">
                  <span className="sr-only">Filter by model status</span>
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
                    <option value="active">Active</option>
                    <option value="inactive">Without active version</option>
                  </select>
                </label>
              )}

              <label>
                <span className="sr-only">Filter by domain</span>
                <select
                  value={domainFilter}
                  onChange={(event) => setDomainFilter(event.target.value)}
                  className="h-10 w-full min-w-40 rounded-lg border border-slate-200 bg-white px-3 pr-8 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 sm:w-auto"
                >
                  <option value="all">Any domain</option>
                  {domains.map((domain) => (
                    <option key={domain.id} value={domain.id}>
                      {domain.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="mb-2 flex min-h-6 items-center justify-between gap-4 text-xs text-slate-500">
            <span aria-live="polite">
              Showing {visibleGroups.length} of {groups.length} model
              {groups.length === 1 ? "" : "s"}
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

          {visibleGroups.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center">
              <h3 className="font-semibold text-slate-900">No models found</h3>
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
                      label="Maturity model"
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
                      label="Questions"
                      sortKey="questions"
                      activeSortKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                      className="px-5 pb-2"
                    />
                    <SortableHeader
                      label="Versions"
                      sortKey="versions"
                      activeSortKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                      className="px-5 pb-2"
                    />
                    {canManage && (
                      <SortableHeader
                        label="Status"
                        sortKey="status"
                        activeSortKey={sortKey}
                        direction={sortDirection}
                        onSort={handleSort}
                        className="px-5 pb-2"
                      />
                    )}
                    <th className="pb-3 pl-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleGroups.map((group) => {
                    const model = group.representative;
                    const startModel = group.activeVersion;

                    return (
                      <tr key={group.baseModelId} className="group">
                        <td className="py-4 pr-5">
                          <button
                            type="button"
                            onClick={() => onOpen(group.baseModelId)}
                            className="flex max-w-sm items-center gap-3 text-left focus:outline-none focus:ring-2 focus:ring-indigo-300"
                          >
                            <AssessmentIcon
                              iconKey={model.domainIconKey}
                              colorKey={model.domainColorKey}
                              domainName={model.domainName}
                            />
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-slate-900 group-hover:text-indigo-700">
                                {model.name}
                              </span>
                              <span className="mt-0.5 block truncate text-xs text-slate-500">
                                {canManage
                                  ? getVersionSummary(group)
                                  : model.version != null
                                    ? `Version ${model.version}`
                                    : "Current version"}
                              </span>
                            </span>
                          </button>
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-600">
                          {model.domainName || "Unassigned"}
                        </td>
                        <td className="px-5 py-4 text-sm font-medium tabular-nums text-slate-700">
                          {model.totalQuestions}
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-600">
                          {group.versions.length}
                        </td>
                        {canManage && (
                          <td className="px-5 py-4">
                            <ModelStatus group={group} />
                          </td>
                        )}
                        <td className="py-4 pl-5">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => onOpen(group.baseModelId)}
                              className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300"
                            >
                              View details
                            </button>
                            {startModel && (
                              <button
                                type="button"
                                onClick={() => onStart(startModel)}
                                disabled={checkingModelId !== null}
                                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:cursor-wait disabled:opacity-60"
                              >
                                <Play className="h-3.5 w-3.5" aria-hidden="true" />
                                {checkingModelId === startModel.id
                                  ? "Checking drafts..."
                                  : "Start assessment"}
                              </button>
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
        </>
      )}
    </DashboardPanel>
  );
}
