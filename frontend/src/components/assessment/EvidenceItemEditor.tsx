"use client";

import { useState } from "react";
import type { AssessmentEvidenceInputItem } from "@/api/types";
import { Button } from "@/components/ui/button";
import { TEXT_LIMITS } from "@/config/textLimits";
import { ACCEPTED_EVIDENCE_TYPES, validateEvidenceForSave, acceptsEvidenceType, evidenceToday } from "@/app/assessment/assessmentEvidence";
import { EvidenceQuestionReferencePicker, type EvidenceReferenceProps } from "./EvidenceQuestionReferences";

export type EvidenceEditorSave = (draft: AssessmentEvidenceInputItem, original: AssessmentEvidenceInputItem) => void;

export default function EvidenceItemEditor({ initialItem, questions, inactiveQuestionIds, referencesOnly = false,
  onSave, onCancel, allowedType = "both", isNew = false, evidenceRequirements = [] }: EvidenceReferenceProps & {
  initialItem: AssessmentEvidenceInputItem; referencesOnly?: boolean; onSave: EvidenceEditorSave;
  onCancel: () => void; allowedType?: "file" | "link" | "both";
  isNew?: boolean;
}) {
  const [draft, setDraft] = useState(() => ({ ...initialItem, referencedQuestionIds: [...(initialItem.referencedQuestionIds || [])] }));
  const [error, setError] = useState<string | null>(null);
  const update = (value: Partial<AssessmentEvidenceInputItem>) => { setError(null); setDraft(current => ({ ...current, ...value })); };
  const requirement = evidenceRequirements.find(item => item.code === draft.requirementCode);
  const needsDate = Boolean(isNew || initialItem.collectedAt || draft.file
    || draft.requirementCode !== initialItem.requirementCode || draft.url !== initialItem.url || (draft.type === "text" && draft.description !== initialItem.description));
  return <form className="space-y-5" onSubmit={event => {
    event.preventDefault();
    const validation = validateEvidenceForSave(new Map([["draft", [draft]]]));
    if (validation) { setError(validation); return; }
    if (requirement && !acceptsEvidenceType(requirement, draft.type)) { setError("Choose a format accepted by this evidence requirement."); return; }
    if (needsDate && !draft.collectedAt) { setError("Enter the document date or reporting-period end."); return; }
    onSave({ ...draft, description: draft.description.trim(), url: draft.url.trim() }, initialItem);
  }}>
    {!referencesOnly && <>
      {evidenceRequirements.length > 0 && <label className="block text-sm font-medium text-slate-800">Evidence requirement
        <select value={draft.requirementCode || ""} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white p-2 text-sm"
          onChange={event => {
            const next = evidenceRequirements.find(item => item.code === event.target.value);
            update({ requirementCode: event.target.value || null,
              ...(isNew && next && !acceptsEvidenceType(next, draft.type) ? { type: next.format === "URL" ? "link" : "file", file: null, url: "", description: "" } : {}) });
          }}>
          <option value="">Additional supporting evidence</option>
          {evidenceRequirements.map(item => <option key={item.code} value={item.code}>{item.name}{item.required ? " (required)" : ""}</option>)}
        </select>
      </label>}
      {requirement?.instructions && <div className="space-y-1">
        <p className="text-xs font-medium text-slate-700">Acceptance criteria · Informational</p>
        <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">{requirement.instructions}</p>
      </div>}
      {isNew && <label className="block text-sm font-medium text-slate-800">Evidence type
        <select value={draft.type} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white p-2 text-sm"
          onChange={event => update({ type: event.target.value as AssessmentEvidenceInputItem["type"], description: "", url: "", file: null,
            fileName: undefined, fileSize: undefined, fileType: undefined })}>
          {allowedType !== "link" && (!requirement || acceptsEvidenceType(requirement, "file")) && <option value="file">File</option>}
          {allowedType !== "file" && (!requirement || acceptsEvidenceType(requirement, "link")) && <option value="link">Secure link</option>}
          {allowedType === "both" && (!requirement || acceptsEvidenceType(requirement, "text")) && <option value="text">Respondent note</option>}
        </select>
      </label>}
      {draft.type === "file" && <label className="block text-sm font-medium text-slate-800">
        {draft.fileName || "Choose a file"}
        <input type="file" accept={ACCEPTED_EVIDENCE_TYPES.join(",")} className="mt-2 block w-full text-xs"
          onChange={event => { const file = event.target.files?.[0]; if (file) update({ file, fileName: file.name, fileSize: file.size, fileType: file.type, ...(initialItem.evidenceId ? { collectedAt: "" } : {}) }); }} />
        <span className="mt-1 block text-xs font-normal text-slate-500">PDF, Office, image, or text files up to 50MB.</span>
      </label>}
      {draft.type === "link" && <label className="block text-sm font-medium text-slate-800">HTTPS link
        <input type="url" value={draft.url} maxLength={TEXT_LIMITS.url} placeholder="https://example.com/evidence"
          className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm" onChange={event => update({ url: event.target.value })} />
      </label>}
      <label className="block text-sm font-medium text-slate-800">Evidence date {needsDate ? "(required)" : "(legacy date unknown)"}
        <input type="date" value={draft.collectedAt || ""} max={evidenceToday()} required={needsDate}
          className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm" onChange={event => update({ collectedAt: event.target.value || null })} />
        <span className="mt-1 block text-xs font-normal leading-5 text-slate-500">Use the document issue or approval date, or the last day of the reporting period. This is separate from the upload date.</span>
        {!needsDate && !draft.collectedAt && <span className="mt-1 block text-xs text-amber-700">Date unknown for this existing attachment. Add it when available.</span>}
      </label>
      <label className="block text-sm font-medium text-slate-800">{draft.type === "text" ? "Note text" : "Description (optional)"}
        <textarea value={draft.description} rows={draft.type === "text" ? 5 : 3}
          maxLength={draft.type === "text" ? TEXT_LIMITS.evidenceNote : TEXT_LIMITS.evidenceDescription}
          className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm"
          onChange={event => update({ description: event.target.value })} />
      </label>
    </>}
    <EvidenceQuestionReferencePicker questions={questions} inactiveQuestionIds={inactiveQuestionIds}
      selectedIds={draft.referencedQuestionIds} onChange={referencedQuestionIds => update({ referencedQuestionIds })} />
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
      <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
      <Button type="submit">{isNew ? "Add evidence" : "Save"}</Button>
    </div>
  </form>;
}

/** Merge with current server identities without uploading an unchanged File twice. */
export function mergeEvidenceEdit(current: AssessmentEvidenceInputItem, draft: AssessmentEvidenceInputItem, original: AssessmentEvidenceInputItem) {
  const fileChanged = draft.file !== original.file;
  return { ...current, description: draft.description, url: draft.url,
    requirementCode: draft.requirementCode, collectedAt: draft.collectedAt,
    referencedQuestionIds: [...(draft.referencedQuestionIds || [])],
    ...(fileChanged ? { file: draft.file, fileName: draft.fileName, fileSize: draft.fileSize, fileType: draft.fileType } : {}),
  };
}
