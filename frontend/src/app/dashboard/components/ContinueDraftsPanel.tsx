import { ArrowRight } from "lucide-react";
import type { AssessmentResponse } from "@/api/types";
import type { DashboardAssessmentView } from "../types";
import {
  AssessmentIcon,
  DashboardPanel,
  EmptyState,
} from "./DashboardPrimitives";

export const QUICK_ACCESS_LIMIT = 4;

export default function ContinueDraftsPanel({
  drafts,
  onContinue,
}: {
  drafts: DashboardAssessmentView[];
  onContinue: (assessment: AssessmentResponse) => void;
}) {
  return (
    <DashboardPanel
      title="Continue where you left off"
      description="Your most recently updated drafts"
      action={
        drafts.length > QUICK_ACCESS_LIMIT ? (
          <a
            href="#all-assessments"
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-800"
          >
            View all drafts
          </a>
        ) : undefined
      }
    >
      {drafts.length === 0 ? (
        <EmptyState
          title="No drafts in progress"
          description="Start an assessment and save it to pick up from here later."
          href="/assessment/setup"
          action="Start your first assessment"
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {drafts.slice(0, QUICK_ACCESS_LIMIT).map((assessment) => (
            <button
              key={assessment.id}
              type="button"
              onClick={() => onContinue(assessment.assessment)}
              className="group flex min-h-52 flex-col rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <div className="flex w-full items-start justify-between gap-3">
                <AssessmentIcon
                  iconKey={assessment.domainIconKey}
                  colorKey={assessment.domainColorKey}
                  domainName={assessment.domain}
                />
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                  In progress
                </span>
              </div>
              <div className="mt-5 min-w-0 flex-1">
                <h3 className="line-clamp-2 font-semibold leading-5 text-slate-900">
                  {assessment.name}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  {assessment.domain}
                  {assessment.version != null
                    ? ` · v${assessment.version}`
                    : ""}
                </p>
              </div>
              <div className="mt-4 w-full">
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-indigo-600"
                    style={{ width: `${assessment.progress}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                  <span>{assessment.progress}% saved</span>
                  <span className="inline-flex items-center gap-1 font-medium text-indigo-600">
                    Continue
                    <ArrowRight
                      className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </DashboardPanel>
  );
}
