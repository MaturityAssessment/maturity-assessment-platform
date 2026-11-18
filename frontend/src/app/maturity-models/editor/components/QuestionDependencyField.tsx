import type { BranchingExpression, ModelEditorPractice, ModelEditorQuestion } from "@/api/types";
import { branchingIssues } from "@/lib/questionBranching";
import { branchingSummary, branchingWouldCycle, editableBranching, parentCodes, setQuestionBranching } from "../model/questionBranchingEditor";
import { inputClass, labelClass } from "./FormFields";
import BranchingAcceptedAnswers, { branchingActionClass as actionClass } from "./BranchingAcceptedAnswers";

function RuleNode({ expression, questions, candidates, used, onChange, depth = 0 }: {
  expression: BranchingExpression; questions: ModelEditorQuestion[]; candidates: ModelEditorQuestion[];
  used: string[]; onChange: (expression?: BranchingExpression) => void; depth?: number;
}) {
  const negated = expression.kind === "not";
  const node = negated ? expression.condition : expression;
  const update = (next?: BranchingExpression) => onChange(next && negated ? { kind: "not", condition: next } : next);
  const available = candidates.filter(q => !used.includes(q.code.toLowerCase()));
  const newRule = (): BranchingExpression => ({ kind: "parent", code: available[0].code, predicate: { kind: "answered" } });
  const parent = node.kind === "parent" ? questions.find(q => q.code.toLowerCase() === node.code.toLowerCase()) : undefined;
  return <div className="min-w-0 space-y-3 rounded-lg border border-gray-200 bg-gray-50/60 p-3 sm:p-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <label className="flex items-center gap-2 text-xs font-medium text-gray-700">
        <input type="checkbox" checked={negated} disabled={!negated && depth >= 19}
          onChange={event => onChange(event.target.checked ? { kind: "not", condition: expression } : node)} className="rounded border-gray-300 text-blue-600" />
        Not <span className="font-normal text-gray-500">(invert this {node.kind === "parent" ? "rule" : "group"})</span>
      </label>
      <button type="button" onClick={() => onChange(undefined)} className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50">Remove {node.kind === "parent" ? "rule" : "group"}</button>
    </div>
    {node.kind === "parent" ? <>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={labelClass}>Parent question
          <select className={inputClass} title={parent ? `${parent.code} — ${parent.text}` : node.code} value={parent?.code ?? node.code} onChange={event => update({ kind: "parent", code: event.target.value, predicate: { kind: "answered" } })}>
            {!candidates.some(q => q.code.toLowerCase() === node.code.toLowerCase()) && <option value={node.code}>{node.code} (needs attention)</option>}
            {candidates.filter(q => q.code.toLowerCase() === node.code.toLowerCase() || !used.includes(q.code.toLowerCase())).map(q =>
              <option key={q.clientKey} value={q.code}>{q.code} — {q.text || "Untitled question"}</option>)}
          </select>
        </label>
        <label className={labelClass}>Condition
          <select className={inputClass} value={node.predicate.kind} onChange={event => update({ ...node, predicate: event.target.value === "answered" ? { kind: "answered" } : { kind: "in", values: [] } })}>
            <option value="answered">Has an answer</option><option value="in">Matches accepted answers</option>
          </select>
        </label>
      </div>
      {parent && node.predicate.kind === "in" && <BranchingAcceptedAnswers key={`${parent.clientKey}-${parent.type}`} parent={parent} values={node.predicate.values}
        onChange={values => update({ ...node, predicate: { kind: "in", values } })} />}
      {depth < 18 && <button type="button" className={actionClass} onClick={() => update({ kind: "and", conditions: [node] })}>Make a group</button>}
    </> : node.kind === "and" || node.kind === "or" ? <>
      <label className={`${labelClass} max-w-sm`}>Match conditions
        <select className={inputClass} value={node.kind} onChange={event => update({ ...node, kind: event.target.value as "and" | "or" })}>
          <option value="and">All conditions (AND)</option><option value="or">Any condition (OR)</option>
        </select>
      </label>
      <div className="space-y-3 border-l-2 border-blue-200 pl-2 sm:pl-3">
        {node.conditions.map((condition, index) => <RuleNode key={index} expression={condition} questions={questions} candidates={candidates} used={used} depth={depth + (negated ? 2 : 1)}
          onChange={next => {
            const conditions = node.conditions.flatMap((child, i) => i === index ? next ? [next] : [] : [child]);
            update(conditions.length ? { ...node, conditions } : undefined);
          }} />)}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={actionClass} disabled={!available.length || node.conditions.length >= 100 || depth >= 19} onClick={() => update({ ...node, conditions: [...node.conditions, newRule()] })}>Add parent rule</button>
        <button type="button" className={actionClass} disabled={!available.length || node.conditions.length >= 100 || depth >= 18} onClick={() => update({ ...node, conditions: [...node.conditions, { kind: "and", conditions: [newRule()] }] })}>Add group</button>
      </div>
    </> : <RuleNode expression={node} questions={questions} candidates={candidates} used={used} onChange={update} depth={depth + 1} />}
  </div>;
}

