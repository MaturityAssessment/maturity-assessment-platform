"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  CircleHelp,
  ClipboardList,
  Clock3,
  Eye,
  Loader2,
  Search,
  X,
} from "lucide-react";
import apiClient from "@/api/axios";
import type { AssessmentResponse } from "@/api/types";
import { AlertNotification, PageLoading, TopNavbar } from "@/components";
import { DomainIcon } from "@/components/DomainIcon";
import DraftSelectionModal from "../DraftSelectionModal";
import useMaturityModelCatalog from "../../maturity-models/useMaturityModelCatalog";
import useModelAssessmentStart from "../../maturity-models/useModelAssessmentStart";
import ModelOverviewModal from "./ModelOverviewModal";
import {
  buildSetupCatalogItems,
  filterAndSortSetupItems,
  getSetupDomainOptions,
} from "./setupCatalog";
import type {
  AssessmentSetupItem,
  SetupSortOrder,
} from "./setupCatalog";

export default function AssessmentSetupPage() {
  const catalog = useMaturityModelCatalog();
  const assessmentStart = useModelAssessmentStart();
  const [drafts, setDrafts] = useState<AssessmentResponse[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDomainId, setSelectedDomainId] = useState<number | null>(null);
  const [sortOrder, setSortOrder] =
    useState<SetupSortOrder>("domain-asc");
  const [overviewItem, setOverviewItem] =
    useState<AssessmentSetupItem | null>(null);

  useEffect(() => {
    let active = true;

    const loadDrafts = async () => {
      try {
        const response = await apiClient.get<AssessmentResponse[]>(
          "/api/v1/assessments/drafts"
        );
        if (active) setDrafts(response.data);
      } catch (error) {
        console.error("Could not load draft indicators:", error);
        if (active) setDrafts([]);
      } finally {
        if (active) setDraftsLoading(false);
      }
    };

    void loadDrafts();
    return () => {
      active = false;
    };
  }, []);

  const catalogItems = useMemo(
    () => buildSetupCatalogItems(catalog.modelGroups, drafts),
    [catalog.modelGroups, drafts]
  );
  const domainOptions = useMemo(
    () => getSetupDomainOptions(catalog.domains, catalogItems),
    [catalog.domains, catalogItems]
  );
  const visibleItems = useMemo(
    () =>
      filterAndSortSetupItems(
        catalogItems,
        searchQuery,
        selectedDomainId,
        sortOrder
      ),
    [catalogItems, searchQuery, selectedDomainId, sortOrder]
  );
  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    selectedDomainId !== null ||
    sortOrder !== "domain-asc";
  const isBusy =
    assessmentStart.checkingModelId !== null ||
    assessmentStart.actionInProgress !== null;

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedDomainId(null);
    setSortOrder("domain-asc");
  };

  const handlePrimaryAction = (item: AssessmentSetupItem) => {
    if (item.currentDraft) {
      assessmentStart.continueDraft(item.currentDraft);
      return;
    }
    assessmentStart.startAssessment(item.model);
  };

  const handleOverviewPrimaryAction = () => {
    if (!overviewItem) return;
    const selectedItem = overviewItem;
    setOverviewItem(null);
    handlePrimaryAction(selectedItem);
  };

  if (catalog.loading || draftsLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <TopNavbar
          title="Maturity Assessment Platform"
          subtitle="Assess your organization’s maturity across domains and dimensions."
          backButton={{ href: "/dashboard", label: "Back to dashboard" }}
        />
        <PageLoading message="Preparing available assessments..." />
      </div>
    );
  }

  return (
    <>
      <AlertNotification
        payload={
          catalog.notification ??
          (assessmentStart.error && assessmentStart.selection === null
            ? {
                variant: "error",
                title: "Could not open assessment",
                message: assessmentStart.error,
              }
            : null)
        }
        onDismiss={
          catalog.notification
            ? catalog.dismissNotification
            : assessmentStart.closeSelection
        }
      />

      <div className="min-h-screen bg-slate-50">
        <TopNavbar
          title="Maturity Assessment Platform"
          subtitle="Assess your organization’s maturity across domains and dimensions."
          backButton={{ href: "/dashboard", label: "Back to dashboard" }}
        />

        <main className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
          <header>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-indigo-600">
              New assessment
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Choose a maturity model
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              Find the model that fits the area you want to assess, or continue
              work you’ve already started.
            </p>
          </header>

          {catalog.listLoadFailed ? (
            <LoadError onRetry={catalog.fetchCatalog} />
          ) : catalogItems.length === 0 ? (
            <EmptyCatalog />
          ) : (
            <>
              <DiscoveryToolbar
                searchQuery={searchQuery}
                selectedDomainId={selectedDomainId}
                sortOrder={sortOrder}
                domains={domainOptions}
                resultCount={visibleItems.length}
                totalCount={catalogItems.length}
                hasActiveFilters={hasActiveFilters}
                onSearchChange={setSearchQuery}
                onDomainChange={setSelectedDomainId}
                onSortChange={setSortOrder}
                onClear={clearFilters}
              />

              {visibleItems.length === 0 ? (
                <NoSearchResults onClear={clearFilters} />
              ) : (
                <section
                  aria-label="Available maturity models"
                  className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3"
                >
                  {visibleItems.map((item) => (
                    <ModelSelectionCard
                      key={item.model.id}
                      item={item}
                      isStarting={
                        assessmentStart.checkingModelId === item.model.id
                      }
                      isOpening={
                        item.currentDraft != null &&
                        assessmentStart.actionInProgress ===
                          item.currentDraft.id
                      }
                      isDisabled={isBusy}
                      onViewDetails={() => setOverviewItem(item)}
                      onPrimaryAction={() => handlePrimaryAction(item)}
                    />
                  ))}
                </section>
              )}
            </>
          )}
        </main>
      </div>

      <DraftSelectionModal
        isOpen={assessmentStart.selection !== null}
        modelName={assessmentStart.selectedModel?.name ?? "Maturity model"}
        activeVersion={assessmentStart.selectedModel?.version}
        selection={assessmentStart.selection}
        actionInProgress={assessmentStart.actionInProgress}
        error={assessmentStart.error}
        onClose={assessmentStart.closeSelection}
        onContinueDraft={assessmentStart.continueDraft}
        onStartNew={assessmentStart.startNew}
      />

      <ModelOverviewModal
        modelSummary={overviewItem?.model ?? null}
        primaryLabel={
          overviewItem?.currentDraft
            ? "Continue assessment"
            : "Start assessment"
        }
        actionInProgress={
          overviewItem != null &&
          (assessmentStart.checkingModelId === overviewItem.model.id ||
            (overviewItem.currentDraft != null &&
              assessmentStart.actionInProgress === overviewItem.currentDraft.id))
        }
        onClose={() => setOverviewItem(null)}
        onPrimaryAction={handleOverviewPrimaryAction}
      />
    </>
  );
}

