import { useCallback, useEffect, useState } from "react";
import type { MaturityModelEditorDocument } from "@/api/types";
import type { ComparisonProvenance } from "../model/editorChanges";
import { parseEditorDraft, persistEditorDraft, type EditorDraft } from "../model/editorDraft";

type UseEditorDraftOptions = {
  draftKey: string;
  sourceModelId?: string;
  document: MaturityModelEditorDocument | null;
  baseline: MaturityModelEditorDocument | null;
  provenance: ComparisonProvenance;
  initialized: boolean;
  dirty: boolean;
};

export function useEditorDraft({ draftKey, sourceModelId, document, baseline, provenance, initialized, dirty }: UseEditorDraftOptions) {
  const [draftError, setDraftError] = useState<string | null>(null);
  const clearDraft = useCallback(() => {
    try { window.localStorage.removeItem(draftKey); setDraftError(null); }
    catch { setDraftError("Could not clear the browser draft. Your saved model is unaffected."); }
  }, [draftKey]);
  const readDraft = useCallback(() => {
    try {
      const saved = window.localStorage.getItem(draftKey);
      if (!saved) return null;
      const draft = parseEditorDraft(saved, sourceModelId ?? null);
      if (!draft) setDraftError("The browser draft could not be restored. The saved model has been loaded.");
      return draft;
    } catch {
      setDraftError("Could not read the browser draft. Keep this page open until you save your changes.");
      return null;
    }
  }, [draftKey, sourceModelId]);
  useEffect(() => {
    if (!initialized || !document || !dirty) return;
    const timer = window.setTimeout(() => {
      try {
        const draft: EditorDraft = { version: 2, sourceModelId: sourceModelId ?? null, document, baseline, provenance };
        setDraftError(persistEditorDraft(window.localStorage, draftKey, draft));
      } catch { setDraftError("Changes could not be saved in this browser. Keep this page open until you save your model."); }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [dirty, document, baseline, provenance, draftKey, initialized, sourceModelId]);
  return { clearDraft, readDraft, draftError };
}
