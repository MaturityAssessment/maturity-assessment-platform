"use client";

import type { TargetProfileConfiguration } from "@/api/types";
import { profilingPath } from "@/lib/targetProfiles";

export default function AssessmentProfilingStep({ modelName, config, answers, saving, error, onChange, onContinue, onLeave }: {
  modelName: string;
  config: TargetProfileConfiguration;
  answers: Record<string, string>;
  saving: boolean;
  error: string | null;
  onChange: (answers: Record<string, string>) => void;
  onContinue: () => void;
  onLeave: () => void;
}) {
  const path = profilingPath(config, answers);
  const profile = config.profiles.find(item => item.id === path.selection.profileId);
  return <main className="min-h-screen bg-slate-50 px-4 py-10 sm:py-16">
    <div className="mx-auto max-w-2xl space-y-6">
      <div><p className="text-sm font-semibold text-indigo-700">{modelName}</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Find your target profile</h1><p className="mt-3 text-sm leading-6 text-slate-600">Tell us about your organization so your results can be compared with the right expectations. These answers do not change the assessment questions or your scores.</p></div>
      {path.questions.map((question, index) => <fieldset key={question.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <legend className="px-2 text-base font-semibold text-slate-950">{index + 1}. {question.text}</legend>
        <div className="space-y-3 pt-2">{question.options.map(option => <label key={option.id} className={"flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-sm " + (answers[question.id] === option.id ? "border-indigo-400 bg-indigo-50 text-indigo-950" : "border-slate-200 text-slate-700 hover:bg-slate-50")}>
          <input type="radio" className="mt-0.5" name={"profiling-" + question.id} checked={answers[question.id] === option.id} onChange={() => onChange(profilingPath(config, { ...answers, [question.id]: option.id }).selection.answers)} />
          <span>{option.label}</span>
        </label>)}</div>
      </fieldset>)}
      {path.selection.complete && <div role="status" className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Your target profile</p>
        <p className="mt-1 text-lg font-semibold text-indigo-950">{profile?.name || "No target profile applies"}</p>
        <p className="mt-2 text-sm leading-6 text-indigo-900">{profile?.description || (profile ? "Your final evaluated results will be compared with this profile's requirements." : "You can complete the assessment and receive your results without a target comparison.")}</p>
      </div>}
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700" onClick={onLeave}>Continue later</button>
        <button type="button" className="rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50" disabled={!path.selection.complete || saving} onClick={onContinue}>{saving ? "Saving…" : "Continue to assessment"}</button>
      </div>
      <p className="text-xs leading-5 text-slate-500">Your answers are saved with this draft. You can revise your profile until you submit the assessment.</p>
    </div>
  </main>;
}