function DiscoveryToolbar({
  searchQuery,
  selectedDomainId,
  sortOrder,
  domains,
  resultCount,
  totalCount,
  hasActiveFilters,
  onSearchChange,
  onDomainChange,
  onSortChange,
  onClear,
}: {
  searchQuery: string;
  selectedDomainId: number | null;
  sortOrder: SetupSortOrder;
  domains: Array<{ id: number; name: string }>;
  resultCount: number;
  totalCount: number;
  hasActiveFilters: boolean;
  onSearchChange: (value: string) => void;
  onDomainChange: (value: number | null) => void;
  onSortChange: (value: SetupSortOrder) => void;
  onClear: () => void;
}) {
  const selectClassName =
    "h-11 w-full rounded-lg border border-slate-200 bg-white px-3 pr-9 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";

  return (
    <section aria-label="Model discovery controls" className="mt-8">
      <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_220px_220px]">
        <label className="relative block">
          <span className="sr-only">
            Search maturity models, domains, or descriptions
          </span>
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search models, domains, or descriptions"
            className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </label>

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
          <span className="sr-only">Sort maturity models</span>
          <select
            value={sortOrder}
            onChange={(event) =>
              onSortChange(event.target.value as SetupSortOrder)
            }
            className={selectClassName}
          >
            <option value="domain-asc">Domain: A–Z</option>
            <option value="model-asc">Model: A–Z</option>
            <option value="in-progress">In progress first</option>
            <option value="questions-desc">Most questions</option>
          </select>
        </label>
      </div>

      <div className="mt-3 flex min-h-6 items-center justify-between gap-4 text-sm">
        <p className="text-slate-500" aria-live="polite">
          Showing <span className="font-medium text-slate-700">{resultCount}</span>{" "}
          of <span className="font-medium text-slate-700">{totalCount}</span>{" "}
          model{totalCount === 1 ? "" : "s"}
        </p>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClear}
            className="font-semibold text-indigo-600 transition hover:text-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            Clear filters
          </button>
        )}
      </div>
    </section>
  );
}

