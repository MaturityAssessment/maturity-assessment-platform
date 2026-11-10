"use client";

import { useState } from "react";
import type { AssessmentEvidenceInputItem } from "@/api/types";
import { Button } from "@/components/ui/button";
import { TEXT_LIMITS } from "@/config/textLimits";
import { ACCEPTED_EVIDENCE_TYPES, validateEvidenceForSave } from "@/app/assessment/assessmentEvidence";
import { EvidenceQuestionReferencePicker, type EvidenceReferenceProps } from "./EvidenceQuestionReferences";

export type EvidenceEditorSave = (draft: AssessmentEvidenceInputItem, original: AssessmentEvidenceInputItem) => void;

export default function EvidenceItemEditor({ initialItem, questions, inactiveQuestionIds, referencesOnly = false,
  onSave, onCancel, allowedType = "both", isNew = false }: EvidenceReferenceProps & {
  initialItem: AssessmentEvidenceInputItem; referencesOnly?: boolean; onSave: EvidenceEditorSave;
  onCancel: () => void; allowedType?: "file" | "link" | "both";
  isNew?: boolean;
}) {
  const [draft, setDraft] = useState(() => ({ ...initialItem, referencedQuestionIds: [...(initialItem.referencedQuestionIds || [])] }));
  const [error, setError] = useState<string | null>(null);
  const update = (value: Partial<AssessmentEvidenceInputItem>) => { setError(null); setDraft(current => ({ ...current, ...value })); };
  return <form className="space-y-5" onSubmit={event => {
    event.preventDefault();
    const validation = validateEvidenceForSave(new Map([["draft", [draft]]]));
    if (validation) { setError(validation); return; }
    onSave({ ...draft, description: draft.description.trim(), url: draft.url.trim() }, initialItem);
  }}>
    {!referencesOnly && <>
      {isNew && <label className="block text-sm font-medium text-slate-800">Evidence type
        <select value={draft.type} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white p-2 text-sm"
          onChange={event => update({ type: event.target.value as AssessmentEvidenceInputItem["type"], description: "", url: "", file: null,
            fileName: undefined, fileSize: undefined, fileType: undefined })}>
          {allowedType !== "link" && <option value="file">File</option>}
          {allowedType !== "file" && <option value="link">Secure link</option>}
          {allowedType === "both" && <option value="text">Respondent note</option>}
        </select>
      </label>}
      {draft.type === "file" && <label className="block text-sm font-medium text-slate-800">
        {draft.fileName || "Choose a file"}
        <input type="file" accept={ACCEPTED_EVIDENCE_TYPES.join(",")} className="mt-2 block w-full text-xs"
          onChange={event => { const file = event.target.files?.[0]; if (file) update({ file, fileName: file.name, fileSize: file.size, fileType: file.type }); }} />
        <span className="mt-1 block text-xs font-normal text-slate-500">PDF, Office, image, or text files up to 50MB.</span>
      </label>}
      {draft.type === "link" && <label className="block text-sm font-medium text-slate-800">HTTPS link
        <input type="url" value={draft.url} maxLength={TEXT_LIMITS.url} placeholder="https://example.com/evidence"
          className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm" onChange={event => update({ url: event.target.value })} />
      </label>}
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
    referencedQuestionIds: [...(draft.referencedQuestionIds || [])],
    ...(fileChanged ? { file: draft.file, fileName: draft.fileName, fileSize: draft.fileSize, fileType: draft.fileType } : {}),
  };
}
