import { useId } from "react";
import type { ModelEditorPractice } from "@/api/types";
import { branchingIssues } from "@/lib/questionBranching";
import { branchingSummary, dependencyColumns, editableBranching, parentCodes } from "../../model/questionBranchingEditor";

const cardWidth = 240, cardHeight = 136, columnGap = 80, rowGap = 24, padding = 20;

export default function QuestionDependenciesPreview({ practice, onSelect }: {
  practice: ModelEditorPractice; onSelect: (questionKey: string) => void;
}) {
  const markerId = `dependency-arrow-${useId().replaceAll(":", "")}`;
  const columns = dependencyColumns(practice.questions);
  const positions = new Map(columns.flatMap((column, x) => column.map((question, y) => [question.code.toLowerCase(), {
    x: padding + x * (cardWidth + columnGap), y: padding + y * (cardHeight + rowGap), question,
  }] as const)));
  const width = Math.max(1, columns.length) * (cardWidth + columnGap) - columnGap + 2 * padding;
  const height = Math.max(1, ...columns.map(column => column.length)) * (cardHeight + rowGap) - rowGap + 2 * padding;
  const errors = branchingIssues(practice.questions, practice.evidenceRequirements);
  return <section className="space-y-5" aria-label="Question dependency preview">
    <div><h2 className="text-lg font-semibold text-gray-900">Question dependencies</h2>
      <p className="mt-1 text-sm leading-6 text-gray-500">Follow arrows from parent to dependent question. Select a question to edit its rules. This map shows structure; visibility depends on respondent answers.</p></div>
    {!!errors.length && <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      <p className="font-semibold">Dependencies need attention</p><ul className="mt-1 list-disc pl-5">{errors.map((error, index) => <li key={index}>{error}</li>)}</ul>
    </div>}
    <div className="flex flex-wrap gap-4 text-xs text-gray-600"><span>○ Always visible</span><span className="text-blue-700">● Conditional</span><span>Default score applies only while hidden</span></div>
    <div role="region" aria-label="Dependency graph, scroll to explore" tabIndex={0} className="max-h-[600px] overflow-auto rounded-xl border border-gray-200 bg-gray-50 outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
      <div className="relative" style={{ width, height }}>
        <svg aria-hidden="true" className="pointer-events-none absolute inset-0" width={width} height={height}>
          <defs><marker id={markerId} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#64748b" /></marker></defs>
          {[...positions.values()].flatMap(child => parentCodes(editableBranching(child.question, practice.questions)).map((code, index) => {
            const parent = positions.get(code.toLowerCase());
            if (!parent) return null;
            const startX = parent.x + cardWidth, endX = child.x, startY = parent.y + cardHeight / 2, endY = child.y + cardHeight / 2;
            const bend = Math.max(30, (endX - startX) / 2);
            return <path key={`${child.question.clientKey}-${index}`} d={`M${startX},${startY} C${startX + bend},${startY} ${endX - bend},${endY} ${endX},${endY}`}
              fill="none" stroke="#64748b" strokeWidth="1.5" markerEnd={`url(#${markerId})`} />;
          }))}
        </svg>
        {[...positions.values()].map(({ x, y, question }) => {
          const expression = editableBranching(question, practice.questions);
          const summary = branchingSummary(expression, practice.questions);
          const parentCount = parentCodes(expression).length;
          return <button key={question.clientKey} type="button" onClick={() => onSelect(question.clientKey)} aria-haspopup="dialog"
            aria-label={`Edit ${question.code}: ${question.text || "Untitled question"}. ${summary}`} title={`${question.text}\n${summary}`}
            className={`absolute flex flex-col gap-2 rounded-xl border p-3 text-left shadow-sm outline-none hover:shadow-md focus-visible:ring-2 focus-visible:ring-blue-500 ${expression ? "border-blue-300 bg-blue-50" : "border-gray-300 bg-white"}`}
            style={{ left: x, top: y, width: cardWidth, height: cardHeight }}>
            <span className="block w-full truncate font-mono text-xs font-semibold text-gray-600">{question.code}</span>
            <span className="line-clamp-2 text-sm font-medium text-gray-950">{question.text || "Untitled question"}</span>
            <span className="mt-auto text-xs text-gray-600">{expression ? `${parentCount} parent ${parentCount === 1 ? "rule" : "rules"}` : "Always visible"}{question.hiddenScore != null && ` · Default ${question.hiddenScore}`}</span>
          </button>;
        })}
      </div>
    </div>
    <details className="rounded-xl border border-gray-200 bg-white p-4" open>
      <summary className="cursor-pointer text-sm font-semibold text-gray-900">Rules and evidence links</summary>
      <ul className="mt-3 divide-y divide-gray-100">
        {practice.questions.map(question => <li key={question.clientKey} className="py-3 text-sm">
          <button type="button" className="text-left font-medium text-blue-700 hover:underline" onClick={() => onSelect(question.clientKey)}>{question.code} — {question.text || "Untitled question"}</button>
          <p className="mt-1 text-gray-600 [overflow-wrap:anywhere]">{branchingSummary(editableBranching(question, practice.questions), practice.questions)}</p>
          {question.hiddenScore != null && <p className="mt-1 text-xs text-gray-500">While hidden: score {question.hiddenScore}, included in coverage and score/state gating.</p>}
        </li>)}
      </ul>
      {!!practice.evidenceRequirements?.length && <div className="mt-3 border-t border-gray-200 pt-3">
        <h3 className="text-sm font-semibold text-gray-900">Evidence visibility</h3>
        <ul className="mt-2 space-y-2 text-sm text-gray-600">{practice.evidenceRequirements.map(requirement => <li key={requirement.code} className="[overflow-wrap:anywhere]">
          <span className="font-medium">{requirement.name || "Untitled evidence"}:</span> {requirement.questionCodes == null ? "Whole practice" : `Shown when any linked question is visible: ${requirement.questionCodes.join(", ") || "Choose questions in the Evidence tab"}`}
        </li>)}</ul>
      </div>}
    </details>
  </section>;
}