export default function QuestionDependencyField({ question, practice, onChange }: {
  question: ModelEditorQuestion; practice: ModelEditorPractice; onChange: (question: ModelEditorQuestion) => void;
}) {
  const expression = editableBranching(question, practice.questions);
  const candidates = practice.questions.filter(candidate => candidate.clientKey !== question.clientKey
    && !branchingWouldCycle(practice.questions, question.code, candidate.code));
  const used = parentCodes(expression).map(code => code.toLowerCase());
  const available = candidates.filter(q => !used.includes(q.code.toLowerCase()));
  const set = (next?: BranchingExpression) => onChange(setQuestionBranching(question, next));
  const errors = branchingIssues(practice.questions.map(q => q.clientKey === question.clientKey ? question : q))
    .filter(message => message.startsWith(`${question.code}:`) || message.includes("cycles"));
  return <section id={`question-${question.clientKey}-dependency`} tabIndex={-1} aria-label="Question dependencies" className="min-w-0 space-y-4">
    <div><h3 className="text-base font-semibold text-gray-900">Visibility & dependencies</h3>
      <p className="mt-1 text-sm leading-6 text-gray-500">Show this question when its parent rules match. Parents must be in this practice.</p></div>
    <label className={`${labelClass} max-w-sm`}>Show question
      <select className={inputClass} value={expression ? "conditional" : "always"} onChange={event => {
        if (event.target.value === "always") set(undefined);
        else if (available[0]) set({ kind: "and", conditions: [{ kind: "parent", code: available[0].code, predicate: { kind: "answered" } }] });
      }}>
        <option value="always">Always</option><option value="conditional" disabled={!expression && !available.length}>When rules match</option>
      </select>
    </label>
    {!expression && !available.length && <p className="text-xs text-gray-500">Add another independent question to use as a parent. A question cannot depend on itself or on its descendants.</p>}
    {expression && <>
      <RuleNode expression={expression} questions={practice.questions} candidates={candidates} used={used} onChange={set} />
      {(expression.kind === "parent" || expression.kind === "not") && <button type="button" className={actionClass} disabled={!available.length}
        onClick={() => set({ kind: "and", conditions: [expression, { kind: "parent", code: available[0].code, predicate: { kind: "answered" } }] })}>Add parent rule</button>}
      <p className="text-xs leading-5 text-gray-500">Each parent can appear once. A hidden or unanswered parent is still waiting for an answer, even inside a NOT rule. Hidden default scores do not count as answers.</p>
      <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-950">
        <p className="font-semibold">Show when</p><p className="mt-1 [overflow-wrap:anywhere]">{branchingSummary(expression, practice.questions)}</p>
      </div>
      <fieldset className="space-y-3 rounded-lg border border-gray-200 p-4">
        <legend className="px-1 text-sm font-semibold text-gray-800">When this question is hidden</legend>
        <label className="flex items-start gap-2 text-sm text-gray-700">
          <input type="checkbox" className="mt-0.5 rounded border-gray-300 text-blue-600" checked={question.hiddenScore != null}
            onChange={event => onChange({ ...question, hiddenScore: event.target.checked ? 0 : undefined })} />Use a default score
        </label>
        {question.hiddenScore != null && <label className={`${labelClass} max-w-xs`}>Hidden question score
          <input type="number" min={0} max={1} step="any" className={inputClass} value={Number.isFinite(question.hiddenScore) ? question.hiddenScore : ""}
            onChange={event => onChange({ ...question, hiddenScore: event.target.value === "" ? NaN : Number(event.target.value) })} />
        </label>}
        <p className="text-xs leading-5 text-gray-500">{question.hiddenScore != null
          ? "Use a score from 0 to 1. It counts toward aggregation, coverage, and score/state gating rules while hidden. It does not activate dependent questions."
          : "Hidden questions are excluded from scores and coverage. Visible optional questions left unanswered still count toward coverage."}</p>
      </fieldset>
    </>}
    {!!errors.length && <ul role="alert" className="list-disc space-y-1 pl-5 text-xs text-red-600">{errors.map(error => <li key={error}>{error}</li>)}</ul>}
  </section>;
}
