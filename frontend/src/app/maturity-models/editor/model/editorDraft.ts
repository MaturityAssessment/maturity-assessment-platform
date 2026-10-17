import type { MaturityModelEditorDocument } from "@/api/types";
import type { ComparisonProvenance } from "./editorChanges.ts";

export type EditorDraft = {
  version: 2;
  sourceModelId: string | null;
  document: MaturityModelEditorDocument;
  baseline: MaturityModelEditorDocument | null;
  provenance: ComparisonProvenance;
};
export type ReadEditorDraft = EditorDraft | { version: 1; document: MaturityModelEditorDocument };
function isDocument(value: unknown): value is MaturityModelEditorDocument {
  return Boolean(value && typeof value === "object" && "dimensions" in value && Array.isArray(value.dimensions) && "levels" in value && Array.isArray(value.levels) && "name" in value && typeof value.name === "string");
}
export function parseEditorDraft(saved: string, sourceModelId: string | null): ReadEditorDraft | null {
  const value: unknown = JSON.parse(saved);
  if (isDocument(value)) return { version: 1, document: value };
  if (!value || typeof value !== "object" || !("document" in value) || !isDocument(value.document)) return null;
  if (!("sourceModelId" in value) || value.sourceModelId !== sourceModelId) return null;
  if ("version" in value && value.version === 2 && "baseline" in value && (value.baseline === null || isDocument(value.baseline)) && "provenance" in value && ["source", "import", "legacy"].includes(String(value.provenance)) && (!sourceModelId || value.baseline !== null)) return value as EditorDraft;
  // Recover the working content even if comparison metadata is incomplete.
  return { version: 1, document: value.document };
}

export function persistEditorDraft(storage: Pick<Storage, "setItem">, key: string, draft: EditorDraft): string | null {
  try {
    storage.setItem(key, JSON.stringify(draft));
    return null;
  } catch {
    return "Changes could not be saved in this browser. Keep this page open until you save your model.";
  }
}
