"use client";

import { useState } from "react";
import { Paperclip } from "lucide-react";
import type { AssessmentEvidenceInputItem } from "@/api/types";
import { Button } from "@/components/ui/button";
import { createEvidenceClientId, MAX_EVIDENCE_ITEMS_PER_PRACTICE } from "@/app/assessment/assessmentEvidence";
import { evidenceItemLabel, setEvidenceQuestionReference } from "@/app/assessment/evidenceReferences";
import EvidenceDialog from "./EvidenceDialog";
import EvidenceItemDetails from "./EvidenceItemDetails";
import EvidenceItemEditor from "./EvidenceItemEditor";
import type { EvidenceReferenceProps } from "./EvidenceQuestionReferences";

export default function QuestionEvidence({ questionId, practiceId, items, onItemsChange,
  readOnly = false, inactive = false, questions, inactiveQuestionIds, onDownload }: EvidenceReferenceProps & {
  questionId: number; practiceId: number; items: AssessmentEvidenceInputItem[];
  onItemsChange?: (items: AssessmentEvidenceInputItem[]) => void; readOnly?: boolean; inactive?: boolean;
  onDownload?: (evidenceId: number, fileName?: string | null) => void;
}) {
  const [dialog, setDialog] = useState<"add" | string | null>(null);
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [newItem, setNewItem] = useState<AssessmentEvidenceInputItem | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const linked = items.filter(item => item.referencedQuestionIds?.includes(questionId));
  const canEdit = !readOnly && Boolean(onItemsChange);
  const canAdd = items.length < MAX_EVIDENCE_ITEMS_PER_PRACTICE;
  const viewedItem = items.find(item => item.id === dialog);
  const close = () => { setDialog(null); setError(null); };

  return <div className="mt-3 space-y-2">
    {linked.length > 0 && <ul aria-label="Evidence linked to this question" className="flex flex-wrap gap-1.5">
      {linked.map(item => <li key={item.id} className="min-w-0 max-w-full">
        <button type="button" title={evidenceItemLabel(item)} onClick={() => setDialog(item.id)}
          className="inline-flex max-w-full items-center gap-1.5 rounded-md bg-indigo-50 px-2.5 py-1.5 text-xs text-indigo-800 hover:bg-indigo-100 focus-visible:outline-indigo-600">
          <Paperclip className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{evidenceItemLabel(item)}</span>{inactive && <span>· Inactive</span>}
        </button>
      </li>)}
    </ul>}
    {canEdit && !inactive && <button type="button" className="inline-flex items-center gap-1.5 rounded-md py-1 text-xs font-medium text-indigo-700 hover:underline focus-visible:outline-indigo-600"
      onClick={() => {
        setMode(canAdd ? "new" : "existing");
        setSelected(new Set(linked.map(item => item.id)));
        setNewItem({ id: createEvidenceClientId(), practiceId, type: "file", description: "", file: null, url: "", referencedQuestionIds: [questionId] });
        setDialog("add");
      }}><Paperclip className="h-3.5 w-3.5" aria-hidden="true" /> Add evidence</button>}
    {dialog === "add" && canEdit && !inactive && <EvidenceDialog title="Evidence for this question" onClose={close}>
      <div className="mb-5 flex gap-2" role="group" aria-label="Evidence source">
        <Button type="button" variant={mode === "new" ? "default" : "outline"} aria-pressed={mode === "new"} disabled={!canAdd} onClick={() => setMode("new")}>Add new</Button>
        <Button type="button" variant={mode === "existing" ? "default" : "outline"} aria-pressed={mode === "existing"} onClick={() => setMode("existing")}>Use existing</Button>
      </div>
      {!canAdd && <p className="mb-4 text-sm text-slate-600">This practice has reached its evidence limit. You can still link existing evidence.</p>}
      {mode === "new" && newItem ? <EvidenceItemEditor isNew initialItem={newItem} questions={questions} inactiveQuestionIds={inactiveQuestionIds}
        onCancel={close} onSave={draft => {
          if (!canAdd) { setError("A practice can contain at most five evidence items."); return; }
          onItemsChange?.([...items, draft]);
          close();
        }} /> : <form onSubmit={event => {
          event.preventDefault();
          const next = items.reduce((current, item) => setEvidenceQuestionReference(current, item.id, questionId, selected.has(item.id)), items);
          onItemsChange?.(next);
          close();
        }}>
          <fieldset className="max-h-72 space-y-2 overflow-y-auto">
            <legend className="mb-3 text-sm text-slate-600">Select practice evidence to link to this question.</legend>
            {items.map(item => <label key={item.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 text-sm">
              <input type="checkbox" className="mt-1 accent-indigo-600" checked={selected.has(item.id)} onChange={event => {
                const checked = event.target.checked;
                setSelected(current => { const next = new Set(current); if (checked) next.add(item.id); else next.delete(item.id); return next; });
              }} />
              <span className="min-w-0 break-words"><span className="font-medium text-slate-900">{evidenceItemLabel(item)}</span>
                {item.description && <span className="mt-1 line-clamp-2 text-xs text-slate-500">{item.description}</span>}
              </span>
            </label>)}
            {!items.length && <p className="py-4 text-sm text-slate-500">No practice evidence yet. Choose Add new to create an item.</p>}
          </fieldset>
          <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={close}>Cancel</Button><Button type="submit" disabled={!items.length}>Save references</Button>
          </div>
        </form>}
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    </EvidenceDialog>}
    {viewedItem && <EvidenceDialog title="Linked practice evidence" onClose={close}>
      <EvidenceItemDetails item={viewedItem} questions={questions} inactiveQuestionIds={inactiveQuestionIds}
        onDownload={onDownload && viewedItem.evidenceId ? () => onDownload(viewedItem.evidenceId!, viewedItem.fileName) : undefined} />
      {canEdit && <Button type="button" variant="outline" size="sm" className="mt-5" onClick={() => {
        onItemsChange?.(setEvidenceQuestionReference(items, viewedItem.id, questionId, false)); close();
      }}>Remove reference</Button>}
    </EvidenceDialog>}
  </div>;
}
