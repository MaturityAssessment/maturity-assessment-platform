"use client";

import {
  AlertCircle,
  CheckCircle2,
  FileStack,
  Flag,
  RotateCcw,
  Save,
} from "lucide-react";
import Tippy from "@tippyjs/react";
import { cn } from "@/lib/utils";
import type { EvaluationProgress } from "./types";

interface EvaluationActionBarProps {
  progress: EvaluationProgress;
  evidenceCount: number;
  saving: boolean;
  submitting: boolean;
  sendingBack: boolean;
  deleting: boolean;
  canSubmit: boolean;
  canSendBack: boolean;
  canSave: boolean;
  onSave: () => void;
  onFinish: () => void;
  onSendBack: () => void;
}

export default function EvaluationActionBar({
  progress,
  evidenceCount,
  saving,
  submitting,
  sendingBack,
  deleting,
  canSubmit,
  canSendBack,
  canSave,
  onSave,
  onFinish,
  onSendBack,
}: EvaluationActionBarProps) {
  const busy = saving || submitting || sendingBack || deleting;
  const blockers =
    progress.missingStatus +
    progress.missingManualScores +
    progress.missingNotes +
    progress.flagged;
  const blockerLines = [
    progress.missingStatus > 0
      ? `${progress.missingStatus} question${progress.missingStatus === 1 ? "" : "s"} without review status`
      : null,
    progress.missingManualScores > 0
      ? `${progress.missingManualScores} required manual score${progress.missingManualScores === 1 ? "" : "s"} missing`
      : null,
    progress.missingNotes > 0
      ? `${progress.missingNotes} required reviewer note${progress.missingNotes === 1 ? "" : "s"} missing`
      : null,
    progress.flagged > 0
      ? `${progress.flagged} flagged item${progress.flagged === 1 ? "" : "s"} must be resolved or sent back`
      : null,
  ].filter((line): line is string => Boolean(line));

  return (
    <aside className="sticky top-4 space-y-3">
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-950">Review status</p>
          {blockers === 0 ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          ) : (
            <Tippy
              content={
                <div className="max-w-xs p-1 text-sm">
                  <p className="font-semibold">Submission blockers</p>
                  <ul className="mt-1 list-disc space-y-1 pl-4">
                    {blockerLines.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              }
            >
              <button
                type="button"
                className="rounded-md text-amber-600 outline-none focus:ring-2 focus:ring-amber-500"
                aria-label="Show submission blockers"
              >
                <AlertCircle className="h-5 w-5" />
              </button>
            </Tippy>
          )}
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-gray-100">
          <div
            className={cn(
              "h-full rounded-full",
              blockers === 0 ? "bg-emerald-600" : "bg-blue-600"
            )}
            style={{
              width: `${progress.total === 0 ? 100 : (progress.reviewed / progress.total) * 100}%`,
            }}
          />
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <Metric label="Reviewed" value={`${progress.reviewed}/${progress.total}`} />
          <Metric label="Missing scores" value={String(progress.missingManualScores)} />
          <Metric label="Missing notes" value={String(progress.missingNotes)} />
          <Metric label="No status" value={String(progress.missingStatus)} />
        </dl>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <SmallStat icon={Flag} label="Flagged" value={String(progress.flagged)} />
        <SmallStat icon={FileStack} label="Evidence" value={String(evidenceCount)} />
      </div>

      <div className="space-y-2 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
        <button
          type="button"
          onClick={onSave}
          disabled={!canSave || busy}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save review progress"}
        </button>
        <button
          type="button"
          onClick={onFinish}
          disabled={!canSubmit || busy}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CheckCircle2 className="h-4 w-4" />
          {submitting ? "Finishing..." : "Finish assessment"}
        </button>
        <button
          type="button"
          onClick={onSendBack}
          disabled={!canSendBack || busy}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-red-200 bg-white px-4 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RotateCcw className="h-4 w-4" />
          {sendingBack ? "Sending back..." : "Send back for changes"}
        </button>
        {!canSendBack && (
          <p className="text-xs leading-5 text-gray-500">
            Flag at least one item and add a reviewer note to send it back.
          </p>
        )}
      </div>
    </aside>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="mt-0.5 font-semibold text-gray-950">{value}</dd>
    </div>
  );
}

function SmallStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Flag;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <p className="mt-2 text-lg font-semibold text-gray-950">{value}</p>
    </div>
  );
}
