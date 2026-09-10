import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import type { MaturityModelSummary } from "@/api/types";
import { DomainIcon } from "@/components/DomainIcon";

export default function ModelRepositoryHeader({
  model,
  modelRootId,
  version,
  actions,
  footer,
}: {
  model: MaturityModelSummary;
  modelRootId: number;
  version?: number;
  actions?: ReactNode;
  footer?: ReactNode;
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
        {version != null ? (
          <>
            <Link
              href={`/maturity-models/${modelRootId}`}
              className="max-w-[22rem] truncate rounded px-1 py-0.5 transition hover:bg-indigo-50 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              {model.name}
            </Link>
            <ChevronRight
              className="h-3.5 w-3.5 shrink-0"
              aria-hidden="true"
            />
            <span className="text-indigo-600" aria-current="page">
              v{version}
            </span>
          </>
        ) : (
          <span
            className="truncate text-indigo-600"
            aria-current="page"
            title={model.name}
          >
            {model.name}
          </span>
        )}
      </nav>

      <div className="flex min-w-0 flex-col gap-7 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-5">
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
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
              {model.name}
            </h1>
            <p className="mt-2.5 max-w-3xl text-sm leading-6 text-slate-600">
              {model.description?.trim() || "No model description provided."}
            </p>
          </div>
        </div>
        {actions && <div className="shrink-0 lg:pt-4">{actions}</div>}
      </div>

      {footer}
    </header>
  );
}
