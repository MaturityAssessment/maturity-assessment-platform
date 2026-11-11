"use client";

import type { AssessmentEvidenceInputItem, Practice } from "@/api/types";
import { hasValidEvidenceItems, missingEvidenceRequirements, validateEvidenceForSave, MAX_EVIDENCE_ITEMS_PER_FIELD } from "@/app/assessment/assessmentEvidence";
import { freshnessLabel } from "@/app/assessment/evidenceLifecycle";
import { useState } from "react";
import EvidenceUpload from "./EvidenceUpload";
import type { EvidenceReferenceProps } from "./EvidenceQuestionReferences";

export default function PracticeEvidence({ practice, items, onItemsChange, readOnly = false, required = false,
  onDownload, currentEvidenceFreshness, historicalEvidenceValidity, ...references }: EvidenceReferenceProps & {
  practice: Practice; items: AssessmentEvidenceInputItem[];
  onItemsChange: (items: AssessmentEvidenceInputItem[]) => void;
  readOnly?: boolean; required?: boolean;
  onDownload?: (evidenceId: number, fileName?: string | null) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const requirements = practice.evidenceRequirements ?? [];
  const additional = items.filter(item => !requirements.some(requirement => requirement.code === item.requirementCode));
  const replaceGroup = (previous: AssessmentEvidenceInputItem[], next: AssessmentEvidenceInputItem[]) => {
    const ids = new Set(previous.map(item => item.id));
    const merged = [...items.filter(item => !ids.has(item.id)), ...next];
    const movedToFullField = next.some(item => {
      const code = item.requirementCode || null;
      const before = items.filter(candidate => (candidate.requirementCode || null) === code).length;
      const after = merged.filter(candidate => (candidate.requirementCode || null) === code).length;
      return after > MAX_EVIDENCE_ITEMS_PER_FIELD && after > before;
    });
    const validation = movedToFullField ? "This evidence field can contain at most five items."
      : validateEvidenceForSave(new Map([["practice", merged]]));
    if (validation) { setError(validation); return false; }
    setError(null);
    onItemsChange(merged);
    return true;
  };
  const upload = (group: AssessmentEvidenceInputItem[], code?: string) => <EvidenceUpload
    {...references} evidenceRequirements={requirements} currentEvidenceFreshness={currentEvidenceFreshness} historicalEvidenceValidity={historicalEvidenceValidity} practiceId={practice.id!} items={group} readOnly={readOnly}
    onDownload={onDownload} requirement={requirements.find(item => item.code === code)}
    required={!requirements.length && required} onItemsChange={next => replaceGroup(group, next)} />;

  if (!requirements.length) return upload(items);
  const mandatory = requirements.filter(item => item.required).length;
  const missing = missingEvidenceRequirements(practice, items);
  return <div className="space-y-3">
    <p className="text-xs text-slate-500">{mandatory ? `${mandatory - missing} of ${mandatory} required provided.` : `${requirements.filter(requirement => hasValidEvidenceItems(items.filter(item => item.requirementCode === requirement.code))).length} of ${requirements.length} provided.`} Evidence dates describe the documents, independently of upload dates.</p>
    {requirements.map(requirement => {
      const group = items.filter(item => item.requirementCode === requirement.code);
      const provided = hasValidEvidenceItems(group);
      const freshness = currentEvidenceFreshness?.indicators.find(item => item.practiceId === practice.id && item.requirementCode === requirement.code);
      const matches = freshness && group.length === freshness.records.length && group.every(item => !item.file && freshness.records.some(record => record.evidenceId === item.evidenceId && record.collectedAt === (item.collectedAt || null)));
      const outdated = matches && freshness.status === "OUTDATED";
      return <details key={requirement.code} className="group rounded-xl border border-slate-200 bg-white">
        <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 rounded-xl p-4 focus-visible:outline-indigo-600">
          <span className="min-w-0 flex-1 text-sm font-medium text-slate-900">{requirement.name}</span>
          <span className="text-xs text-slate-500">{requirement.required ? "Required" : "Optional"}</span>
          <span className={`rounded-full px-2 py-1 text-xs font-medium ${outdated ? "bg-amber-50 text-amber-800" : provided ? "bg-emerald-50 text-emerald-800" : requirement.required ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-600"}`}>
            {provided ? `${matches ? freshnessLabel[freshness.status] : "Provided"} · ${group.length}` : requirement.required ? "Missing" : "Not provided"}
          </span>
          <span className="text-xs font-medium text-indigo-700 group-open:hidden">{provided ? readOnly ? "View" : "View / replace" : readOnly ? "Details" : "Add evidence"} ▾</span>
          <span className="hidden text-xs font-medium text-indigo-700 group-open:inline">Close ▴</span>
        </summary>
        <div className="space-y-3 border-t border-slate-100 p-4">
          {requirement.instructions && <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">{requirement.instructions}</p>}
          {matches && <p className="text-xs text-slate-500">Current freshness checked {currentEvidenceFreshness?.evaluatedOn}.{freshness.validThrough ? ` Latest validity date: ${freshness.validThrough}.` : ""} Outdated evidence remains provided.</p>}
          {upload(group, requirement.code)}
        </div>
      </details>;
    })}
    <details className="rounded-xl border border-dashed border-slate-300 p-4">
      <summary className="cursor-pointer text-sm font-medium text-slate-600">Additional supporting evidence{additional.length ? ` · ${additional.length}` : ""}</summary>
      <div className="mt-4">{upload(additional)}</div>
    </details>
    {!readOnly && required && missing > 0 && <p className="text-sm text-amber-700">Provide evidence for each required item before submitting.</p>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
  </div>;
}
