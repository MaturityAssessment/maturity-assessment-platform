"use client";

import { Description, Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import { Check, Loader2, Target, X } from "lucide-react";
import type { TargetProfileConfiguration } from "@/api/types";
import { Button } from "@/components/ui/button";
import { profilingPath } from "@/lib/targetProfiles";
import { cn } from "@/lib/utils";

type AssessmentProfilingDialogProps = {
  open: boolean;
  config: TargetProfileConfiguration;
  answers: Record<string, string>;
  saving: boolean;
  error: string | null;
  onChange: (answers: Record<string, string>) => void;
  onSave: () => void;
  onDismiss: () => void;
};

export default function AssessmentProfilingDialog({
  open, config, answers, saving, error, onChange, onSave, onDismiss,
}: AssessmentProfilingDialogProps) {
  const path = profilingPath(config, answers);
  const profile = config.profiles.find(item => item.id === path.selection.profileId);
  const answeredCount = Object.keys(path.selection.answers).length;

  return (
    <Dialog open={open} onClose={onDismiss} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm" />
      <div className="fixed inset-0 flex items-center justify-center p-3 sm:p-6">
        <DialogPanel className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-950/5 sm:max-h-[calc(100dvh-3rem)]">
          <div className="flex shrink-0 items-start gap-3 border-b border-slate-100 px-5 py-5 sm:gap-4 sm:px-7 sm:py-6">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-inset ring-indigo-100">
              <Target className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Assessment context</p>
              <DialogTitle className="text-lg font-semibold tracking-tight text-slate-950 sm:text-xl">Find your target profile</DialogTitle>
              <Description className="mt-2 text-sm leading-6 text-slate-500">Tell us about your organization to find the right expectations for your results. Your answers won’t change assessment questions or scores.</Description>
            </div>
            <button type="button" data-autofocus onClick={onDismiss} aria-label="Close target profile questions" className="-mr-1 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <div className="min-h-0 space-y-5 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7 sm:py-6">
            <p className="text-xs font-medium text-slate-500">{answeredCount} {answeredCount === 1 ? "question" : "questions"} answered{path.selection.complete ? " · Profile ready" : " · Follow-up questions may appear"}</p>
            {path.questions.map((question, index) => (
              <fieldset key={question.id}>
                <legend className="mb-3 text-sm font-semibold leading-6 text-slate-900"><span className="mr-2 text-slate-400">{String(index + 1).padStart(2, "0")}</span>{question.text}</legend>
                <div className="space-y-2">
                  {question.options.map(option => (
                    <label key={option.id} className={cn("flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-sm leading-6 transition focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2", answers[question.id] === option.id ? "border-indigo-300 bg-indigo-50/60 text-indigo-950" : "border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50")}>
                      <input type="radio" name={"profiling-" + question.id} value={option.id} checked={answers[question.id] === option.id} className="mt-1 h-4 w-4 shrink-0 border-slate-300 text-indigo-600 focus:ring-0 focus:ring-offset-0" onChange={() => onChange(profilingPath(config, { ...answers, [question.id]: option.id }).selection.answers)} />
                      <span className="min-w-0 break-words">{option.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}

            {path.selection.complete && (
              <div role="status" className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Your target profile</p>
                  <p className="mt-1 break-words text-sm font-semibold text-slate-950">{profile?.name || "No target profile applies"}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{profile?.description || (profile ? "Your evaluated results will be compared with this profile’s requirements." : "You can complete this assessment without a target comparison.")}</p>
                </div>
              </div>
            )}
            {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error} Your answers are kept here. Try saving again.</p>}
          </div>

          <div className="shrink-0 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-7">
            <p className="mb-4 text-xs leading-5 text-slate-500">You can do this later from Overall progress. Complete your profile before submitting; answers remain editable until then.</p>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button type="button" variant="ghost" onClick={onDismiss} className="text-slate-600">Skip for now</Button>
              <Button type="button" disabled={!path.selection.complete || saving} onClick={onSave}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {saving ? "Saving…" : "Save profile"}
              </Button>
            </div>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
