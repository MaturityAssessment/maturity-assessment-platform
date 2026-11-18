import { useState } from "react";
import type { MaturityModelEditorDocument, ProfilingQuestion, TargetProfile, TargetProfileConfiguration, TargetProfileRequirement } from "@/api/types";
import { profilingPath, targetProfileIssues } from "@/lib/targetProfiles";
import { inputClass, Panel } from "../components/FormFields";

const option = (label = "") => ({ id: crypto.randomUUID(), label, destination: { type: "none" as const, id: null } });
const question = (): ProfilingQuestion => ({ id: crypto.randomUUID(), text: "", options: [option(), option()] });
const button = "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50";

export default function TargetProfilesStep({ document, onChange }: {
  document: MaturityModelEditorDocument;
  onChange: (document: MaturityModelEditorDocument) => void;
}) {
  const config = document.targetProfiles;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewAnswers, setPreviewAnswers] = useState<Record<string, string>>({});
  const update = (next: TargetProfileConfiguration | null) => onChange({ ...document, targetProfiles: next });
  const activeProfile = config?.profiles.find(profile => profile.id === selectedId) ?? config?.profiles[0];
  const updateProfile = (profile: TargetProfile) => config && update({ ...config, profiles: config.profiles.map(item => item.id === profile.id ? profile : item) });
  const updateQuestion = (next: ProfilingQuestion) => config && update({ ...config, questions: config.questions.map(item => item.id === next.id ? next : item) });
  const issues = targetProfileIssues(document);

  if (!config) return <Panel title="Target profiles" description="Set expectations for different respondent contexts.">
    <p className="text-sm leading-6 text-slate-600">Use profiling questions to identify one target profile, or continue without a profile when none applies. Each profile can set minimum scores for selected dimensions and modules, plus an expected overall maturity level.</p>
    <button type="button" className={button + " mt-5"} onClick={() => {
      const profile: TargetProfile = { id: crypto.randomUUID(), name: "New profile", description: "", requirements: [], expectedLevel: null };
      const first = question();
      first.text = "Does this profile describe your organization?";
      first.options[0].label = "Yes";
      first.options[0].destination = { type: "profile", id: profile.id };
      first.options[1].label = "No";
      update({ version: 1, rootQuestionId: first.id, questions: [first], profiles: [profile] });
      setSelectedId(profile.id);
    }}>Add target profiles</button>
  </Panel>;

  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h2 className="text-xl font-semibold text-slate-950">Target profiles</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">Route respondents through single-choice questions. Compare the matched profile with final evaluated scores. A minimum is met when the actual result reaches or exceeds it.</p></div>
      <button type="button" className={button} onClick={() => {
        if (window.confirm("Remove all target profiles and profiling questions from this model version?")) update(null);
      }}>Remove profiling</button>
    </div>
    {issues.length > 0 && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4" role="status">
      <p className="font-medium text-amber-950">Review profiling configuration</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900">{Array.from(new Set(issues.map(issue => issue.message))).map(message => <li key={message}>{message}</li>)}</ul>
    </div>}
    <Panel title="Profile requirements" description="Only configured targets are compared. Module targets and the overall maturity level are optional.">
      <div className="grid gap-5 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="space-y-2">
          <div className="space-y-2" aria-label="Target profiles">
            {config.profiles.map(profile => <button key={profile.id} type="button" aria-pressed={activeProfile?.id === profile.id} onClick={() => setSelectedId(profile.id)} className={"w-full rounded-lg border px-3 py-3 text-left text-sm " + (activeProfile?.id === profile.id ? "border-indigo-300 bg-indigo-50 font-semibold text-indigo-950" : "border-slate-200 text-slate-700")}>{profile.name || "Unnamed profile"}</button>)}
          </div>
          <button type="button" className={button + " w-full"} disabled={config.profiles.length >= 128} onClick={() => {
            const profile: TargetProfile = { id: crypto.randomUUID(), name: "", description: "", requirements: [], expectedLevel: null };
            update({ ...config, profiles: [...config.profiles, profile] }); setSelectedId(profile.id);
          }}>Add profile</button>
        </aside>
        {activeProfile && <div className="min-w-0 space-y-4">
          <label className="block text-sm font-medium text-slate-700">Profile name<input className={inputClass} maxLength={200} value={activeProfile.name} onChange={event => updateProfile({ ...activeProfile, name: event.target.value })} /></label>
          <label className="block text-sm font-medium text-slate-700">Description<textarea className={inputClass} rows={2} maxLength={4000} value={activeProfile.description ?? ""} onChange={event => updateProfile({ ...activeProfile, description: event.target.value })} /></label>
          <label className="block text-sm font-medium text-slate-700">Expected overall maturity level<select className={inputClass} value={activeProfile.expectedLevel ?? ""} onChange={event => updateProfile({ ...activeProfile, expectedLevel: event.target.value === "" ? null : Number(event.target.value) })}>
            <option value="">No overall level target</option>
            {activeProfile.expectedLevel != null && !document.levels.some(level => level.number === activeProfile.expectedLevel) && <option value={activeProfile.expectedLevel}>Removed level — choose another</option>}
            {document.levels.map(level => <option key={level.number} value={level.number}>{level.number} — {level.name || "Unnamed level"}</option>)}
          </select></label>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-950">Minimum scores</h3>
            {activeProfile.requirements.length === 0 && <p className="text-sm text-slate-500">No dimension or module minima configured.</p>}
            {activeProfile.requirements.map((requirement, index) => {
              const reference = JSON.stringify([requirement.elementType, requirement.dimensionCode, requirement.moduleCode]);
              const choices = document.dimensions.flatMap(dimension => [
                { value: JSON.stringify(["dimension", dimension.code, null]), label: dimension.name || dimension.code },
                ...dimension.modules.filter(item => item.visible !== false).map(item => ({ value: JSON.stringify(["module", dimension.code, item.code]), label: (dimension.name || dimension.code) + " / " + (item.name || item.code) })),
              ]);
              const change = (next: TargetProfileRequirement) => updateProfile({ ...activeProfile, requirements: activeProfile.requirements.map((item, position) => position === index ? next : item) });
              return <div key={index} className="grid gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-[minmax(0,1fr)_8rem_auto]">
                <label className="min-w-0 text-xs font-medium text-slate-600">Dimension or module<select className={inputClass} value={reference} onChange={event => {
                  const [elementType, dimensionCode, moduleCode] = JSON.parse(event.target.value) as [TargetProfileRequirement["elementType"], string, string | null];
                  change({ ...requirement, elementType, dimensionCode, moduleCode });
                }}>
                  {!choices.some(choice => choice.value === reference) && <option value={reference}>Missing target — choose another</option>}
                  {choices.map(choice => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
                </select></label>
                <label className="text-xs font-medium text-slate-600">Minimum (%)<input type="number" min={0} max={100} step={0.1} className={inputClass} value={Number.isFinite(requirement.minimumScore) ? Math.round(requirement.minimumScore * 1000) / 10 : ""} onChange={event => change({ ...requirement, minimumScore: event.target.valueAsNumber / 100 })} /></label>
                <button type="button" aria-label={"Remove minimum " + (index + 1)} className={button + " self-end"} onClick={() => updateProfile({ ...activeProfile, requirements: activeProfile.requirements.filter((_, position) => position !== index) })}>Remove</button>
              </div>;
            })}
            <button type="button" className={button} disabled={!document.dimensions.length || activeProfile.requirements.length >= 2048} onClick={() => {
              const candidates = document.dimensions.flatMap(dimension => [
                { elementType: "dimension" as const, dimensionCode: dimension.code, moduleCode: null, minimumScore: 0 },
                ...dimension.modules.filter(item => item.visible !== false).map(item => ({ elementType: "module" as const, dimensionCode: dimension.code, moduleCode: item.code, minimumScore: 0 })),
              ]);
              const target = candidates.find(candidate => !activeProfile.requirements.some(item => item.elementType === candidate.elementType && item.dimensionCode === candidate.dimensionCode && item.moduleCode === candidate.moduleCode));
              if (target) updateProfile({ ...activeProfile, requirements: [...activeProfile.requirements, target] });
            }}>Add minimum score</button>
          </div>
          <button type="button" className={button + " text-red-700"} onClick={() => {
            if (window.confirm("Delete this profile? Any question branches pointing to it will need a new destination.")) update({ ...config, profiles: config.profiles.filter(profile => profile.id !== activeProfile.id) });
          }}>Delete profile</button>
        </div>}
      </div>
    </Panel>
    <Panel title="Profiling decision tree" description="Each answer leads to one follow-up question, a profile, or no profile. Connect every question to the first question.">
      <label className="block max-w-xl text-sm font-medium text-slate-700">First question<select className={inputClass} value={config.rootQuestionId} onChange={event => update({ ...config, rootQuestionId: event.target.value })}>
        {!config.questions.some(item => item.id === config.rootQuestionId) && <option value={config.rootQuestionId}>Select a first question</option>}
        {config.questions.map((item, index) => <option key={item.id} value={item.id}>{index + 1}. {item.text || "Untitled question"}</option>)}
      </select></label>
      <div className="mt-5 overflow-x-auto rounded-xl border border-indigo-100 bg-indigo-50/40 p-4" aria-label="Profiling tree overview">
        <ProfilingTree config={config} questionId={config.rootQuestionId} visited={[]} />
      </div>
      <div className="mt-5 space-y-4">
        {config.questions.map((item, index) => <div key={item.id} id={"profiling-question-" + item.id} className="scroll-mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3"><h3 className="font-semibold text-slate-950">Question {index + 1}{item.id === config.rootQuestionId ? " · Start" : ""}</h3>
            <button type="button" className={button} onClick={() => {
              if (window.confirm("Delete this question? Branches pointing to it will need a new destination.")) update({ ...config, questions: config.questions.filter(candidate => candidate.id !== item.id) });
            }}>Delete question</button>
          </div>
          <label className="mt-3 block text-sm font-medium text-slate-700">Question text<input maxLength={1000} className={inputClass} value={item.text} onChange={event => updateQuestion({ ...item, text: event.target.value })} /></label>
          <div className="mt-3 space-y-3">
            {item.options.map((answer, position) => {
              const value = answer.destination.type + (answer.destination.id ? ":" + answer.destination.id : "");
              const destinations = [{ value: "none", label: "No target profile" },
                ...config.profiles.map(profile => ({ value: "profile:" + profile.id, label: "Profile: " + (profile.name || "Unnamed profile") })),
                ...config.questions.filter(candidate => candidate.id !== item.id).map(candidate => ({ value: "question:" + candidate.id, label: "Question " + (config.questions.indexOf(candidate) + 1) + ": " + (candidate.text || "Untitled") })),
              ];
              const change = (next: typeof answer) => updateQuestion({ ...item, options: item.options.map((candidate, offset) => offset === position ? next : candidate) });
              return <div key={answer.id} className="grid gap-3 rounded-lg bg-white p-3 sm:grid-cols-[1fr_1.2fr_auto]">
                <label className="min-w-0 text-xs font-medium text-slate-600">Answer {position + 1}<input maxLength={200} className={inputClass} value={answer.label} onChange={event => change({ ...answer, label: event.target.value })} /></label>
                <label className="min-w-0 text-xs font-medium text-slate-600">Then go to<select className={inputClass} value={value} onChange={event => {
                  const [type, id] = event.target.value.split(":");
                  change({ ...answer, destination: { type: type as typeof answer.destination.type, id: id ?? null } });
                }}>{!destinations.some(destination => destination.value === value) && <option value={value}>Missing destination — choose another</option>}{destinations.map(destination => <option key={destination.value} value={destination.value}>{destination.label}</option>)}</select></label>
                <button type="button" className={button + " self-end"} aria-label={"Remove answer " + (position + 1) + " from question " + (index + 1)} disabled={item.options.length <= 2} onClick={() => updateQuestion({ ...item, options: item.options.filter(candidate => candidate.id !== answer.id) })}>Remove</button>
              </div>;
            })}
          </div>
          <button type="button" className={button + " mt-3"} disabled={item.options.length >= 32} onClick={() => updateQuestion({ ...item, options: [...item.options, option()] })}>Add answer</button>
        </div>)}
      </div>
      <button type="button" className={button + " mt-4"} disabled={config.questions.length >= 128} onClick={() => update({ ...config, questions: [...config.questions, question()] })}>Add question</button>
    </Panel>
    <Panel title="Try the profiling path" description="Preview the questions a respondent would see. These preview answers are not saved.">
      <div className="space-y-4">
        {profilingPath(config, previewAnswers).questions.map(item => <fieldset key={item.id} className="rounded-lg border border-slate-200 p-4"><legend className="px-1 text-sm font-semibold text-slate-900">{item.text || "Untitled question"}</legend><div className="flex flex-wrap gap-3">{item.options.map(answer => <label key={answer.id} className="inline-flex items-center gap-2 text-sm text-slate-700"><input type="radio" name={"preview-" + item.id} checked={previewAnswers[item.id] === answer.id} onChange={() => setPreviewAnswers(profilingPath(config, { ...previewAnswers, [item.id]: answer.id }).selection.answers)} />{answer.label || "Unnamed answer"}</label>)}</div></fieldset>)}
        {profilingPath(config, previewAnswers).selection.complete && <p role="status" className="rounded-lg bg-indigo-50 p-4 text-sm font-semibold text-indigo-950">{profilingPath(config, previewAnswers).selection.profileName || "No target profile applies"}</p>}
        <button type="button" className={button} onClick={() => setPreviewAnswers({})}>Reset preview</button>
      </div>
    </Panel>
  </div>;
}

function ProfilingTree({ config, questionId, visited }: { config: TargetProfileConfiguration; questionId: string; visited: string[] }) {
  const current = config.questions.find(item => item.id === questionId);
  if (!current || visited.includes(questionId)) return <p className="text-sm text-rose-700">Missing question or circular branch — repair the destinations below.</p>;
  if (visited.length > 16) return <a className="text-sm text-indigo-700 underline" href={"#profiling-question-" + questionId}>Continue with {current.text || "Untitled question"}</a>;
  return <div className="min-w-0 text-sm">
    <a className="inline-block max-w-lg rounded-lg border border-indigo-200 bg-white px-3 py-2 font-semibold text-indigo-950 hover:underline" href={"#profiling-question-" + current.id}>{current.text || "Untitled question"}</a>
    <ul className="ml-3 mt-2 space-y-3 border-l-2 border-indigo-200 pl-4">
      {current.options.map(answer => <li key={answer.id}>
        <p className="mb-1 text-xs font-medium text-slate-600">{answer.label || "Unnamed answer"} →</p>
        {answer.destination.type === "question" ? <ProfilingTree config={config} questionId={answer.destination.id ?? ""} visited={[...visited, questionId]} /> : <span className={"inline-block rounded-lg border px-3 py-2 " + (answer.destination.type === "profile" ? "border-emerald-200 bg-emerald-50 text-emerald-950" : "border-slate-200 bg-white text-slate-600")}>{answer.destination.type === "profile" ? config.profiles.find(profile => profile.id === answer.destination.id)?.name || "Missing profile" : "No target profile"}</span>}
      </li>)}
    </ul>
  </div>;
}
