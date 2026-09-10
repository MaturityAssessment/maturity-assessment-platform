"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Pencil,
  Search,
  Trash2,
  X,
} from "lucide-react";
import type { Domain } from "@/api/types";
import {
  DashboardPanel,
  EmptyState,
} from "../dashboard/components/DashboardPrimitives";
import { DomainIcon } from "@/components/DomainIcon";

type SortKey = "name" | "models" | "active";
type SortDirection = "asc" | "desc";

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

export default function DomainsPanel({
  domains,
  canManage,
  onEditAppearance,
  onDelete,
}: {
  domains: Domain[];
  canManage: boolean;
  onEditAppearance: (domain: Domain) => void;
  onDelete: (domain: Domain) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const visibleDomains = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
    const filtered = domains.filter(
      (domain) =>
        !normalizedQuery ||
        [domain.name, domain.description].some((value) =>
          value?.toLocaleLowerCase().includes(normalizedQuery)
        )
    );

    return [...filtered].sort((a, b) => {
      let comparison = 0;
      switch (sortKey) {
        case "models":
          comparison =
            (a.maturityModelCount ?? 0) - (b.maturityModelCount ?? 0);
          break;
        case "active":
          comparison =
            Number(Boolean(a.hasActiveMaturityModel)) -
            Number(Boolean(b.hasActiveMaturityModel));
          break;
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
      }

      if (comparison === 0) comparison = a.name.localeCompare(b.name);
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [domains, searchQuery, sortDirection, sortKey]);

  const handleSort = (nextSortKey: SortKey) => {
    if (nextSortKey === sortKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(nextSortKey);
    setSortDirection("asc");
  };

  return (
    <DashboardPanel
      id="all-domains"
      title="All domains"
      description={`${domains.length} domain${domains.length === 1 ? "" : "s"} in your workspace`}
    >
      {domains.length === 0 ? (
        <EmptyState
          title="No assessment domains yet"
          description={
            canManage
              ? "Create your first domain to organize maturity models and assessment content."
              : "There are currently no assessment domains available to view."
          }
        />
      ) : (
        <>
          <div className="mb-5">
            <label className="relative block min-w-0">
              <span className="sr-only">Search domains</span>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search domains"
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
          </div>

          <div className="mb-2 flex min-h-6 items-center justify-between gap-4 text-xs text-slate-500">
            <span aria-live="polite">
              Showing {visibleDomains.length} of {domains.length} domain
              {domains.length === 1 ? "" : "s"}
            </span>
            {searchQuery.trim() && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="font-semibold text-indigo-600 hover:text-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                Clear search
              </button>
            )}
          </div>

          {visibleDomains.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center">
              <h3 className="font-semibold text-slate-900">No domains found</h3>
              <p className="mt-1 text-sm text-slate-500">
                Try a different search term.
              </p>
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="mt-4 text-sm font-semibold text-indigo-600 hover:text-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                Clear search
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <SortableHeader
                      label="Domain"
                      sortKey="name"
                      activeSortKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                      className="pb-2 pr-5"
                    />
                    <th className="px-5 pb-3">Description</th>
                    <SortableHeader
                      label="Models"
                      sortKey="models"
                      activeSortKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                      className="px-5 pb-2"
                    />
                    <SortableHeader
                      label="Active model"
                      sortKey="active"
                      activeSortKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                      className="px-5 pb-2"
                    />
                    {canManage && (
                      <th className="pb-3 pl-5 text-right">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleDomains.map((domain) => (
                    <tr key={domain.id} className="group">
                      <td className="py-4 pr-5">
                        <div className="flex max-w-sm items-center gap-3">
                          <DomainIcon
                            iconKey={domain.iconKey}
                            colorKey={domain.colorKey}
                            name={domain.name}
                            size={20}
                            className="!h-10 !w-10 !rounded-xl"
                          />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-slate-900">
                              {domain.name}
                            </span>
                            <span className="mt-0.5 block text-xs text-slate-500">
                              Domain #{domain.id}
                            </span>
                          </span>
                        </div>
                      </td>
                      <td className="max-w-md px-5 py-4 text-sm leading-5 text-slate-600">
                        <span className="line-clamp-2">
                          {domain.description || "No description provided."}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm font-medium tabular-nums text-slate-700">
                        {domain.maturityModelCount ?? 0}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={
                            domain.hasActiveMaturityModel
                              ? "inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"
                              : "inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600"
                          }
                        >
                          {domain.hasActiveMaturityModel
                            ? "Available"
                            : "Not available"}
                        </span>
                      </td>
                      {canManage && (
                        <td className="py-4 pl-5">
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => onEditAppearance(domain)}
                              className="rounded-md p-2 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                              aria-label={`Edit ${domain.name} appearance`}
                              title="Edit icon and color"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDelete(domain)}
                              className="rounded-md p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-300"
                              aria-label={`Delete ${domain.name} domain`}
                              title="Delete domain"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      )}
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
