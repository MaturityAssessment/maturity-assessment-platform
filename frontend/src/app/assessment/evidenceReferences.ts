import type { AssessmentEvidenceInputItem, Question } from "../../api/types.ts";

export type EvidenceQuestionOption = Pick<Question, "id" | "code" | "text">;

export function questionReferenceLabel(question: EvidenceQuestionOption) {
  const code = question.code?.trim() || `Question ${question.id}`;
  const text = question.text.trim();
  return `${code}: ${text.length > 60 ? `${text.slice(0, 57)}…` : text}`;
}

export function evidenceItemLabel(item: AssessmentEvidenceInputItem) {
  return item.type === "file" ? item.fileName || item.file?.name || "Evidence file"
    : item.type === "link" ? item.url || "Secure link" : "Respondent note";
}

export function sameQuestionReferences(left: readonly number[] = [], right: readonly number[] = []) {
  return left.length === right.length && left.every(id => right.includes(id));
}

export function setEvidenceQuestionReference(
  items: AssessmentEvidenceInputItem[], itemId: string, questionId: number, linked: boolean
) {
  return items.map(item => item.id !== itemId ? item : {
    ...item,
    referencedQuestionIds: linked
      ? [...new Set([...(item.referencedQuestionIds || []), questionId])]
      : (item.referencedQuestionIds || []).filter(id => id !== questionId),
  });
}

/** Reference edits and list reordering do not resolve a content correction. */
export function hasEvidenceContentChanges(previous: AssessmentEvidenceInputItem[], next: AssessmentEvidenceInputItem[]) {
  if (previous.length !== next.length) return true;
  const byId = new Map(previous.map(item => [item.id, item]));
  return next.some(item => {
    const before = byId.get(item.id);
    return !before || before.type !== item.type || before.practiceId !== item.practiceId
      || before.description.trim() !== item.description.trim() || before.url.trim() !== item.url.trim()
      || before.file !== item.file || before.fileName !== item.fileName
      || before.fileSize !== item.fileSize || before.fileType !== item.fileType;
  });
}
