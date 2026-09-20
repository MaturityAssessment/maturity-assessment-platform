"use client";

import Link from "next/link";
import { DocumentTextIcon, PlusIcon } from "@heroicons/react/24/outline";

type ModelCatalogEmptyStateProps = {
  filtered: boolean;
  canCreate: boolean;
  domainsUnavailable: boolean;
  onCreate: () => void;
  onClearFilters: () => void;
  onRetry: () => void;
};

export default function ModelCatalogEmptyState({
  filtered,
  canCreate,
  domainsUnavailable,
  onCreate,
  onClearFilters,
  onRetry,
}: ModelCatalogEmptyStateProps) {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
      <DocumentTextIcon
        className="mx-auto h-11 w-11 text-gray-400"
        aria-hidden="true"
      />
      <h2 className="mt-4 text-lg font-semibold text-gray-900">
        {filtered ? "No models match your filters" : "No maturity models yet"}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-600">
        {filtered
          ? "Try a different search term or clear the current filters."
          : domainsUnavailable
            ? "Domain data could not be loaded, so model creation is temporarily unavailable."
            : canCreate
              ? "Create your first maturity model to begin building an assessment structure."
              : "Create a domain first, then return here to add a maturity model."}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        {filtered ? (
          <button
            type="button"
            onClick={onClearFilters}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Clear filters
          </button>
        ) : domainsUnavailable ? (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Try again
          </button>
        ) : canCreate ? (
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <PlusIcon className="h-5 w-5" aria-hidden="true" />
            Create model
          </button>
        ) : (
          <Link
            href="/domains"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Go to Domain Management
          </Link>
        )}
      </div>
    </div>
  );
}

export function ModelCatalogLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">
        We could not load the model catalog
      </h2>
      <p className="mt-2 text-sm text-gray-600">
        Check your connection and try loading the models again.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Try again
      </button>
    </div>
  );
}