function ModelSelectionCard({
  item,
  isStarting,
  isOpening,
  isDisabled,
  onViewDetails,
  onPrimaryAction,
}: {
  item: AssessmentSetupItem;
  isStarting: boolean;
  isOpening: boolean;
  isDisabled: boolean;
  onViewDetails: () => void;
  onPrimaryAction: () => void;
}) {
  const { model, currentDraft, legacyDrafts } = item;
  const domainName = model.domainName || "General";
  const latestLegacyDraft = legacyDrafts[0] ?? null;

  return (
    <article
      className={`flex min-h-[22rem] flex-col rounded-xl border bg-white p-5 shadow-sm transition-colors ${
        isStarting || isOpening
          ? "border-indigo-400 ring-2 ring-indigo-100"
          : "border-slate-200 hover:border-indigo-200"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <DomainIcon
            iconKey={model.domainIconKey}
            colorKey={model.domainColorKey}
            name={domainName}
            size={22}
            className="rounded-xl"
          />
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              {domainName}
            </p>
            {model.version != null && (
              <p className="mt-0.5 text-xs text-slate-400">
                Active version {model.version}
              </p>
            )}
          </div>
        </div>

        {currentDraft ? (
          <span className="shrink-0 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
            In progress
          </span>
        ) : latestLegacyDraft ? (
          <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
            Earlier draft
          </span>
        ) : null}
      </div>

      <h2 className="mt-5 line-clamp-2 text-xl font-semibold leading-7 text-slate-950">
        {model.name}
      </h2>
      <p className="mt-2 line-clamp-2 min-h-12 text-sm leading-6 text-slate-600">
        {model.description || "No model description is available."}
      </p>

      <dl className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
        <ModelMetric
          icon={<Boxes className="h-3.5 w-3.5" />}
          value={model.dimensionCount}
          label="dimensions"
        />
        <ModelMetric
          icon={<ClipboardList className="h-3.5 w-3.5" />}
          value={model.moduleCount}
          label="modules"
        />
        <ModelMetric
          icon={<CircleHelp className="h-3.5 w-3.5" />}
          value={model.totalQuestions}
          label="questions"
        />
      </dl>

      {currentDraft ? (
        <div className="mt-4 rounded-lg bg-indigo-50/70 px-3.5 py-3">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="font-semibold text-indigo-950">
              {item.progress ?? 0}% complete
            </span>
            <span className="inline-flex items-center gap-1 text-indigo-700">
              <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
              Saved {item.updatedLabel}
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-indigo-100">
            <div
              className="h-full rounded-full bg-indigo-600"
              style={{ width: `${item.progress ?? 0}%` }}
            />
          </div>
        </div>
      ) : latestLegacyDraft ? (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-amber-50 px-3.5 py-3 text-xs text-amber-900">
          <Clock3 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>
            Draft saved
            {latestLegacyDraft.maturityModelVersion != null
              ? ` on version ${latestLegacyDraft.maturityModelVersion}`
              : " on an earlier version"}
            {item.updatedLabel ? ` · ${item.updatedLabel}` : ""}
          </span>
        </div>
      ) : (
        <div className="mt-4 min-h-[3.75rem]" aria-hidden="true" />
      )}

      <div className="mt-auto grid gap-3 pt-5 sm:grid-cols-2">
        <button
          type="button"
          onClick={onViewDetails}
          disabled={isDisabled}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Eye className="h-4 w-4" aria-hidden="true" />
          View details
        </button>
        <button
          type="button"
          onClick={onPrimaryAction}
          disabled={isDisabled}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-indigo-300"
        >
          {isStarting || isOpening ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              {isOpening ? "Opening..." : "Checking..."}
            </>
          ) : (
            <>
              {currentDraft ? "Continue" : "Start assessment"}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </>
          )}
        </button>
      </div>
    </article>
  );
}

function ModelMetric({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className="inline-flex items-center gap-1.5">
      <dt className="text-slate-400">{icon}</dt>
      <dd>
        <span className="font-semibold text-slate-700">{value}</span> {label}
      </dd>
    </div>
  );
}

function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="mt-8 rounded-xl border border-red-200 bg-white px-6 py-10 text-center shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">
        Maturity models could not be loaded
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        Check your connection and try again.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 inline-flex h-10 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
      >
        Try again
      </button>
    </div>
  );
}

function EmptyCatalog() {
  return (
    <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <h2 className="text-lg font-semibold text-slate-950">
        No active maturity models
      </h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">
        There are no active maturity models available for assessment yet.
      </p>
      <Link
        href="/dashboard"
        className="mt-5 inline-flex text-sm font-semibold text-indigo-600 hover:text-indigo-800"
      >
        Return to dashboard
      </Link>
    </div>
  );
}

function NoSearchResults({ onClear }: { onClear: () => void }) {
  return (
    <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
      <h2 className="text-lg font-semibold text-slate-950">
        No matching maturity models
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        Adjust your search, domain filter, or sorting preference.
      </p>
      <button
        type="button"
        onClick={onClear}
        className="mt-4 text-sm font-semibold text-indigo-600 hover:text-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
      >
        Clear filters
      </button>
    </div>
  );
}
