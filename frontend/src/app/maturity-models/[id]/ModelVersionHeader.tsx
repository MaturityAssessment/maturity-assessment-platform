import {
  CalendarDays,
  Check,
  ChevronRight,
  GitBranch,
  LayoutGrid,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import type { MaturityModelSummary } from "@/api/types";
import { DomainIcon } from "@/components/DomainIcon";

type VersionTab = "overview" | "structure";

export default function ModelVersionHeader({
  model,
  modelRootId,
  versionId,
  version,
  isActive,
  createdAt,
  activeTab,
  actions,
}: {
  model: MaturityModelSummary;
  modelRootId: number;
  versionId: string;
  version?: number;
  isActive: boolean;
  createdAt?: string | null;
  activeTab: VersionTab;
  actions: ReactNode;
}) {
  return (
    <header className="mb-8">
      <nav
        aria-label="Breadcrumb"
        className="mb-6 flex min-w-0 items-center gap-2 text-xs font-medium text-slate-500"
      >
        <Link
          href="/maturity-models"
          className="rounded px-1 py-0.5 transition hover:bg-indigo-50 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          Maturity models
        </Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <Link
          href={`/maturity-models/${modelRootId}`}
          className="max-w-[22rem] truncate rounded px-1 py-0.5 transition hover:bg-indigo-50 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          {model.name}
        </Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="text-indigo-600" aria-current="page">
          Version details
        </span>
      </nav>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex min-w-0 flex-col gap-6 px-5 py-6 sm:px-7 sm:py-7 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-4 sm:gap-5">
            <DomainIcon
              iconKey={model.domainIconKey}
              colorKey={model.domainColorKey}
              name={model.domainName}
              size={22}
              className="!h-12 !w-12 !rounded-xl"
            />

            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                {model.domainName ?? "Maturity model"}
              </p>

              <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                  {model.name}
                </h1>
                <span className="inline-flex items-center rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-bold tabular-nums text-white shadow-sm ring-1 ring-inset ring-indigo-500">
                  v{version ?? "?"}
                </span>
                {isActive ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/10">
                    <Check className="h-3 w-3" aria-hidden="true" />
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-slate-400"
                      aria-hidden="true"
                    />
                    Inactive
                  </span>
                )}
              </div>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                {model.description?.trim() || "No model description provided."}
              </p>

              {createdAt && (
                <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-slate-400">
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                  Created {createdAt}
                </p>
              )}
            </div>
          </div>

          <div className="shrink-0 lg:pt-6">{actions}</div>
        </div>

        <nav
          aria-label="Version views"
          className="flex gap-1 border-t border-slate-200 bg-slate-50/60 px-3 sm:px-5"
        >
          <Link
            href={`/maturity-models/${modelRootId}/versions/${versionId}`}
            aria-current={activeTab === "overview" ? "page" : undefined}
            className={`inline-flex items-center gap-2 border-b-2 px-3 py-3.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 ${
              activeTab === "overview"
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800"
            }`}
          >
            <LayoutGrid className="h-4 w-4" aria-hidden="true" />
            Overview
          </Link>
          <Link
            href={`/maturity-models/${modelRootId}/versions/${versionId}?tab=structure`}
            aria-current={activeTab === "structure" ? "page" : undefined}
            className={`inline-flex items-center gap-2 border-b-2 px-3 py-3.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 ${
              activeTab === "structure"
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800"
            }`}
          >
            <GitBranch className="h-4 w-4" aria-hidden="true" />
            Structure
          </Link>
        </nav>
      </section>
    </header>
  );
}
