import { useCallback, useEffect } from "react";
import type { MaturityModelEditorDocument } from "@/api/types";

type UseEditorDraftOptions = {
  draftKey: string;
  document: MaturityModelEditorDocument | null;
  initialized: boolean;
  dirty: boolean;
};

export function useEditorDraft({
  draftKey,
  document,
  initialized,
  dirty,
}: UseEditorDraftOptions) {
  const clearDraft = useCallback(() => {
    window.localStorage.removeItem(draftKey);
  }, [draftKey]);

  const readDraft = useCallback(() => {
    const saved = window.localStorage.getItem(draftKey);
    if (!saved) return null;
    try {
      return JSON.parse(saved) as MaturityModelEditorDocument;
    } catch {
      window.localStorage.removeItem(draftKey);
      return null;
    }
  }, [draftKey]);

  useEffect(() => {
    if (!initialized || !document || !dirty) return;
    const timer = window.setTimeout(() => {
      window.localStorage.setItem(draftKey, JSON.stringify(document));
    }, 500);
    return () => window.clearTimeout(timer);
  }, [dirty, document, draftKey, initialized]);

  return { clearDraft, readDraft };
}
