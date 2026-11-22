"use client";

import { ArrowUpRight, Target } from "lucide-react";
import type { AssessmentProfiling } from "@/api/types";

export default function AssessmentTargetProfileSummary({ profiling, onEdit }: {
  profiling?: AssessmentProfiling | null;
  onEdit?: () => void;
}) {
  const complete = Boolean(profiling?.complete);
  const hasAnswers = Object.keys(profiling?.answers ?? {}).length > 0;

  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
        <Target className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
        Target profile
      </div>
      <p className="mt-1.5 break-words text-sm font-medium leading-5 text-slate-800">{complete ? profiling?.profileName || "No target profile applies" : hasAnswers ? "Setup in progress" : "Not set up yet"}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{complete ? profiling?.profileId ? "Expectations for your evaluated results." : "Your results won’t include a target comparison." : onEdit ? "Complete before submitting your assessment." : "Target profile setup was not completed."}</p>
      {onEdit && (
        <button type="button" onClick={onEdit} className="mt-2 inline-flex items-center gap-1 rounded text-xs font-medium text-indigo-600 transition hover:text-indigo-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2">
          {complete ? "Review answers" : hasAnswers ? "Continue setup" : "Set up profile"}
          <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
