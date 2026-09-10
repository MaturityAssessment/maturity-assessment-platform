import Link from "next/link";
import { CircleHelp, Plus } from "lucide-react";

export default function DashboardHeader({
  firstName,
  onStartTour,
  tourDisabled = false,
}: {
  firstName?: string;
  onStartTour: () => void;
  tourDisabled?: boolean;
}) {
  return (
    <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-indigo-600">
          Assessment workspace
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
          Welcome back{firstName ? `, ${firstName}` : ""}!
        </h1>
        <p className="mt-2 text-sm text-slate-600 sm:text-base">
          Continue your work or review your latest assessment results.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onStartTour}
          disabled={tourDisabled}
          className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Show dashboard tour"
          title={
            tourDisabled
              ? "The dashboard tour is available when its content is ready"
              : "Show dashboard tour"
          }
        >
          <CircleHelp className="h-5 w-5" aria-hidden="true" />
        </button>
        <Link
          href="/assessment/setup"
          data-help-tour="dashboard-start-assessment"
          className="inline-flex min-h-11 w-fit items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-2"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Start assessment
        </Link>
      </div>
    </header>
  );
}
