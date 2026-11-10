"use client";

import { useState } from "react";
import { FilePlus2, Link2, StickyNote, Pencil, Trash2 } from "lucide-react";
import type { AssessmentEvidenceInputItem } from "@/api/types";
import { Button } from "@/components/ui/button";
import { createEvidenceClientId, hasValidEvidenceItems, MAX_EVIDENCE_ITEMS_PER_PRACTICE } from "@/app/assessment/assessmentEvidence";
import EvidenceDialog from "./EvidenceDialog";
import EvidenceItemDetails from "./EvidenceItemDetails";
import EvidenceItemEditor, { mergeEvidenceEdit, type EvidenceEditorSave } from "./EvidenceItemEditor";
import type { EvidenceReferenceProps } from "./EvidenceQuestionReferences";

interface EvidenceUploadProps extends EvidenceReferenceProps {
  practiceId: number;
  items: AssessmentEvidenceInputItem[];
  onItemsChange: (items: AssessmentEvidenceInputItem[]) => void;
  required?: boolean;
  allowedType?: "file" | "link" | "both";
  readOnly?: boolean;
}

type EditorState = { item: AssessmentEvidenceInputItem; referencesOnly: boolean; isNew: boolean };

export default function EvidenceUpload({ practiceId, items, onItemsChange, required = false,
  allowedType = "both", readOnly = false, questions = [], inactiveQuestionIds }: EvidenceUploadProps) {
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const remainingSlots = MAX_EVIDENCE_ITEMS_PER_PRACTICE - items.length;
  const add = (type: AssessmentEvidenceInputItem["type"]) => {
    if (remainingSlots <= 0) return;
    setEditor({ isNew: true, referencesOnly: false, item: {
      id: createEvidenceClientId(), practiceId, type, description: "", file: null, url: "", referencedQuestionIds: [],
    } });
  };
  const save: EvidenceEditorSave = (draft, original) => {
    if (!editor || readOnly) return;
    if (editor.isNew) {
      if (items.length >= MAX_EVIDENCE_ITEMS_PER_PRACTICE) { setError("A practice can contain at most five evidence items."); return; }
      onItemsChange([...items, draft]);
    } else {
      onItemsChange(items.map(item => item.id !== draft.id ? item : editor.referencesOnly
        ? { ...item, referencedQuestionIds: [...(draft.referencedQuestionIds || [])] }
        : mergeEvidenceEdit(item, draft, original)));
    }
    setError(null);
    setEditor(null);
  };

  return <div className="space-y-3">
    {!items.length && <div className="rounded-xl border border-dashed border-slate-300 bg-white/80 px-5 py-6 text-center text-sm text-slate-500">
      {readOnly ? "No evidence attached." : "Upload a file, add a secure HTTPS link, or write a note."}
    </div>}
    {items.map(item => <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
      <EvidenceItemDetails item={item} questions={questions} inactiveQuestionIds={inactiveQuestionIds} />
      {!readOnly && <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
        <Button type="button" variant="outline" size="sm" onClick={() => setEditor({ item, referencesOnly: true, isNew: false })}>Reference questions</Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setEditor({ item, referencesOnly: false, isNew: false })}>
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit evidence
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => onItemsChange(items.filter(candidate => candidate.id !== item.id))}
          aria-label="Remove evidence item"><Trash2 className="h-4 w-4 text-red-600" aria-hidden="true" /></Button>
      </div>}
    </div>)}
    {!readOnly && <>
      <div className="flex flex-wrap items-center gap-2">
        {allowedType !== "link" && <Button type="button" variant="outline" size="sm" onClick={() => add("file")} disabled={remainingSlots <= 0}>
          <FilePlus2 className="h-4 w-4" aria-hidden="true" /> Add file
        </Button>}
        {allowedType !== "file" && <Button type="button" variant="outline" size="sm" onClick={() => add("link")} disabled={remainingSlots <= 0}>
          <Link2 className="h-4 w-4" aria-hidden="true" /> Add secure link
        </Button>}
        {allowedType === "both" && <Button type="button" variant="outline" size="sm" onClick={() => add("text")} disabled={remainingSlots <= 0}>
          <StickyNote className="h-4 w-4" aria-hidden="true" /> Add note
        </Button>}
        <span className="text-xs text-slate-500">{items.length}/{MAX_EVIDENCE_ITEMS_PER_PRACTICE} items</span>
      </div>
      {required && !hasValidEvidenceItems(items) && <p className="text-sm font-medium text-amber-700">Add at least one file, secure link, or note.</p>}
      <p className="text-xs text-slate-500">Up to five items. Files may be at most 50MB each. Links must use HTTPS. Notes may contain up to 10,000 characters.</p>
    </>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {editor && !readOnly && <EvidenceDialog title={editor.referencesOnly ? "Reference questions" : editor.isNew ? "Add practice evidence" : "Edit practice evidence"}
      onClose={() => { setEditor(null); setError(null); }}>
      <EvidenceItemEditor key={editor.item.id} initialItem={editor.item} referencesOnly={editor.referencesOnly} isNew={editor.isNew}
        questions={questions} inactiveQuestionIds={inactiveQuestionIds} allowedType={allowedType}
        onSave={save} onCancel={() => setEditor(null)} />
    </EvidenceDialog>}
  </div>;
}
