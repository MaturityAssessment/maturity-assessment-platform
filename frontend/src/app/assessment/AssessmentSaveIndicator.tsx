"use client";

import {
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AssessmentSaveStatus } from "./assessmentAutosave";

type AssessmentSaveIndicatorProps = {
  status: AssessmentSaveStatus;
  error?: string | null;
  onRetry: () => void;
  className?: string;
};

export default function AssessmentSaveIndicator({
  status,
  error,
  onRetry,
  className,
}: AssessmentSaveIndicatorProps) {
  if (status === "error") {
    return (
      <div
        role="alert"
        title={error || "Could not save your changes."}
        className={cn(
          "inline-flex min-h-9 items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700",
          className
        )}
      >
        <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>Changes not saved</span>
        <span aria-hidden="true">·</span>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-sm underline underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-xs font-semibold",
        status === "saving"
          ? "border-slate-200 bg-slate-50 text-slate-600"
          : "border-emerald-200 bg-emerald-50 text-emerald-700",
        className
      )}
    >
      {status === "saving" ? (
        <Loader2
          className="h-4 w-4 shrink-0 animate-spin"
          aria-hidden="true"
        />
      ) : (
        <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
      )}
      <span>
        {status === "saving" ? "Saving…" : "All changes saved"}
      </span>
    </div>
  );
}
