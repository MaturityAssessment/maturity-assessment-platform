"use client";

import {
  Bars3BottomLeftIcon,
  MagnifyingGlassIcon,
  Squares2X2Icon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { Domain } from "@/api/types";
import {
  CatalogView,
  pluralLabel,
  SortOrder,
  StatusFilter,
} from "./catalog";

type ModelCatalogToolbarProps = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  domains: Domain[];
  selectedDomainId: number | null;
  onDomainChange: (value: number | null) => void;
  statusFilter: StatusFilter;
  onStatusChange: (value: StatusFilter) => void;
  sortOrder: SortOrder;
  onSortChange: (value: SortOrder) => void;
  view: CatalogView;
  onViewChange: (view: CatalogView) => void;
  resultCount: number;
  totalCount: number;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
};

export default function ModelCatalogToolbar({
  searchQuery,
  onSearchChange,
  domains,
  selectedDomainId,
  onDomainChange,
  statusFilter,
  onStatusChange,
  sortOrder,
  onSortChange,
  view,
  onViewChange,
  resultCount,
  totalCount,
  hasActiveFilters,
  onClearFilters,
}: ModelCatalogToolbarProps) {
  const selectClassName =
    "h-10 w-full rounded-md border border-gray-300 bg-white pl-3 pr-9 text-sm text-gray-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";
  const activeFilterLabels = [
    searchQuery.trim() ? `Search: “${searchQuery.trim()}”` : null,
    selectedDomainId != null
      ? `Domain: ${
          domains.find((domain) => domain.id === selectedDomainId)?.name ??
          "Selected"
        }`
      : null,
    statusFilter === "active"
      ? "Status: Active"
      : statusFilter === "inactive"
        ? "Status: Without active version"
        : null,
  ].filter((label): label is string => Boolean(label));

  return (
    <section
      aria-label="Model discovery controls"
      className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
    >
      <div className="grid gap-3 lg:grid-cols-[minmax(240px,1.5fr)_repeat(3,minmax(150px,0.7fr))_auto]">
        <div className="relative">
          <label htmlFor="model-search" className="sr-only">
            Search maturity models
          </label>
          <MagnifyingGlassIcon
            className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
            aria-hidden="true"
          />
          <input
            id="model-search"
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search models, descriptions, or domains"
            className="h-10 w-full rounded-md border border-gray-300 bg-white pl-10 pr-9 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <XMarkIcon className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>

        <label>
          <span className="sr-only">Filter by domain</span>
          <select
            value={selectedDomainId ?? ""}
            onChange={(event) =>
              onDomainChange(
                event.target.value ? Number(event.target.value) : null
              )
            }
            className={selectClassName}
          >
            <option value="">All domains</option>
            {domains.map((domain) => (
              <option key={domain.id} value={domain.id}>
                {domain.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="sr-only">Filter by model status</span>
          <select
            value={statusFilter}
            onChange={(event) =>
              onStatusChange(event.target.value as StatusFilter)
            }
            className={selectClassName}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Without active version</option>
          </select>
        </label>

        <label>
          <span className="sr-only">Sort maturity models</span>
          <select
            value={sortOrder}
            onChange={(event) =>
              onSortChange(event.target.value as SortOrder)
            }
            className={selectClassName}
          >
            <option value="created-desc">Newest created</option>
            <option value="created-asc">Oldest created</option>
            <option value="name-asc">Name: A–Z</option>
            <option value="name-desc">Name: Z–A</option>
            <option value="domain">Domain</option>
            <option value="questions-desc">Most questions</option>
            <option value="questions-asc">Fewest questions</option>
            <option value="versions-desc">Most versions</option>
          </select>
        </label>

        <div
          className="inline-flex h-10 self-start rounded-md border border-gray-300 bg-gray-50 p-1"
          aria-label="Catalog view"
        >
          <button
            type="button"
            onClick={() => onViewChange("cards")}
            aria-label="Show cards"
            aria-pressed={view === "cards"}
            className={`inline-flex h-8 w-9 items-center justify-center rounded transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              view === "cards"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            <Squares2X2Icon className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onViewChange("rows")}
            aria-label="Show rows"
            aria-pressed={view === "rows"}
            className={`inline-flex h-8 w-9 items-center justify-center rounded transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              view === "rows"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            <Bars3BottomLeftIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="text-sm text-gray-600" aria-live="polite">
            Showing{" "}
            <span className="font-medium text-gray-900">{resultCount}</span> of{" "}
            <span className="font-medium text-gray-900">{totalCount}</span>{" "}
            {pluralLabel(totalCount, "model", "models")}
          </p>
          {activeFilterLabels.length > 0 && (
            <p className="text-xs text-gray-500">
              {activeFilterLabels.join(" · ")}
            </p>
          )}
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="text-sm font-medium text-blue-600 hover:text-blue-800 focus:outline-none focus:underline"
          >
            Clear filters
          </button>
        )}
      </div>
    </section>
  );
}
