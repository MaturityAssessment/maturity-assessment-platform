import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  ClipboardList,
  Clock3,
  MessageSquareWarning,
} from "lucide-react";
import type { DashboardAssessmentView } from "../types";
import { DomainIcon } from "@/components/DomainIcon";

export function DashboardPanel({
  id,
  title,
  description,
  action,
  helpTourTarget,
  children,
}: {
  id?: string;
  title: string;
  description: string;
  action?: ReactNode;
  helpTourTarget?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <div
        data-help-tour={helpTourTarget}
        className="mb-5 flex items-start justify-between gap-4"
      >
        <div>
          <h2 className="text-lg font-bold text-slate-950">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function AssessmentIcon({
  iconKey,
  colorKey,
  domainName,
}: {
  iconKey?: string;
  colorKey?: string;
  domainName?: string;
} = {}) {
  if (domainName) {
    return (
      <DomainIcon
        iconKey={iconKey}
        colorKey={colorKey}
        name={domainName}
        size={20}
        className="!h-10 !w-10 !rounded-xl"
      />
    );
  }
  return (
    <span
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"
      aria-hidden="true"
    >
      <ClipboardList className="h-5 w-5" strokeWidth={1.9} />
    </span>
  );
}

export function StatusBadge({
  status,
}: {
  status: DashboardAssessmentView["status"];
}) {
  if (status === "draft") {
    return (
      <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
        In progress
      </span>
    );
  }
  if (status === "pending-review") {
    return (
      <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
        Pending review
      </span>
    );
  }
  if (status === "changes-requested") {
    return (
      <span className="inline-flex rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700">
        Changes requested
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
      Completed
    </span>
  );
}

export function ProgressResult({
  assessment,
}: {
  assessment: DashboardAssessmentView;
}) {
  if (assessment.status === "changes-requested") {
    return (
      <div className="flex min-w-32 items-center gap-2 text-sm font-medium text-orange-700">
        <MessageSquareWarning
          className="h-4 w-4 shrink-0"
          aria-hidden="true"
        />
        <span>Review feedback</span>
      </div>
    );
  }

  if (assessment.status === "pending-review") {
    return (
      <div className="flex min-w-32 items-center gap-2 text-sm font-medium text-amber-700">
        <Clock3 className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>Awaiting evaluation</span>
      </div>
    );
  }

  if (assessment.status === "completed") {
    return (
      <div className="flex min-w-32 items-center gap-2">
        <Award
          className="h-4 w-4 shrink-0 text-emerald-600"
          aria-hidden="true"
        />
        <span className="min-w-0">
          <span className="block text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Final maturity level
          </span>
          <span className="block truncate text-sm font-semibold text-slate-800">
            {assessment.maturityLevel || "Not available"}
          </span>
        </span>
      </div>
    );
  }

  return (
    <div
      className="flex min-w-32 items-center gap-3"
      aria-label={`${assessment.progress}% complete`}
    >
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-indigo-600"
          style={{ width: `${assessment.progress}%` }}
        />
      </div>
      <span className="w-9 text-right text-xs font-medium text-slate-600">
        {assessment.progress}%
      </span>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  href,
  action,
}: {
  title: string;
  description: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center">
      <AssessmentIcon />
      <h3 className="mt-3 font-semibold text-slate-900">{title}</h3>
      <p className="mx-auto mt-1 max-w-lg text-sm text-slate-500">
        {description}
      </p>
      {href && action && (
        <Link
          href={href}
          className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-800"
        >
          {action}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
